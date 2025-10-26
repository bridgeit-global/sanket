-- Add calendar events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('voter_engagement', 'public_meeting', 'training', 'administrative')),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  location_id UUID,
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence_pattern VARCHAR(50),
  recurrence_interval INTEGER DEFAULT 1,
  recurrence_end_date TIMESTAMP,
  created_by UUID NOT NULL REFERENCES "User"(id),
  assigned_to UUID REFERENCES "User"(id),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  travel_time_minutes INTEGER DEFAULT 0,
  preparation_time_minutes INTEGER DEFAULT 0,
  google_place_id VARCHAR(255),
  location_name VARCHAR(255),
  location_address TEXT,
  location_latitude VARCHAR(255),
  location_longitude VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON calendar_events(created_by);
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_type ON calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_calendar_events_status ON calendar_events(status);

-- Enable RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for calendar events
CREATE POLICY "Admin can manage all calendar events" ON calendar_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "User" u 
      WHERE u.id::text = auth.uid()::text 
        AND u.role = 'admin'
    )
  );

CREATE POLICY "Back-office can manage all calendar events" ON calendar_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "User" u 
      WHERE u.id::text = auth.uid()::text 
        AND u.role = 'back-office'
    )
  );

-- Operators can only view events (read-only access)
CREATE POLICY "Operator can view calendar events" ON calendar_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "User" u 
      WHERE u.id::text = auth.uid()::text 
        AND u.role = 'operator'
    )
  );
