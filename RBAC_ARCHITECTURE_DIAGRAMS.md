# Role-Based Authentication System - Visual Architecture

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT BROWSER                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                     React Components                           │ │
│  │  ┌───────────────┐  ┌──────────────────┐  ┌──────────────────┐ │ │
│  │  │ Login Page    │  │ Settings Page    │  │ Team Management  │ │ │
│  │  │ · Register    │  │ · Profile        │  │ Page (Protected) │ │ │
│  │  │ · Login       │  │ · Notifications  │  │ · Add Users      │ │ │
│  │  │ · Role: auto  │  │ · Team (link)    │  │ · Promote Users  │ │ │
│  │  └───────────────┘  └──────────────────┘  └──────────────────┘ │ │
│  │         │                     │                    │           │ │
│  │         │                     │                    │           │ │
│  │  ┌─────────────────────────────────────────────────────────┐   │ │
│  │  │         Sidebar Navigation Menu                         │   │ │
│  │  │  · Dashboard                                            │   │ │
│  │  │  · Tasks                                                │   │ │
│  │  │  · Messages                                             │   │ │
│  │  │  · Settings                                             │   │ │
│  │  │  · [Team Management] ← Only if OWNER/CO_OWNER/MANAGER   │   │ │
│  │  └─────────────────────────────────────────────────────────┘   │ │
│  │         │                                                      │ │
│  │         └────────────────────┬                                 │ │
│  │                              │                                 │ │
│  │  All Requests include: x-user-id header                        │ │
│  │  Role stored in: Browser sessionStorage (fallback)             │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                │                                    │
│                                ▼                                    │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                    HTTPS Request │ x-user-id header
                                 │
┌──────────────────────────────────────────────────────────────────────┐
│                       NEXT.JS API LAYER                              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │              Protected API Routes                               │ │
│  │                                                                 │ │
│  │  1. GET /api/users                                              │ │
│  │     ├─ Extract user ID from header                              │ │
│  │     ├─ getCurrentUser(req) → Check role                         │ │
│  │     ├─ canManageUsers(role)?                                    │ │
│  │     │  YES → Fetch all users                                    │ │
│  │     │  NO  → Return 403 Forbidden                               │ │
│  │     └─ Response: User array | Error                             │ │
│  │                                                                 │ │
│  │  2. POST /api/users                                             │ │
│  │     ├─ Extract user ID from header                              │ │
│  │     ├─ getCurrentUser(req) → Check role                         │ │
│  │     ├─ canManageUsers(role)?                                    │ │
│  │     │  YES → Validate input & create user                       │ │
│  │     │  NO  → Return 403 Forbidden                               │ │
│  │     └─ Response: New user | Error                               │ │
│  │                                                                 │ │
│  │  3. POST /api/users/promote                                     │ │
│  │     ├─ Extract user ID from header                              │ │
│  │     ├─ getCurrentUser(req) → Check role                         │ │
│  │     ├─ canPromoteUsers(role)?  [OWNER ONLY]                     │ │
│  │     │  YES → Validate & promote user                            │ │
│  │     │  NO  → Return 403 Forbidden                               │ │
│  │     └─ Response: Promoted user | Error                          │ │
│  │                                                                 │ │
│  │  4. GET /api/session                                            │ │
│  │     ├─ Extract user ID from header                              │ │
│  │     ├─ Fetch user from database                                 │ │
│  │     └─ Response: User with role | Error                         │ │
│  │                                                                 │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                          │                                           │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │              Public API Routes (No protection)                  │ │
│  │                                                                 │ │
│  │  · POST /api/auth/register   (Default role: EMPLOYEE)           │ │
│  │  · POST /api/auth/login      (Returns user with role)           │ │
│  │  · GET  /api/auth/verify     (Verify email)                     │ │
│  │                                                                 │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                          │                                           │
└──────────────────────────┼───────────────────────────────────────────┘
                           │
                  Prisma ORM │ Query with role
                           │
