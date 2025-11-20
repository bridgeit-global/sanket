# Simple Calendar Module Plan for Back Office and Admin

> **Update (Nov 2025):** The standalone Calendar module has been merged into the Daily Programme experience. The details below continue to describe the calendar capabilities now exposed via the Daily Programme module.

## Overview

This document outlines a simplified calendar module implementation for the Anushakti Nagar voter analysis application, designed to support both back office and admin users with basic event management and scheduling capabilities.

## Current System Context

### Existing User Roles
- **Admin**: Full access to chat interface with voter analysis, SQL queries, comprehensive data access
- **Back Office**: Voter search and mobile number update functionality, data management
- **Operator**: Limited voter mobile number update interface
- **Regular**: No access (redirected to unauthorized)

### Current Features
- Voter database with demographic information
- Beneficiary service management system
- Role-based access control with RLS policies
- Chat interface for data analysis
- Mobile number update workflows

## Calendar Module Features

### 1. Core Calendar Functionality

#### 1.1 Event Management
- **Event Creation**: Create, edit, and delete calendar events
- **Event Types**: 
  - Voter engagement events (meetings, door-to-door campaigns)
  - Public meetings and town halls
  - Training sessions for staff
  - Administrative meetings

#### 1.2 Event Properties
- **Basic Information**:
  - Title and description
  - Start and end date/time
  - Event type
  - Priority level (low, medium, high, urgent)
  - Status (scheduled, in-progress, completed, cancelled)

- **Simple Properties**:
  - Recurring events (daily, weekly, monthly, yearly)
  - Basic notes

### 2. Role-Based Features

#### 2.1 Admin Calendar Features
- **Full Calendar Access**: View, create, edit, and delete all events
- **AI based Analytics**:
  - Event count by type
  - Monthly event summary
  - Event completion rates

- **Simple Management**:
  - View all events across the system
  - Basic event filtering and search
  - Simple todays reporting

#### 2.2 Back Office Calendar Features
- **Full Calendar Access**: View, create, edit, and delete all events
- **Event Types**: 
  - Schedule voter meetings
  - Plan door-to-door campaigns
  - Organize community outreach
  - Administrative tasks

- **Basic Features**:
  - View own events
  - Create new events
  - Edit own events
  - Mark events as completed/cancelled

### 3. Database Schema

#### 3.1 Calendar Events Table
```sql
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_type VARCHAR(50) NOT NULL, -- 'voter_engagement', 'public_meeting', 'training', 'administrative'
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled'
  created_by UUID NOT NULL REFERENCES "User"(id),
  recurring_pattern VARCHAR(50) DEFAULT 'none', -- 'none', 'daily', 'weekly', 'monthly', 'yearly'
  recurring_until TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 4. API Endpoints

#### 4.1 Calendar Events API
- `GET /api/calendar/events` - List events with filtering and pagination
- `POST /api/calendar/events` - Create new event
- `GET /api/calendar/events/[id]` - Get specific event
- `PUT /api/calendar/events/[id]` - Update event
- `DELETE /api/calendar/events/[id]` - Delete event
- `GET /api/calendar/events/analytics` - Get basic event analytics (admin only)

### 5. User Interface Components

#### 5.1 Calendar View Components
- **CalendarGrid**: Main calendar display with month/week/day views
- **EventCard**: Individual event display component
- **EventModal**: Event creation/editing modal
- **EventFilters**: Basic filtering and search controls
- **EventList**: List view of events

#### 5.2 Event Management Components
- **EventForm**: Simple event creation and editing form
- **EventTypeSelector**: Event type selection
- **RecurringEventSettings**: Basic recurring event configuration
- **EventStatusUpdater**: Mark events as completed/cancelled

#### 5.3 Basic Analytics Components
- **EventSummary**: Simple event count and status overview
- **MonthlyCalendar**: Monthly view with event indicators
- **EventTypeChart**: Basic chart showing events by type

### 6. Integration with Existing System

#### 6.1 User Role Integration
- Respect existing role-based access control
- Extend RLS policies for calendar data
- Maintain security boundaries between roles
- Integrate with existing authentication system

#### 6.2 Simple Integration Points
- No complex integrations with voter database
- No location management system
- No attendee tracking
- No service linking

### 7. Implementation Phases

#### Phase 1: Core Infrastructure (Week 1)
- Database schema implementation
- Basic API endpoints
- Authentication and authorization
- Core calendar display component

#### Phase 2: Event Management (Week 2)
- Event CRUD operations
- Basic event forms
- Event listing and filtering
- Role-based access

#### Phase 3: UI Polish (Week 3)
- Calendar views (month/week/day)
- Event modals and forms
- Basic styling and responsiveness
- User experience improvements

#### Phase 4: Basic Analytics (Week 4)
- Simple event statistics
- Basic reporting
- Event completion tracking
- Testing and bug fixes

### 8. Technical Considerations

#### 8.1 Performance
- Efficient database queries with proper indexing
- Pagination for large event lists
- Simple caching for frequently accessed data

#### 8.2 Security
- Row-level security for calendar data
- Role-based access control
- Input validation and sanitization

#### 8.3 Mobile Responsiveness
- Responsive calendar views
- Touch-friendly interfaces
- Mobile-optimized forms

### 9. Success Metrics

#### 9.1 User Adoption
- Number of events created
- Calendar usage frequency
- Feature utilization rates

#### 9.2 Operational Efficiency
- Reduction in scheduling conflicts
- Improved event planning cycles
- Better task organization

### 10. Future Enhancements (Optional)

#### 10.1 Potential Additions
- Location selection (if needed later)
- Attendee management (if needed later)
- Integration with external calendars
- Advanced reporting

## Conclusion

This simplified calendar module provides essential event management capabilities for both admin and back office users without complex integrations. The focus is on core functionality: creating, managing, and tracking events with basic analytics and reporting.

The implementation follows a simple 4-week timeline with clear phases, making it easy to implement and maintain while providing immediate value to users.
