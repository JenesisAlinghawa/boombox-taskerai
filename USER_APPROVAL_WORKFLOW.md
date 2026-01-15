# User Approval Workflow - Complete Implementation

## Overview

A complete user account approval workflow has been implemented where new user registrations require owner approval before they can access the system.

## Workflow Steps

### 1. User Registration

**File:** `src/app/api/auth/register/route.ts`

When a new user registers:

- Account is created with `active: false` (inactive by default)
- Email verification is still required (`isVerified: false`)
- Default role is `EMPLOYEE`
- Owner receives a notification of type `new_user_registration`

**Notification Data Structure:**

```json
{
  "userId": <user_id>,
  "userName": "<first_name> <last_name>",
  "email": "<user_email>",
  "status": "pending"
}
```

### 2. Login Validation

**File:** `src/app/api/auth/login/route.ts`

Login now requires THREE conditions:

1. Valid email and password
2. Email must be verified (`isVerified: true`)
3. **NEW:** Account must be active (`active: true`)

If account is not active, login fails with:

```
"Your account is pending approval from an administrator. Please wait for approval."
```

### 3. Owner Notification & Approval

**File:** `src/app/notifications/page.tsx`

Owners see new user registration notifications with:

- User avatar icon (👤) with purple background
- User name and email
- Timestamp
- **Two action buttons:**
  - **Approve** (green): Activates the account
  - **Reject** (red): Deletes the account

### 4. Approval Action

**File:** `src/app/api/users/[id]/approve/route.ts`

When owner clicks "Approve":

- Sets `isVerified: true` (ensures email is verified)
- Sets `active: true` (activates the account)
- User can now login
- Notification is removed from owner's list

### 5. Rejection Action

**File:** `src/app/api/users/[id]/deny/route.ts`

When owner clicks "Reject":

- User account is deleted from database
- Confirmation dialog prompts owner first
- User cannot recover account (completely deleted)
- Notification is removed from owner's list

## Database Changes

### User Table

The existing `User` model already has the required fields:

- `active` (Boolean, default: true, now set to false for new users)
- `isVerified` (Boolean, used with email verification)

### Notification Table

Uses existing `Notification` model:

```prisma
model Notification {
  id        Int      @id @default(autoincrement())
  receiverId Int
  type      String   // "new_user_registration"
  data      Json     // { userId, userName, email, status }
  read      Boolean  @default(false)
  createdAt DateTime @default(now())

  receiver  User     @relation(fields: [receiverId], references: [id], onDelete: Cascade)
}
```

## API Endpoints

### New User Registration Notification

```
POST /api/auth/register
Body: { email, password, firstName, lastName }
Side Effect: Creates notification with type "new_user_registration"
```

### Approve User

```
POST /api/users/[id]/approve
Auth: Requires OWNER role
Response: { message, user: { id, email, firstName, lastName, isVerified, active } }
```

### Reject User

```
POST /api/users/[id]/deny
Auth: Requires OWNER role
Response: { message: "User denied and removed successfully" }
```

## UI Components

### Notifications Page

**Location:** `src/app/notifications/page.tsx`

Enhanced with:

1. Icon and color for `new_user_registration` type (👤 purple)
2. Conditional rendering:
   - For `new_user_registration`: Show Approve/Reject buttons
   - For other types: Show Delete button
3. Handlers:
   - `handleApproveUser(notificationId, userId)` → POST `/api/users/[id]/approve`
   - `handleRejectUser(notificationId, userId)` → POST `/api/users/[id]/deny`

### Registration Form

**Location:** `src/app/components/auth/registerForm.tsx`

Two separate inputs:

- First Name (flex: 1)
- Last Name (flex: 1)
- Displayed horizontally with 12px gap

## Access Control

### Who Can Approve/Reject?

- Only users with `OWNER` role
- Checked via `canPromoteUsers()` function
- Returns 403 Forbidden if non-owner attempts

### Safeguards

- Cannot deny OWNER account (403 error)
- Cannot approve already-verified user (400 error)
- Confirmation dialog before rejecting
- All endpoints require authentication

## User Experience Flow

### For New User

1. Register with email/password/first name/last name
2. Receive email verification link
3. Verify email
4. Attempt to login → Get message: "Your account is pending approval from an administrator"
5. Wait for owner approval
6. After approval, can login normally

### For Owner

1. User registers
2. See "New User Registration" notification in `/notifications`
3. See user name and email in notification
4. Click "Approve" to activate account OR "Reject" to delete it
5. Notification disappears after action

## Technical Stack

- **Frontend:** React/Next.js with client-side handlers
- **API:** REST endpoints with role-based access control
- **Database:** Prisma ORM with PostgreSQL
- **Authentication:** JWT tokens with role validation
- **Real-time:** Notifications poll via 3-second interval

## Security Considerations

✅ Only OWNER can approve/reject  
✅ Email verification still required  
✅ Active status prevents login  
✅ Confirmation dialog before rejection  
✅ Account deleted completely (not suspended)  
✅ All endpoints require authentication

## Testing Checklist

- [ ] Register new account → Check owner gets notification
- [ ] Verify notification shows user details correctly
- [ ] Reject user → User account deleted
- [ ] Approve user → User can login
- [ ] Attempt login before approval → Get "pending approval" message
- [ ] Attempt login as rejected user → User not found error
- [ ] Only OWNER can access approve/reject buttons
- [ ] Non-owner cannot hit approve/reject API endpoints

## Files Modified

1. **src/app/api/auth/register/route.ts**

   - Changed new user `active: true` → `active: false`
   - Creates notification of type `new_user_registration`

2. **src/app/api/auth/login/route.ts**

   - Added check for `active: true` status
   - Returns 403 if account not active

3. **src/app/notifications/page.tsx**

   - Added `handleApproveUser()` function
   - Added `handleRejectUser()` function
   - Added icon/color for `new_user_registration` type
   - Added conditional approve/reject buttons for this notification type

4. **src/app/api/users/[id]/approve/route.ts**

   - Updated to set `active: true` when approving
   - Added `active` to response data

5. **src/app/components/auth/registerForm.tsx**
   - Split `name` state into `firstName` and `lastName`
   - Created two side-by-side input fields
   - Updated API payload to use `firstName` and `lastName`

## Endpoint Already Existed

- `src/app/api/users/[id]/deny/route.ts` - Reject endpoint was already implemented

## Notes

- All new user accounts start with `active: false`
- Existing users retain their `active` status
- This prevents any account creation bypass
- Owner gets real-time notifications (polls every 3 seconds)
- No email sent to user about rejection (can be added if needed)
