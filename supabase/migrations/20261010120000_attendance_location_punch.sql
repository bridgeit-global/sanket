-- Field staff can mark attendance from GPS without an office or field site.
ALTER TABLE public."AttendanceLog" ALTER COLUMN site_id DROP NOT NULL;
