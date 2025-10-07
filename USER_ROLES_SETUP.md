# User Roles and Access Control Setup

This document describes the user role system implemented for the Anushakti Nagar voter analysis application.

## User Roles

### 1. Admin (`admin`)
- **Access**: Full access to the chat interface with voters analysis agent
- **Features**:
  - Can access comprehensive voter data analysis through SQL queries
  - Can search for current information about Anushakti Nagar
  - Has access to all voter demographics, voting patterns, and geographic analysis
  - Can perform complex custom SQL queries on voter data

### 2. Operator (`operator`)
- **Access**: Limited access to voter mobile number update interface
- **Features**:
  - Can search for voters by name
  - Can update voter mobile numbers (primary and secondary)
  - Cannot access the chat interface or perform complex analysis
  - Restricted to mobile number management functionality

### 3. Back Office (`back-office`)
- **Access**: Same as operator; focused on data massaging and voter identification
- **Features**:
  - Can search for voters by name
  - Can update voter mobile numbers (primary and secondary)
  - Cannot access the chat interface or perform complex analysis
  - Works primarily on cleaning data and identifying potential voters

### 4. Regular (`regular`)
- **Access**: No access to the application
- **Features**: Redirected to unauthorized page

## Row Level Security (RLS)

The application implements comprehensive RLS policies to ensure data security:

### User Table Policies
- Users can view and update their own profiles
- Admins can view and update all users
- Role-based access control enforced at database level

### Voter Table Policies
- Admins can view all voter data
- Operators can view all voter data and update mobile numbers only
- Regular users have no access to voter data

### Chat and Message Policies
- Users can only access their own chats and messages
- Complete isolation between user data

## Setup Instructions

### 1. Database Migration
Run the migration to add user roles and RLS policies:
```bash
# The migration file is already created at:
# lib/db/migrations/0034_add_user_roles.sql
```

### 2. Create Admin and Operator Users
Run the script to create default admin and operator users:
```bash
node scripts/create-admin-users.js
```

This will create:
- **Admin**: `admin@example.com` / `admin123`
- **Operator**: `operator@example.com` / `operator123`
- **Regular**: `user@example.com` / `user123`

### 3. Access URLs
- **Admin Interface**: `/admin` - Chat interface with voter analysis
- **Operator Interface**: `/operator` - Voter mobile number update interface
- **Unauthorized**: `/unauthorized` - Access denied page

## Security Features

### Middleware Protection
- Route-based access control in `middleware.ts`
- Automatic redirection based on user role
- Protection against unauthorized access

### API Security
- All API endpoints check user authentication and roles
- Operator APIs are restricted to admin and operator roles only
- Admin APIs are restricted to admin role only

### Database Security
- Row Level Security policies on all sensitive tables
- User data isolation
- Role-based data access control

## User Management

### Creating New Users
Use the `createUser` function in `lib/db/queries.ts`:
```typescript
await createUser(email, password, role); // role: 'admin' | 'operator' | 'regular'
```

### Updating User Roles
Use the `updateUserRole` function:
```typescript
await updateUserRole(userId, role); // role: 'admin' | 'operator' | 'regular'
```

## API Endpoints

### Operator APIs
- `POST /api/operator/search-voter` - Search voters by name
- `PUT /api/operator/update-mobile` - Update voter mobile numbers

### Admin APIs
- All existing chat APIs are accessible to admins
- Voter analysis through SQL query tool

## Testing

### Admin Testing
1. Login with `admin@example.com` / `admin123`
2. Should be redirected to `/admin`
3. Can access chat interface with voter analysis
4. Can perform SQL queries on voter data
5. Can search for Anushakti Nagar information

### Operator Testing
1. Login with `operator@example.com` / `operator123`
2. Should be redirected to `/operator`
3. Can search for voters by name
4. Can update voter mobile numbers
5. Cannot access admin chat interface

### Regular User Testing
1. Login with `user@example.com` / `user123`
2. Should be redirected to `/unauthorized`
3. No access to any application features

## Security Considerations

1. **Password Security**: Ensure strong passwords for admin accounts
2. **Database Access**: RLS policies provide defense in depth
3. **API Security**: All endpoints validate user roles
4. **Session Management**: NextAuth handles secure session management
5. **HTTPS**: Ensure HTTPS in production for secure authentication

## Troubleshooting

### Common Issues
1. **Migration Errors**: Ensure PostgreSQL supports RLS
2. **Authentication Issues**: Check AUTH_SECRET environment variable
3. **Role Assignment**: Verify user roles in database
4. **Permission Denied**: Check RLS policies and user authentication

### Database Queries
```sql
-- Check user roles
SELECT id, email, role FROM "User";

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'User';

-- Test voter access (as admin)
SELECT COUNT(*) FROM "Voter";
```
