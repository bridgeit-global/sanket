export type AttendanceWorkType = 'office' | 'field';
export type AttendanceRole = 'admin' | 'supervisor' | 'employee';
export type AttendanceSiteType = 'office' | 'field_site';
export type AttendancePunchMode = 'clock_in' | 'clock_out';
export type AttendanceStatus =
  | 'on_time'
  | 'late'
  | 'flagged_location'
  | 'early_leave'
  | 'pending_review';

export type AttendanceProfile = {
  id: string;
  full_name: string;
  email: string | null;
  role: AttendanceRole;
  work_type: AttendanceWorkType;
  avatar_url: string | null;
  department: string | null;
};

export type AttendanceSite = {
  id: string;
  name: string;
  address?: string | null;
  type: AttendanceSiteType;
  qr_code_token: string;
  allowed_ip_address: string | null;
  latitude: number;
  longitude: number;
  geofence_radius_meters: number;
  is_active: boolean;
};

export type AttendanceLog = {
  id: string;
  user_id: string;
  site_id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  user_ip: string | null;
  user_lat: number | null;
  user_lng: number | null;
  distance_meters: number | null;
  is_ip_valid: boolean;
  is_geofence_valid: boolean;
  status: AttendanceStatus;
  notes: string | null;
  site?: Pick<AttendanceSite, 'name' | 'type'>;
  profile?: Pick<AttendanceProfile, 'full_name' | 'department' | 'work_type'> | null;
};
