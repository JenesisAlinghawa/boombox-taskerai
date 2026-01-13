/\*\*

- ROLE-BASED AUTHENTICATION SYSTEM IMPLEMENTATION GUIDE
- TaskerAI for Boombox Marketing - Production-Ready RBAC
-
- This document describes the complete role-based access control system
- implemented for TaskerAI using Next.js 15, Prisma ORM, and PostgreSQL.
  \*/

# Role-Based Authentication System Documentation

## System Overview

The role-based authentication system provides hierarchical access control with five user roles:

### Role Hierarchy

1. **EMPLOYEE** (Default)

   - Default role for all new users
   - Cannot manage users or access team settings
   - Can participate in channels and view assigned tasks
   - Cannot be promoted automatically

2. **TEAM_LEAD**

   - Reserved for future expansion
   - Planning for team coordination features

3. **MANAGER**

   - Can create, edit, delete users
   - Can access team management
   - Can manage team settings
   - Cannot promote users to higher roles

4. **CO_OWNER**

   - Can perform all MANAGER operations
   - Delegated by OWNER for distributed management
   - Cannot promote other users (prevents privilege escalation)
   - Cannot demote themselves

5. **OWNER**
   - Full system access
   - Bootstrap account created via seed script
   - Only role that can promote users to CO_OWNER or MANAGER
   - Single authority for role promotions

## Architecture

### Database Schema (Prisma)

The User model includes a new `role` field with ENUM values:

```prisma
enum Role {
  EMPLOYEE
  TEAM_LEAD
  MANAGER
  CO_OWNER
  OWNER
}

model User {
  id        Int     @id @default(autoincrement())
  email     String  @unique
  password  String
  name      String?
  role      Role    @default(EMPLOYEE)  // Default role on registration
  isVerified Boolean @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // ... relationships remain the same
}
```

### Bootstrap Process

1. **Initial OWNER Creation**

   - Run: `npx ts-node scripts/seed-owner.ts`
   - Creates one-time OWNER account with:
     - Email: `owner.dummy@gmail.com` (change to real email)
     - Password: `ChangeMe@123456` (change to secure password)
     - Name: "System Owner"
     - Role: OWNER (auto-verified)
   - Script checks if account exists before creating
   - Safe to run multiple times

2. **How OWNER is Bootstrapped**
   - Seed script bypasses normal registration flow
   - Sets role directly to OWNER and auto-verifies email
   - Ensures first user has full system access
   - Prevents EMPLOYEE users from managing system

## API Endpoints

### 1. User Management: GET /api/users

**Protected Route** - OWNER, CO_OWNER, MANAGER only

```typescript
GET /api/users
Headers: { "x-user-id": "userId" }

Response:
{
  "users": [
    {
      "id": 1,
      "email": "user@example.com",
      "name": "John Doe",
      "role": "MANAGER",
      "isVerified": true,
      "createdAt": "2024-01-13T00:00:00Z"
    }
  ]
}
```

### 2. Create User: POST /api/users

**Protected Route** - OWNER, CO_OWNER, MANAGER only

```typescript
POST /api/users
Headers: {
  "x-user-id": "userId",
  "Content-Type": "application/json"
}

Body: {
  "email": "newuser@example.com",
  "name": "Jane Doe",
  "password": "SecurePassword123!",
  "role": "EMPLOYEE"  // Optional, defaults to EMPLOYEE
}

Response:
{
  "user": {
    "id": 2,
    "email": "newuser@example.com",
    "name": "Jane Doe",
    "role": "EMPLOYEE",
    "createdAt": "2024-01-13T00:00:00Z"
  },
  "message": "User created successfully"
}
```

### 3. Promote User: POST /api/users/promote

**Protected Route** - OWNER only

```typescript
POST /api/users/promote
Headers: {
  "x-user-id": "ownerId",
  "Content-Type": "application/json"
}

Body: {
  "userId": 2,
  "newRole": "CO_OWNER"  // or "MANAGER"
}

Response:
{
  "user": {
    "id": 2,
    "email": "newuser@example.com",
    "name": "Jane Doe",
    "role": "CO_OWNER"
  },
  "message": "User promoted to CO_OWNER"
}
```

**Promotion Rules:**

- Only OWNER can call this endpoint
- Can promote to: MANAGER or CO_OWNER
- Cannot promote to: OWNER or EMPLOYEE
- Cannot promote OWNER (role lock)

## Frontend Integration

### 1. Team Management Page

**Location:** `/app/settings/team/page.tsx`

**Access Control:**

- Server-side check: If user role not in [OWNER, CO_OWNER, MANAGER]
- Shows "Access Denied" UI with lock icon (lucide-react)
- Button to return to dashboard
- No redirect (better UX)

**Features (for authorized users):**

- List all users with roles and creation dates
- Add new users with role assignment
- Promote users to CO_OWNER (OWNER only)
- Real-time user management

### 2. Sidebar Navigation

**Location:** `/app/components/sidebar/NavigationMenu.tsx`

**Role-Based Visibility:**

- "Team Management" menu item only visible to OWNER, CO_OWNER, MANAGER
- EMPLOYEE and TEAM_LEAD users don't see this menu
- Prevents unauthorized access attempts

### 3. Settings Page

