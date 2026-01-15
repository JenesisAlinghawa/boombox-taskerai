# User Account Approval System - Quick Reference

## What Changed?

New user accounts now require **OWNER approval** before they can login.

## The Flow

```
1. User Registers (firstName, lastName, email, password)
   ↓
2. Account Created (active: false, isVerified: false)
   ↓
3. Owner Gets Notification (new_user_registration type)
   ↓
4. Owner Clicks Approve or Reject
   ├─ APPROVE → Sets active: true, user can now login
   └─ REJECT → User account deleted, cannot recover
```

## For Users

### Registration

```
1. Go to /auth/register
2. Enter First Name, Last Name, Email, Password
3. Click Register
4. Verify email via link sent to inbox
5. Try to login
6. **WAIT** for owner approval (message: "Your account is pending approval")
7. Owner approves → Can login
```

### Login (Pending Account)

Get message:

```
"Your account is pending approval from an administrator. Please wait for approval."
```

## For Owner

### View Pending Approvals

1. Go to `/notifications`
2. Look for notifications with **👤 purple icon** (New User Registration)
3. See user name and email
4. Click **"Approve"** (green) or **"Reject"** (red)

### Approve User

- **Action:** Click green "Approve" button
- **Result:** Account activated, user can login immediately

### Reject User

- **Action:** Click red "Reject" button
- **Confirmation:** Dialog asks "Are you sure?"
- **Result:** Account deleted, user cannot recover

## Database

### User Status Codes

- `active: false` → Account pending approval
- `active: true` → Account active, can login
- `isVerified: false` → Email not verified yet (always required)
- `isVerified: true` → Email verified, can login (if also active)

### Notification Type

```
type: "new_user_registration"
data: {
  userId: <number>,
  userName: "<first> <last>",
  email: "<email>",
  status: "pending"
}
```

## API Endpoints

### Register

```bash
POST /api/auth/register
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "Secure123!"
}
```

### Approve User

```bash
POST /api/users/[userId]/approve
# Returns: { message, user: { ... } }
# Auth: OWNER role only
```

### Reject User

```bash
POST /api/users/[userId]/deny
# Returns: { message: "User denied and removed successfully" }
# Auth: OWNER role only
```

## Files Modified

| File                                       | Change                                                      |
| ------------------------------------------ | ----------------------------------------------------------- |
| `src/app/api/auth/register/route.ts`       | New users created with `active: false` + owner notification |
| `src/app/api/auth/login/route.ts`          | Added `active: true` check before login                     |
| `src/app/notifications/page.tsx`           | Added approve/reject buttons for new_user_registration      |
| `src/app/api/users/[id]/approve/route.ts`  | Updated to set `active: true`                               |
| `src/app/components/auth/registerForm.tsx` | Split name into firstName/lastName inputs                   |

## Features

✅ Owner gets instant notification of new registrations  
✅ Owner can approve or reject with one click  
✅ Users can't login until approved  
✅ Email verification still required  
✅ Complete account deletion on rejection  
✅ Role-based access control (OWNER only)  
✅ Confirmation dialog before rejection

## Testing

1. **Register new account** → Check `/notifications` shows it
2. **Click Approve** → Try login, should work
3. **Register another account** → Click Reject → Try login, should fail

## Troubleshooting

**"Your account is pending approval..."**

- Account not yet approved by owner
- Owner needs to visit `/notifications` and click Approve

**User cannot login after approval**

- Check if email is verified (should be)
- Check database: `active: true` and `isVerified: true`

**Cannot see Approve/Reject buttons**

- Must be logged in as OWNER user
- Role in database must be exactly `OWNER`

**Account deleted but still tries to login**

- User was rejected, account is completely deleted
- Must register again from scratch
