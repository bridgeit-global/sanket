import 'server-only';

import { auth } from '@/app/(auth)/auth';
import { throwOnSupabaseError } from '@/lib/db/errors';
import { supabase } from '@/lib/supabase/server';
import { getTodayDateStringIST } from '@/lib/ist-date';
import { normalizeAttendanceQrToken } from './qr-token';
import type { AttendanceLog, AttendanceProfile, AttendanceSite, AttendancePunchMode, LeaveRequest, LeaveStatus } from './types';

const db = supabase as any;

export function getRequestIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || null;
  return request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip') || null;
}

export function distanceInMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const radius = 6_371_000;
  const radians = (value: number) => (value * Math.PI) / 180;
  const dLat = radians(lat2 - lat1);
  const dLng = radians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function requireAttendanceUser() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { data: profile } = await db.from('Profile').select('*').eq('id', session.user.id).maybeSingle();
  const fallback: AttendanceProfile = {
    id: session.user.id,
    full_name: session.user.name || session.user.userId || 'Employee',
    email: session.user.email || null,
    role: session.user.roleName === 'admin' ? 'admin' : 'employee',
    work_type: 'office',
    avatar_url: session.user.image || null,
    department: null,
  };

  if (!profile) {
    await db.from('Profile').insert({
      id: fallback.id,
      full_name: fallback.full_name,
      email: fallback.email,
      role: fallback.role,
      work_type: fallback.work_type,
      avatar_url: fallback.avatar_url,
    });
  }
  return { session, profile: (profile as AttendanceProfile | null) ?? fallback };
}

export async function requireAttendanceAdmin() {
  const current = await requireAttendanceUser();
  if (!current) return null;
  const isAdmin = current.profile.role === 'admin' || current.session.user.roleName === 'admin';
  return isAdmin ? current : null;
}

export async function getAttendanceDashboard(userId: string) {
  const [
    { data: profile, error: profileError },
    { data: logs, error: logsError },
    { data: sites, error: sitesError },
    { data: leaves, error: leavesError },
  ] = await Promise.all([
    db.from('Profile').select('*').eq('id', userId).maybeSingle(),
    db.from('AttendanceLog').select('*, site:OfficeAndSite(name,type)').eq('user_id', userId).order('date', { ascending: false }).order('created_at', { ascending: false }).limit(60),
    db.from('OfficeAndSite').select('*').eq('is_active', true).order('name'),
    db.from('LeaveRequest').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
  ]);
  throwOnSupabaseError(profileError, 'Failed to load attendance profile');
  throwOnSupabaseError(logsError, 'Failed to load attendance history');
  throwOnSupabaseError(sitesError, 'Failed to load attendance sites');
  throwOnSupabaseError(leavesError, 'Failed to load leave requests');
  return {
    profile,
    logs: (logs ?? []) as AttendanceLog[],
    sites: (sites ?? []) as AttendanceSite[],
    leaves: (leaves ?? []) as LeaveRequest[],
  };
}

function profileSummary(profile: AttendanceProfile | undefined) {
  if (!profile) return null;
  return {
    full_name: profile.full_name,
    department: profile.department,
    work_type: profile.work_type,
  };
}

export async function getAttendanceAdminData() {
  const [
    { data: profiles, error: profilesError },
    { data: logs, error: logsError },
    { data: sites, error: sitesError },
    { data: leaves, error: leavesError },
  ] = await Promise.all([
    db.from('Profile').select('*').order('full_name'),
    db.from('AttendanceLog').select('*, site:OfficeAndSite(name,type)').order('created_at', { ascending: false }).limit(200),
    db.from('OfficeAndSite').select('*').order('name'),
    db.from('LeaveRequest').select('*').order('created_at', { ascending: false }).limit(100),
  ]);
  throwOnSupabaseError(profilesError, 'Failed to load attendance profiles');
  throwOnSupabaseError(logsError, 'Failed to load attendance logs');
  throwOnSupabaseError(sitesError, 'Failed to load attendance sites');
  throwOnSupabaseError(leavesError, 'Failed to load leave requests');

  const profileById = new Map((profiles ?? []).map((profile: AttendanceProfile) => [profile.id, profile]));
  return {
    profiles: profiles ?? [],
    logs: ((logs ?? []) as AttendanceLog[]).map((log) => ({
      ...log,
      profile: profileSummary(profileById.get(log.user_id) as AttendanceProfile | undefined),
    })),
    sites: sites ?? [],
    leaves: ((leaves ?? []) as LeaveRequest[]).map((leave) => ({
      ...leave,
      profile: profileSummary(profileById.get(leave.user_id) as AttendanceProfile | undefined),
    })),
  };
}

