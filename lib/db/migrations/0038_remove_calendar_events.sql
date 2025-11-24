-- Remove calendar_events table and related objects
-- This table is not used in the Daily Programme module which uses the DailyProgramme table instead

-- Drop RLS policies first
DROP POLICY IF EXISTS "Admin can manage all calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Back-office can manage all calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Operator can view calendar events" ON calendar_events;

-- Drop indexes
DROP INDEX IF EXISTS idx_calendar_events_start_time;
DROP INDEX IF EXISTS idx_calendar_events_created_by;
DROP INDEX IF EXISTS idx_calendar_events_event_type;
DROP INDEX IF EXISTS idx_calendar_events_status;

-- Drop the table (CASCADE will drop any dependent objects)
DROP TABLE IF EXISTS calendar_events CASCADE;