┌────────────────────────────────────────────────────────────────────┐
│                    POSTGRESQL DATABASE                             │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    User Table                               │   │
│  │  ┌─────────────────────────────────────────────────────┐    │   │
│  │  │ id          │ INT PRIMARY KEY                       │    │   │
│  │  │ email       │ VARCHAR UNIQUE                        │    │   │
│  │  │ password    │ VARCHAR (bcryptjs hashed)             │    │   │
│  │  │ name        │ VARCHAR                               │    │   │
│  │  │ role        │ ENUM (see below)                      │    │   │
│  │  │ isVerified  │ BOOLEAN                               │    │   │
│  │  │ createdAt   │ TIMESTAMP                             │    │   │
│  │  │ updatedAt   │ TIMESTAMP                             │    │   │
│  │  └─────────────────────────────────────────────────────┘    │   │
│  │                                                             │   │
│  │  ┌─────────────────────────────────────────────────────┐    │   │
│  │  │       Role ENUM Values                              │    │   │
│  │  │  ┌────────────────────────────────────────────┐     │    │   │
│  │  │  │ EMPLOYEE      - Default, most restrictive  │     │    │   │
│  │  │  │ TEAM_LEAD     - Reserved for features      │     │    │   │
│  │  │  │ MANAGER       - Can manage users & teams   │     │    │   │
│  │  │  │ CO_OWNER      - Delegated admin power      │     │    │   │
│  │  │  │ OWNER         - Full access                │     │    │   │
│  │  │  └────────────────────────────────────────────┘     │    │   │
│  │  └─────────────────────────────────────────────────────┘    │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │    Sample Data (After Setup)                                │   │
│  │                                                             │   │
│  │  User #1 | liz@boombox.com      | OWNER   | verified        │   │
│  │  User #2 | manager@boombox.com  | MANAGER | verified        │   │
│  │  User #3 | employee@boombox.com | EMPLOYEE| verified        │   │
│  │  User #4 | coowner@boombox.com  | CO_OWNER| verified        │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Permission Flow Diagram

```
┌─────────────────────────────────────┐
│      User Makes API Request         │
│    (includes x-user-id header)      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  API Route Handler (route.ts)       │
│                                     │
│  1. Extract x-user-id header        │
│  2. getCurrentUser(req)             │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Query Database via Prisma ORM      │
│                                     │
│  SELECT * FROM users                │
│  WHERE id = x-user-id               │
│  → Returns user WITH role field     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Role-Based Permission Check        │
│                                     │
│  Endpoint: GET /api/users           │
│  Required Role: MANAGER+ (M/CO/O)   │
│  User Role: ?                       │
└──────────────┬──────────────────────┘
               │
         ┌─────┴─────┐
         │           │
         ▼           ▼
    ┌────────┐   ┌─────────────────────┐
    │ MATCH? │   │                     │
    └────────┘   │                     │
      │    │     │                     │
     YES   NO    │                     │
      │    │     │                     │
      │    │     │                     │
      ▼    ▼     │                     │
    ┌──────────┐ │                     │
    │ Allowed? │ │                     │
    └────┬─────┘ │                     │
         │       │                     │
    ┌────┴──────┐│                     │
    │           ││                     │
    ▼           ▼│                     │
  ┌──────────────┴─────────────────────┘
  │ 200 OK              403 Forbidden
  │ {users: [...]}      {error: "Only Manager, Co-Owner, or Owner..."}
  │
  └─→ Response sent to client
```

---

## Role Hierarchy Visualization

```
                         ┌─────────────┐
                         │   OWNER     │  ← Full System Access
                         │             │     Can promote anyone
                         │  (1 person) │
                         └──────┬──────┘
                                │
                                │ Promotes to
                                ▼
                ┌────────────────────────────────┐
                │      CO_OWNER (Optional)       │  ← Delegated Admin
                │                                │     Can manage users
                │  Cannot promote users          │     Cannot promote
                │  (Prevents escalation)         │
                └────────────────────────────────┘
                                │
                                │ Promotes to
                                ▼
                ┌────────────────────────────────┐
                │      MANAGER (Optional)        │  ← Admin
                │                                │     Can manage users
                │  Cannot promote users          │     Cannot promote
                │                                │
                └────────────────────────────────┘
                                │
                                │ Promotes to
                                ▼
                ┌────────────────────────────────┐
                │     TEAM_LEAD (Reserved)       │  ← Future Use
                │                                │     Currently = EMPLOYEE
                │                                │
                └────────────────────────────────┘
                                │
                                │ Promotes to
                                ▼
                ┌────────────────────────────────┐
                │     EMPLOYEE (Default)         │  ← Restricted
                │                                │     Cannot manage
                │  All new users start here      │     Can only participate
                │  Most restrictive permissions  │
                └────────────────────────────────┘

Direction: Bottom → Top (Promotions only possible going up)
           Top cannot be changed (OWNER is immutable)
           Single Authority: Only OWNER can move users up
```