export async function reviewLeaveRequest({
  id,
  status,
  reviewerId,
}: {
  id: string;
  status: Extract<LeaveStatus, 'approved' | 'rejected'>;
  reviewerId: string;
}) {
  const { data, error } = await db
    .from('LeaveRequest')
    .update({
      status,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'pending')
    .select('*')
    .maybeSingle();
  throwOnSupabaseError(error, 'Failed to review leave request');
  if (!data) throw new Error('This leave request is no longer pending.');
  return data as LeaveRequest;
}

export async function createPunch({
  userId,
  token,
  locationOnly,
  mode,
  latitude,
  longitude,
  ip,
}: {
  userId: string;
  token?: string;
  locationOnly?: boolean;
  mode: AttendancePunchMode;
  latitude: number;
  longitude: number;
  ip: string | null;
}) {
  const today = getTodayDateStringIST();

  if (locationOnly) {
    const { data: existing } = await db
      .from('AttendanceLog')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .is('site_id', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (mode === 'clock_in' && existing?.clock_in) throw new Error('You are already checked in for today.');
    if (mode === 'clock_out' && (!existing || !existing.clock_in)) throw new Error('Check in before checking out.');
    if (mode === 'clock_out' && existing?.clock_out) throw new Error('You are already checked out for today.');

    const patch = mode === 'clock_in'
      ? {
        user_id: userId,
        site_id: null,
        date: today,
        clock_in: new Date().toISOString(),
        user_ip: ip,
        user_lat: latitude,
        user_lng: longitude,
        distance_meters: null,
        is_ip_valid: true,
        is_geofence_valid: false,
        status: 'on_time',
        notes: 'Field location',
      }
      : {
        clock_out: new Date().toISOString(),
        user_ip: ip,
        user_lat: latitude,
        user_lng: longitude,
        notes: 'Field location',
      };
    const query = mode === 'clock_in'
      ? db.from('AttendanceLog').insert(patch).select('*, site:OfficeAndSite(name,type)').single()
      : db.from('AttendanceLog').update(patch).eq('id', existing.id).select('*, site:OfficeAndSite(name,type)').single();
    const { data, error } = await query;
    if (error) throw new Error('Attendance could not be saved. Please try again.');
    return data as AttendanceLog;
  }

  const qrToken = normalizeAttendanceQrToken(token || '');
  const { data: site, error: siteError } = await db.from('OfficeAndSite').select('*').eq('qr_code_token', qrToken).eq('is_active', true).maybeSingle();
  if (siteError || !site) throw new Error('This attendance QR code is invalid or inactive.');

  const distance = distanceInMeters(latitude, longitude, Number(site.latitude), Number(site.longitude));
  const isGeofenceValid = distance <= Number(site.geofence_radius_meters);
  const status = isGeofenceValid ? 'on_time' : 'pending_review';

  if (site.type === 'office' && !isGeofenceValid) {
    throw new Error(`Office verification failed. Move within ${site.geofence_radius_meters}m of the entrance.`);
  }

  const { data: existing } = await db.from('AttendanceLog').select('*').eq('user_id', userId).eq('site_id', site.id).eq('date', today).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (mode === 'clock_in' && existing?.clock_in) throw new Error('You are already clocked in for today.');
  if (mode === 'clock_out' && (!existing || !existing.clock_in)) throw new Error('Clock in before clocking out.');
  if (mode === 'clock_out' && existing?.clock_out) throw new Error('You are already clocked out for today.');

  const patch = mode === 'clock_in'
    ? { user_id: userId, site_id: site.id, date: today, clock_in: new Date().toISOString(), user_ip: ip, user_lat: latitude, user_lng: longitude, distance_meters: distance, is_ip_valid: true, is_geofence_valid: isGeofenceValid, status }
    : { clock_out: new Date().toISOString(), user_ip: ip, user_lat: latitude, user_lng: longitude, distance_meters: distance, is_ip_valid: true, is_geofence_valid: isGeofenceValid, status };
  const query = mode === 'clock_in'
    ? db.from('AttendanceLog').insert(patch).select('*, site:OfficeAndSite(name,type)').single()
    : db.from('AttendanceLog').update(patch).eq('id', existing.id).select('*, site:OfficeAndSite(name,type)').single();
  const { data, error } = await query;
  if (error) throw new Error('Attendance could not be saved. Please try again.');
  return data as AttendanceLog;
}
