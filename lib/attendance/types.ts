export type VigilWorkType = 'office' | 'field';
export type VigilRole = 'admin' | 'supervisor' | 'employee';
export type VigilSiteType = 'office' | 'field_site';
export type VigilPunchMode = 'clock_in' | 'clock_out';
export type VigilAttendanceStatus =
  | 'on_time'
  | 'late'
  | 'flagged_location'
  | 'early_leave'
  | 'pending_review';

export type VigilProfile = {
  id: string;
  full_name: string;
  email: string | null;
  role: VigilRole;
  work_type: VigilWorkType;
  avatar_url: string | null;
  department: string | null;
};

export type VigilSite = {
  id: string;
  name: string;
  address?: string | null;
  type: VigilSiteType;
  qr_code_token: string;
  allowed_ip_address: string | null;
  latitude: number;
  longitude: number;
  geofence_radius_meters: number;
  is_active: boolean;
};

export type VigilAttendanceLog = {
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
  status: VigilAttendanceStatus;
  notes: string | null;
  site?: Pick<VigilSite, 'name' | 'type'>;
};
