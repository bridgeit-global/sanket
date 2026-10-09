-- Attendance foundation.
-- This application authenticates through NextAuth and the existing public
-- "User" table, so attendance links to "User".id instead of creating auth users.

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES public."User"(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text,
  role text NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'supervisor', 'employee')),
  work_type text NOT NULL DEFAULT 'office' CHECK (work_type IN ('office', 'field')),
  avatar_url text,
  department text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.offices_and_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  type text NOT NULL CHECK (type IN ('office', 'field_site')),
  qr_code_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  allowed_ip_address text,
  latitude numeric(10, 7) NOT NULL,
  longitude numeric(10, 7) NOT NULL,
  geofence_radius_meters integer NOT NULL DEFAULT 20 CHECK (geofence_radius_meters BETWEEN 10 AND 1000),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.attendance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES public.offices_and_sites(id) ON DELETE RESTRICT,
  date date NOT NULL DEFAULT current_date,
  clock_in timestamptz,
  clock_out timestamptz,
  user_ip text,
  user_lat numeric(10, 7),
  user_lng numeric(10, 7),
  distance_meters numeric(10, 2),
  is_ip_valid boolean NOT NULL DEFAULT false,
  is_geofence_valid boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'on_time' CHECK (status IN ('on_time', 'late', 'flagged_location', 'early_leave', 'pending_review')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES public."User"(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS attendance_user_date_idx ON public.attendance_logs(user_id, date DESC);
CREATE INDEX IF NOT EXISTS attendance_site_date_idx ON public.attendance_logs(site_id, date DESC);
CREATE INDEX IF NOT EXISTS attendance_leave_user_dates_idx ON public.leave_requests(user_id, start_date DESC);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offices_and_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- The app uses the service-role Supabase client after NextAuth authorization.
-- These policies prevent direct anonymous/authenticated access while allowing
-- the trusted application server to operate normally.
DROP POLICY IF EXISTS attendance_service_profile ON public.profiles;
CREATE POLICY attendance_service_profile ON public.profiles FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS attendance_service_site ON public.offices_and_sites;
CREATE POLICY attendance_service_site ON public.offices_and_sites FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS attendance_service_attendance ON public.attendance_logs;
CREATE POLICY attendance_service_attendance ON public.attendance_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS attendance_service_leave ON public.leave_requests;
CREATE POLICY attendance_service_leave ON public.leave_requests FOR ALL TO service_role USING (true) WITH CHECK (true);
