/** Seed Vigil demo locations, profiles for existing users, and attendance rows.
 * Usage: pnpm db:seed:vigil
 * Existing User records are reused; no users are created.
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { resolveServiceRoleKey, resolveSupabaseUrl } from '../lib/supabase/config';

dotenv.config({ path: '.env.local.prod' });
dotenv.config();

async function main() {
  const db = createClient(resolveSupabaseUrl(), resolveServiceRoleKey(), { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: users, error: usersError } = await db.from('User').select('id,user_id,metadata').limit(10);
  if (usersError) throw usersError;
  if (!users?.length) throw new Error('No existing User records found. Create users before seeding Vigil.');

  const profiles = users.map((user, index) => ({ id: user.id, full_name: String(user.metadata?.full_name || user.user_id || `Employee ${index + 1}`), email: String(user.metadata?.email || `${user.user_id}@example.local`), role: index === 0 ? 'admin' : index < 3 ? 'supervisor' : 'employee', work_type: index % 2 === 0 ? 'office' : 'field', department: index % 3 === 0 ? 'Administration' : index % 3 === 1 ? 'Operations' : 'Field Team' }));
  const { error: profileError } = await db.from('profiles').upsert(profiles, { onConflict: 'id' });
  if (profileError) throw profileError;

  const sites = [
    { name: 'Main Office Entrance', address: '1st Floor, Yash Signature, VN Purav Marg, opp. Telecom Factory Road, Anushakti Colony, Govandi East, Mumbai, Maharashtra 400088', type: 'office', allowed_ip_address: process.env.VIGIL_OFFICE_IP || null, latitude: 19.04455355295921, longitude: 72.91518627510871, geofence_radius_meters: 20 },
    { name: 'Ward 1 Field Site', type: 'field_site', allowed_ip_address: null, latitude: 19.08, longitude: 72.88, geofence_radius_meters: 100 },
    { name: 'Ward 2 Field Site', type: 'field_site', allowed_ip_address: null, latitude: 19.082, longitude: 72.884, geofence_radius_meters: 100 },
    { name: 'Ward 3 Field Site', type: 'field_site', allowed_ip_address: null, latitude: 19.085, longitude: 72.887, geofence_radius_meters: 100 },
  ];
  const { data: insertedSites, error: siteError } = await db.from('offices_and_sites').insert(sites).select('id');
  if (siteError) throw siteError;

  const logs = Array.from({ length: Math.min(20, users.length * 2) }, (_, index) => {
    const user = users[index % users.length];
    const site = insertedSites![index % insertedSites!.length];
    const day = String(8 - Math.floor(index / 5)).padStart(2, '0');
    return { user_id: user.id, site_id: site.id, date: `2026-10-${day}`, clock_in: `2026-10-${day}T09:0${index % 5}:00+05:30`, clock_out: `2026-10-${day}T18:0${index % 5}:00+05:30`, user_ip: null, user_lat: Number(sites[index % sites.length].latitude), user_lng: Number(sites[index % sites.length].longitude), distance_meters: 4, is_ip_valid: site.id === insertedSites![0]?.id, is_geofence_valid: true, status: index % 7 === 0 ? 'late' : 'on_time' };
  });
  const { error: logError } = await db.from('attendance_logs').insert(logs);
  if (logError) throw logError;
  console.log(`Seeded ${profiles.length} profiles, ${sites.length} sites, and ${logs.length} attendance logs using existing users.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
