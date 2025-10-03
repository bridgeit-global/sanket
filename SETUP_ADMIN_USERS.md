# Setup Admin and Operator Users

## Quick Setup Instructions

### 1. Start the Application
```bash
npm run dev
```

### 2. Create Admin User
1. Go to `/register`
2. Register with:
   - **Email**: `admin@example.com`
   - **Password**: `admin123`
3. You will be automatically assigned the `admin` role
4. Login and you'll be redirected to `/admin` (chat interface with voter analysis)

### 3. Create Operator User
1. Go to `/register`
2. Register with:
   - **Email**: `operator@example.com`
   - **Password**: `operator123`
3. You will be automatically assigned the `operator` role
4. Login and you'll be redirected to `/operator` (voter mobile update interface)

### 4. Create Regular User (for testing)
1. Go to `/register`
2. Register with any other email
3. You will be assigned the `regular` role
4. Login and you'll be redirected to `/unauthorized`

## User Roles Summary

| Role | Email | Password | Access | Interface |
|------|-------|----------|--------|-----------|
| **Admin** | `admin@example.com` | `admin123` | Full voter analysis | `/admin` - Chat interface |
| **Operator** | `operator@example.com` | `operator123` | Mobile number updates | `/operator` - Update interface |
| **Regular** | Any other email | Any password | No access | `/unauthorized` |

## Features by Role

### Admin Features
- ✅ Chat interface with AI assistant
- ✅ Voter data analysis through SQL queries
- ✅ Web search for Anushakti Nagar information
- ✅ Full access to voter demographics
- ✅ Complex voter analysis queries

### Operator Features
- ✅ Search voters by name
- ✅ Update voter mobile numbers
- ✅ View voter information
- ❌ No chat interface access
- ❌ No complex analysis tools

### Regular Features
- ❌ No access to application
- ❌ Redirected to unauthorized page

## Security Features

- **Row Level Security (RLS)**: Database-level access control
- **Role-based Middleware**: Route protection based on user roles
- **API Security**: All endpoints validate user authentication and roles
- **Session Management**: Secure authentication with NextAuth

## Testing the Setup

### Test Admin Access
1. Login as `admin@example.com`
2. You should be redirected to `/admin`
3. Try asking: "Show me voter demographics"
4. Try asking: "What's the latest news in Anushakti Nagar?"

### Test Operator Access
1. Login as `operator@example.com`
2. You should be redirected to `/operator`
3. Search for a voter by name
4. Update their mobile number

### Test Regular User
1. Register with any other email
2. Login
3. You should be redirected to `/unauthorized`

## Troubleshooting

### If users can't login:
1. Check that the database migration ran successfully
2. Verify the user was created with the correct role
3. Check browser console for errors

### If roles aren't working:
1. Verify middleware is running
2. Check that RLS policies are enabled
3. Ensure user roles are correctly assigned in database

### Database Queries to Check Setup:
```sql
-- Check user roles
SELECT id, email, role, created_at FROM "User";

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'User';
```