---

## Data Flow Diagram: User Registration → Promotion

```
STEP 1: NEW USER REGISTRATION
================================

User registers with email, password, name
           │
           ▼
API: POST /api/auth/register
  ├─ Validate input
  ├─ Hash password (bcryptjs)
  ├─ Create user WITH role = "EMPLOYEE"
  └─ Send verification email
           │
           ▼
User verifies email
           │
           ▼
User logs in
  ├─ GET /api/auth/login
  ├─ Check email & password
  ├─ Return user WITH role = "EMPLOYEE"
  └─ Store role in browser session
           │
           ▼
User sees limited interface (no Team Management)


STEP 2: OWNER PROMOTES USER
================================

OWNER logs in (from seed script)
  ├─ Role = "OWNER"
  └─ Can see Team Management menu item
           │
           ▼
OWNER goes to /settings/team
  ├─ Server checks role (✓ OWNER allowed)
  ├─ Loads Team Management page
  └─ Can see list of all users
           │
           ▼
OWNER clicks "Promote" on a user
  ├─ POST /api/users/promote
  ├─ Body: { userId: 2, newRole: "MANAGER" }
  └─ Header: { "x-user-id": "1" }
           │
           ▼
API Handler
  ├─ getCurrentUser(req) → role = "OWNER"
  ├─ canPromoteUsers("OWNER") → TRUE
  ├─ canPromoteTo("OWNER", "MANAGER") → TRUE
  ├─ Update user.role = "MANAGER" in database
  └─ Return updated user
           │
           ▼
UI Updates
  ├─ User's role changes to MANAGER
  ├─ User see new role badge
  └─ Refresh page


STEP 3: PROMOTED USER NOW HAS PERMISSIONS
================================

Promoted user logs back in
  ├─ GET /api/session
  ├─ Returns user WITH role = "MANAGER"
  └─ Store role in browser session
           │
           ▼
Navigation updates
  ├─ "Team Management" menu item now visible
  └─ User can access /settings/team
           │
           ▼
MANAGER goes to /settings/team
  ├─ Server checks role (✓ MANAGER allowed)
  ├─ Loads Team Management page
  └─ Can manage users (create, view)
           │
           ▼
MANAGER tries to promote user
  ├─ POST /api/users/promote
  ├─ getCurrentUser(req) → role = "MANAGER"
  ├─ canPromoteUsers("MANAGER") → FALSE
  └─ Return 403 Forbidden (not OWNER)
           │
           ▼
MANAGER cannot escalate privileges ✓
```

---

## Security Features Matrix

```
╔════════════════╦═════════════════════════════════════════════════════╗
║ Feature        ║ Implementation & Status                             ║
╠════════════════╬═════════════════════════════════════════════════════╣
║ Role Storage   ║ ✓ Database (not client-side only)                   ║
║                ║   Location: User.role (ENUM in PostgreSQL)          ║
╠════════════════╬═════════════════════════════════════════════════════╣
║ Permission     ║ ✓ Server-side enforcement on every endpoint         ║
║ Checks         ║   Pattern: canManageUsers(role) before operation    ║
╠════════════════╬═════════════════════════════════════════════════════╣
║ Privilege      ║ ✓ CO_OWNER cannot promote (escalation blocked)      ║
║ Escalation     ║   Only OWNER can call /api/users/promote            ║
║ Prevention     ║                                                     ║
╠════════════════╬═════════════════════════════════════════════════════╣
║ Error          ║ ✓ 403 Forbidden for unauthorized access             ║
║ Responses      ║   401 Unauthorized if not authenticated             ║
║                ║   Clear error messages (no info leakage)            ║
╠════════════════╬═════════════════════════════════════════════════════╣
║ Password       ║ ✓ Bcryptjs hashing (12 rounds)                      ║
║ Security       ║   Seed script hashes OWNER password                 ║
╠════════════════╬═════════════════════════════════════════════════════╣
║ OWNER          ║ ✓ Bootstrap via seed script (not signup)            ║
║ Bootstrap      ║   One-time creation, idempotent                     ║
║                ║   Auto-verified (bypasses email check)              ║
╠════════════════╬═════════════════════════════════════════════════════╣
║ UI Protection  ║ ✓ Conditional menu rendering based on role          ║
║ (Client)       ║   Team Management menu hidden from EMPLOYEE         ║
║                ║   Non-enforcing (server-side is actual security)    ║
╠════════════════╬═════════════════════════════════════════════════════╣
║ Session        ║ ✓ Role included in session (from API)               ║
║ Management     ║   Retrieved from /api/session endpoint              ║
║                ║   x-user-id header for all requests                 ║
╠════════════════╬═════════════════════════════════════════════════════╣
║ Default Role   ║ ✓ All new users = EMPLOYEE (most restrictive)       ║
║ Assignment     ║   Cannot be changed by user themselves              ║
║                ║   Only OWNER can promote                            ║
╚════════════════╩═════════════════════════════════════════════════════╝
```