**Location:** `/app/settings/page.tsx`

**Features:**

- Link to Team Management page for authorized users
- Only visible to users with management roles
- Centralized user settings and profile management

## Authentication Helper Functions

**Location:** `/lib/auth.ts`

### Helper Functions

```typescript
// Get current user from x-user-id header (API routes)
getCurrentUser(req: NextRequest): Promise<UserSession | null>

// Check if user can manage users
canManageUsers(role: Role): boolean
// Returns: true for OWNER, CO_OWNER, MANAGER

// Check if user can access team management
canAccessTeamManagement(role: Role): boolean
// Returns: true for OWNER, CO_OWNER, MANAGER

// Check if user can promote others
canPromoteUsers(role: Role): boolean
// Returns: true for OWNER only

// Check if specific promotion is allowed
canPromoteTo(userRole: Role, targetRole: Role): boolean
// Returns: true if promotion allowed

// Validate role enum
isValidRole(role: string): role is Role
```

## Security Considerations

### 1. Role Hierarchy Enforcement

Why EMPLOYEE can't manage users:

- Default role means anyone can sign up as EMPLOYEE
- Prevents unauthorized system access
- Maintains data integrity and security
- Only vetted managers can modify user accounts

### 2. Co-Owner Delegation Design

Why CO_OWNER can't promote others:

- Prevents privilege escalation chains
- Single point of authority (OWNER controls promotions)
- Can have multiple CO_OWNERs but only OWNER can create them
- Maintains clear command structure

### 3. OWNER Bootstrap

Why seed script is needed:

- Can't use registration flow (all new users are EMPLOYEE)
- Ensures system always has at least one admin
- One-time setup, safe to run multiple times
- Must be changed from dummy email immediately

## Session Management

### Session Flow

1. User logs in → receives user object with role
2. Role stored in browser session (localStorage fallback)
3. API calls include `x-user-id` header
4. Server retrieves full user with role from database
5. Role-based permission checks performed
6. Returns 403 Forbidden if unauthorized

### Session API

**Location:** `/app/api/session/route.ts`

```typescript
GET /api/session
Headers: { "x-user-id": "userId" }

Response:
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "isVerified": true,
    "role": "MANAGER"  // Now included
  }
}
```

## Implementation Checklist

- [x] Prisma schema updated with Role enum
- [x] Migration created and applied
- [x] Seed script for OWNER account created
- [x] Auth helper functions implemented
- [x] Protected /api/users endpoint created
- [x] Protected /api/users/promote endpoint created
- [x] Team Management page created with access control
- [x] Sidebar menu with role-based visibility
- [x] Session API updated to include role
- [x] Role included in login/register responses
- [x] Build verification passed

## Deployment Steps

1. **Setup Database**

   ```bash
   npx prisma migrate deploy
   ```

2. **Create OWNER Account**

   ```bash
   npx ts-node scripts/seed-owner.ts
   ```

3. **Change Dummy Email**

   - Login to database or use seed script again with real email
   - Update: owner.dummy@gmail.com → liz@boombox.com

4. **Change OWNER Password**

   - Have OWNER user change password on first login
   - Or update directly in database (hash with bcryptjs)

5. **Start Application**
   ```bash
   npm run dev  # Development
   npm run build && npm start  # Production
   ```

## Error Responses

### Unauthorized Access (403 Forbidden)

```json
{
  "error": "Only Manager, Co-Owner, or Owner can manage users",
  "code": "INSUFFICIENT_ROLE"
}
```

### Missing Authentication (401 Unauthorized)

```json
{
  "error": "Unauthorized"
}
```

### Invalid Role (400 Bad Request)

```json
{
  "error": "Invalid role"
}
```

## Testing Scenarios

### Test 1: Employee Can't Access Team Management

1. Register as new user (gets EMPLOYEE role)
2. Try to access `/settings/team`
3. Expected: "Access Denied" page with lock icon

### Test 2: Manager Can Manage Users

1. Create OWNER account via seed script
2. OWNER creates a MANAGER account
3. MANAGER logs in and goes to Team Management
4. Can see user list and add new users
5. Cannot promote users

### Test 3: OWNER Promotes to CO_OWNER

1. OWNER logs in
2. Goes to Team Management
3. Clicks promote button on a user
4. User role changes to CO_OWNER
5. CO_OWNER can manage users but not promote

### Test 4: Co-Owner Delegation

1. OWNER promotes User A to CO_OWNER
2. OWNER promotes User B to MANAGER
3. User A (CO_OWNER) can manage users like MANAGER
4. User B (MANAGER) can manage but cannot promote
5. Only OWNER can promote

## Future Enhancements

- [ ] Role-specific dashboards
- [ ] Audit logging for admin actions
- [ ] Permission templates for custom roles
- [ ] Team-based role assignments
- [ ] Automatic role expiration
- [ ] Multi-level approval workflows
- [ ] Delegation with time limits
- [ ] Role analytics and reporting

## Support & Questions

For implementation questions or issues:

1. Check `/lib/auth.ts` for helper functions
2. Review `/app/api/users/route.ts` for protection patterns
3. See `/app/settings/team/page.tsx` for UI implementation
4. Check `scripts/seed-owner.ts` for bootstrap process
