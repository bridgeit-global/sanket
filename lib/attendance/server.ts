import 'server-only';

import { auth } from '@/app/(auth)/auth';
import { supabase } from '@/lib/supabase/server';
import type { VigilAttendanceLog, VigilProfile, VigilSite, VigilPunchMode } from './types';

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

export async function requireVigilUser() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { data: profile } = await db.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
  const fallback: VigilProfile = {
    id: session.user.id,
    full_name: session.user.name || session.user.userId || 'Employee',
    email: session.user.email || null,
    role: session.user.roleName === 'admin' ? 'admin' : 'employee',
    work_type: 'office',
    avatar_url: session.user.image || null,
    department: null,
  };

  if (!profile) {
    await db.from('profiles').insert({
      id: fallback.id,
      full_name: fallback.full_name,
      email: fallback.email,
      role: fallback.role,
      work_type: fallback.work_type,
      avatar_url: fallback.avatar_url,
    });
  }
  return { session, profile: (profile as VigilProfile | null) ?? fallback };
}

export async function requireVigilAdmin() {
  const current = await requireVigilUser();
  if (!current) return null;
  const isAdmin = current.profile.role === 'admin' || current.session.user.roleName === 'admin';
  return isAdmin ? current : null;
}

export async function getVigilDashboard(userId: string) {
  const [{ data: profile }, { data: logs }, { data: sites }, { data: leaves }] = await Promise.all([
    db.from('profiles').select('*').eq('id', userId).maybeSingle(),
    db.from('attendance_logs').select('*, site:offices_and_sites(name,type)').eq('user_id', userId).order('date', { ascending: false }).order('created_at', { ascending: false }).limit(60),
    db.from('offices_and_sites').select('*').eq('is_active', true).order('name'),
    db.from('leave_requests').select('*').eq('user_id', userId).order('start_date', { ascending: false }).limit(20),
  ]);
  return { profile, logs: (logs ?? []) as VigilAttendanceLog[], sites: (sites ?? []) as VigilSite[], leaves: leaves ?? [] };
}

export async function getVigilAdminData() {
  const [{ data: profiles }, { data: logs }, { data: sites }, { data: leaves }] = await Promise.all([
    db.from('profiles').select('*').order('full_name'),
    db.from('attendance_logs').select('*, site:offices_and_sites(name,type), profile:profiles(full_name,department,work_type)').order('created_at', { ascending: false }).limit(200),
    db.from('offices_and_sites').select('*').order('name'),
    db.from('leave_requests').select('*, profile:profiles(full_name)').order('created_at', { ascending: false }).limit(100),
  ]);
  return { profiles: profiles ?? [], logs: logs ?? [], sites: sites ?? [], leaves: leaves ?? [] };
}

export async function createPunch({
  userId,
  token,
  mode,
  latitude,
  longitude,
  ip,
}: {
  userId: string;
  token: string;
  mode: VigilPunchMode;
  latitude: number;
  longitude: number;
  ip: string | null;
}) {
  const { data: site, error: siteError } = await db.from('offices_and_sites').select('*').eq('qr_code_token', token).eq('is_active', true).maybeSingle();
  if (siteError || !site) throw new Error('This attendance QR code is invalid or inactive.');

  const distance = distanceInMeters(latitude, longitude, Number(site.latitude), Number(site.longitude));
  const isGeofenceValid = distance <= Number(site.geofence_radius_meters);
  const registeredOfficeIp = site.allowed_ip_address || process.env.VIGIL_OFFICE_IP || null;
  const isIpValid = site.type === 'field_site' || Boolean(registeredOfficeIp && registeredOfficeIp === ip);
  const status = site.type === 'office' && (!isIpValid || !isGeofenceValid) ? 'pending_review' : !isGeofenceValid ? 'pending_review' : 'on_time';

  if (site.type === 'office' && (!isIpValid || !isGeofenceValid)) {
    throw new Error(`Office verification failed. ${!isIpValid ? 'Connect to the registered office network. ' : ''}${!isGeofenceValid ? `Move within ${site.geofence_radius_meters}m of the entrance.` : ''}`);
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: existing } = await db.from('attendance_logs').select('*').eq('user_id', userId).eq('site_id', site.id).eq('date', today).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (mode === 'clock_in' && existing?.clock_in) throw new Error('You are already clocked in for today.');
  if (mode === 'clock_out' && (!existing || !existing.clock_in)) throw new Error('Clock in before clocking out.');
  if (mode === 'clock_out' && existing?.clock_out) throw new Error('You are already clocked out for today.');

  const patch = mode === 'clock_in'
    ? { user_id: userId, site_id: site.id, date: today, clock_in: new Date().toISOString(), user_ip: ip, user_lat: latitude, user_lng: longitude, distance_meters: distance, is_ip_valid: isIpValid, is_geofence_valid: isGeofenceValid, status }
    : { clock_out: new Date().toISOString(), user_ip: ip, user_lat: latitude, user_lng: longitude, distance_meters: distance, is_ip_valid: isIpValid, is_geofence_valid: isGeofenceValid, status };
  const query = mode === 'clock_in'
    ? db.from('attendance_logs').insert(patch).select('*, site:offices_and_sites(name,type)').single()
    : db.from('attendance_logs').update(patch).eq('id', existing.id).select('*, site:offices_and_sites(name,type)').single();
  const { data, error } = await query;
  if (error) throw new Error('Attendance could not be saved. Please try again.');
  return data as VigilAttendanceLog;
}