---

## Component Interaction Diagram

```
User Interface Layer
├── Login Form
│   ├─ Accepts: email, password
│   ├─ Returns: user object with role
│   └─ Stores: role in sessionManager
│
├── Navigation Sidebar
│   ├─ Checks: currentUser?.role
│   ├─ Shows: [Team Management] if role in [OWNER, CO_OWNER, MANAGER]
│   └─ Hides: [Team Management] if role in [EMPLOYEE, TEAM_LEAD]
│
├── Settings Page
│   ├─ Displays: Profile, Notifications, Team tabs
│   ├─ Shows: "Manage Team" button if authorized
│   └─ Links to: /settings/team (if has permission)
│
└── Team Management Page (/settings/team)
    ├─ Client-side check: if (!isAuthorized(role))
    ├─ Shows: "Access Denied" UI (not redirect)
    ├─ For authorized: Lists users, add form, promote buttons
    └─ All actions include x-user-id header

API Layer
├── Auth Endpoints
│   ├─ POST /api/auth/register
│   │   └─ Sets role = EMPLOYEE
│   ├─ POST /api/auth/login
│   │   └─ Returns user with role
│   └─ GET /api/session
│       └─ Returns user with role (role field)
│
├── Protected Endpoints
│   ├─ GET /api/users
│   │   ├─ Check: canManageUsers(role)?
│   │   ├─ YES: Return users list
│   │   └─ NO: 403 Forbidden
│   │
│   ├─ POST /api/users
│   │   ├─ Check: canManageUsers(role)?
│   │   ├─ YES: Create and return user
│   │   └─ NO: 403 Forbidden
│   │
│   └─ POST /api/users/promote
│       ├─ Check: canPromoteUsers(role)?  [OWNER ONLY]
│       ├─ YES: Promote and return user
│       └─ NO: 403 Forbidden

Database Layer
└── User Table
    ├─ id: Primary key
    ├─ email: Unique identifier
    ├─ password: Bcryptjs hashed
    ├─ role: ENUM (EMPLOYEE, TEAM_LEAD, MANAGER, CO_OWNER, OWNER)
    ├─ name: Display name
    ├─ isVerified: Email verification status
    └─ timestamps: createdAt, updatedAt
```

---

## Deployment Flow

```
Development (npm run dev)
        │
        ▼
Build (npm run build)
        │
        ├─ Verify TypeScript ✓
        ├─ Verify dependencies ✓
        ├─ Check for errors
        │   └─ If errors: Fix and rebuild
        │
        └─ Build successful ✓
        │
        ▼
Run Migration
        │
        npx prisma migrate deploy
        │
        ├─ Creates Role ENUM
        ├─ Adds role column to users
        ├─ Sets default to EMPLOYEE
        │
        └─ Migration applied ✓
        │
        ▼
Create OWNER Account
        │
        npx ts-node scripts/seed-owner.ts
        │
        ├─ Check if owner exists
        ├─ If not: Create OWNER with email & password
        ├─ Auto-verify OWNER
        │
        └─ OWNER created ✓
        │
        ▼
Update Credentials
        │
        ├─ Edit scripts/seed-owner.ts
        ├─ Change: owner.dummy@gmail.com → liz@boombox.com
        ├─ Change: password to secure value
        ├─ Save file
        │
        └─ Credentials updated ✓
        │
        ▼
Run Seed Again
        │
        npx ts-node scripts/seed-owner.ts
        │
        ├─ Detects existing OWNER
        └─ Confirms OWNER account ready
        │
        ▼
Start Application
        │
        npm run dev  (or: npm start for production)
        │
        └─ Application running ✓
```

---

**Created:** January 13, 2026
**Status:** Complete & Production Ready ✅
