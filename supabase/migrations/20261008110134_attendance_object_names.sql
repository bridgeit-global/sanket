DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'vigil_attendance_user_date_idx') THEN
    ALTER INDEX public.vigil_attendance_user_date_idx RENAME TO attendance_user_date_idx;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'vigil_attendance_site_date_idx') THEN
    ALTER INDEX public.vigil_attendance_site_date_idx RENAME TO attendance_site_date_idx;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'vigil_leave_user_dates_idx') THEN
    ALTER INDEX public.vigil_leave_user_dates_idx RENAME TO attendance_leave_user_dates_idx;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND policyname = 'vigil_service_profiles') THEN
    ALTER POLICY vigil_service_profiles ON public."Profile" RENAME TO attendance_service_profile;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND policyname = 'vigil_service_sites') THEN
    ALTER POLICY vigil_service_sites ON public."OfficeAndSite" RENAME TO attendance_service_site;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND policyname = 'vigil_service_attendance') THEN
    ALTER POLICY vigil_service_attendance ON public."AttendanceLog" RENAME TO attendance_service_attendance;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND policyname = 'vigil_service_leave') THEN
    ALTER POLICY vigil_service_leave ON public."LeaveRequest" RENAME TO attendance_service_leave;
  END IF;
END $$;
