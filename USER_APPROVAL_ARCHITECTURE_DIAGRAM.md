# User Approval System - Visual Architecture

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      USER ACCOUNT APPROVAL SYSTEM                       │
└─────────────────────────────────────────────────────────────────────────┘

                          REGISTRATION PHASE
                          ═════════════════

    User Interface              API Endpoint          Database
    ──────────────              ────────────          ────────

    [Register Form]                 │
    ├─ First Name                   │
    ├─ Last Name                    │
    ├─ Email              ┌─────────▼──────────┐
    └─ Password           │ POST /auth/register │
         │                │                    │
         └───────────────►│ Hash Password      │
                          │ Create User        │
                          │   active: false ◄──┼──► [User Table]
                          │   isVerified: false│    ├─ id
                          │                    │    ├─ email
                          │ Create             │    ├─ firstName
                          │ Notification ◄─────┼──► ├─ lastName
                          │   type: new_user..│    ├─ active: false
                          │   receiverId: OWNER│   ├─ isVerified: false
                          │                    │    └─ role: EMPLOYEE
                          │ Send Email         │
                          │   (verification)   │   [Notification Table]
                          │                    │   ├─ id
                          │ Return 200 OK      │   ├─ receiverId: OWNER
                          └────────┬───────────┘   ├─ type: "new_user.."
                                   │               ├─ data: {userId, ...}
                          [Success Screen]        └─ read: false
                                   │
                    "Check email to verify"


                          EMAIL VERIFICATION PHASE
                          ═══════════════════════

    User Email                  Verification Link
    ──────────                  ─────────────────

    [Inbox]
    └─ Verify Email ─────────────────────► /auth/verify?token=JWT
                                           │
                                           ▼
                                    [Verification Page]
                                    │
                                    ▼
                          POST /auth/verify
                          ├─ Verify JWT
                          ├─ Find User
                          │
                          ▼
                    [User Table Update]
                    isVerified: true
                          │
                          ▼
                    "Email Verified ✓"
                    Redirected to Login


                        OWNER NOTIFICATION PHASE
                        ════════════════════════

    Owner Dashboard            Notifications Page       Database
    ───────────────            ───────────────────       ────────

    [Home]
    └─ [Notifications] ─────────► GET /notifications?userId=1
                                  │
                                  ▼
                          [Pull new_user_registration]
                          │
                          ├─ Icon: 👤 (purple)
                          ├─ Title: "New Registration"
                          ├─ Data: Name, Email
                          ├─ Time: Created at
                          │
                          └─ Buttons:
                             ├─ [Approve] (green)
                             └─ [Reject] (red)


                        APPROVAL/REJECTION PHASE
                        ═══════════════════════

         APPROVE PATH                          REJECT PATH
         ────────────                          ───────────

    Owner clicks                           Owner clicks
    [Approve] ───────────────┐    ┌───────► [Reject]
               │              │    │             │
               ▼              │    │             ▼
    POST /api/users/[id]/    │    │    Confirmation Dialog
    approve                   │    │    "Delete account?"
    ├─ Auth: OWNER ◄─────────┤    │             │
    ├─ Check Role: OWNER     │    │             ├─ [Cancel]
    │                         │    │             └─ [Confirm]
    ├─ Update User:          │    │                  │
    │  ├─ isVerified: true   │    │                  ▼
    │  └─ active: true ◄─────┼────┤    POST /api/users/[id]/
    │                         │    │    deny
    ├─ Return success        │    │    ├─ Auth: OWNER
    │                         │    │    ├─ Check Role: OWNER
    └─► [Remove Notification]    │    │
                                  │    ├─ Delete User Record
                                  │    │
                                  │    ├─ Return success
                                  │    │
                                  │    └─► [Remove Notification]
                                  │
                                  └─ Alert to Owner
                                     "User Approved/Rejected"


                         LOGIN PHASE (AFTER APPROVAL)
                         ════════════════════════════

    User Interface              API Endpoint          Database
    ──────────────              ────────────          ────────

    [Login Form]
    ├─ Email                     │
    └─ Password       ┌──────────▼──────────┐
         │            │ POST /auth/login   │
         └───────────►│                    │
                      │ Find User by Email │
                      │                    │
                      ├─ Check password ──►? Password valid
                      │   (bcrypt)
                      │
                      ├─ Check isVerified ►? Email verified
                      │   (must be true)
                      │
                      ├─ Check active ────►? Account active
                      │   (must be true)
                      │
                      ├─ All checks pass!
                      │
                      ├─ Generate JWT
                      │
                      ├─ Return 200 OK
                      └────────┬───────────┘
                               │
                         [Success Screen]
                         "Welcome, John!"
                         Redirected to /dashboard


                    IF ACCOUNT NOT ACTIVE (Before Approval)
                    ═════════════════════════════════════

    [Login Form]
         │
         └───────────┐
                     ▼
        POST /auth/login
        ├─ Email found ✓
        ├─ Password valid ✓
        ├─ Email verified ✓
        │
        ├─ Check active
        │   └─► active: false ✗
        │
        └─► 403 Forbidden
            Message:
            "Your account is pending approval
             from an administrator.
             Please wait for approval."


                        DATABASE RELATIONSHIPS
                        ════════════════════

    ┌─────────────────────────────────────┐
    │           User Table                │
    ├─────────────────────────────────────┤
    │ id          (PK)                    │
    │ email       (unique, lowercase)     │
    │ firstName   (from registration)     │
    │ lastName    (from registration)     │
    │ password    (bcrypt hashed)         │
    │ role        (OWNER|MANAGER|...)     │
    │ isVerified  (false→true after email)│
    │ active      (false→true after appr.)│
    │ createdAt                           │
    └─────────────────────────────────────┘
              │                    ▲
              │ Notification      │ Approve/Deny
              │ receiverId        │
              ▼                    │
    ┌─────────────────────────────┴───────┐
    │      Notification Table             │
    ├─────────────────────────────────────┤
    │ id          (PK)                    │
    │ receiverId  (FK→User.id)            │
    │ type        (new_user_registration) │
    │ data        (JSON: userId, name,..)│
    │ read        (false until viewed)    │
    │ createdAt                           │
    └─────────────────────────────────────┘


                      STATE TRANSITIONS
                      =================

    NEW USER REGISTRATION STATE MACHINE:

    [PENDING] ─────── Approve ──────────► [APPROVED]
       │                                      │
       │                                      │
       └───────── Reject ─────────────────────► [DELETED]

    Detailed:

    PENDING State:
    ├─ active: false
    ├─ isVerified: false (until email verified)
    ├─ Cannot login
    ├─ Owner sees notification
    └─ Waiting for owner action

    APPROVED State:
    ├─ active: true
    ├─ isVerified: true
    ├─ Can login
    ├─ Notification removed
    └─ Full access granted

    DELETED State:
    ├─ User record removed
    ├─ Cannot login
    ├─ Cannot recover
    └─ Must re-register


                    NOTIFICATION DATA STRUCTURE
                    ═══════════════════════════

    Type: "new_user_registration"

    Display:
    ┌──────────────────────────────────┐
    │ 👤  New User Registration        │
    │     John Doe                     │
    │     john@example.com             │
    │     Jan 15, 2025 2:30 PM         │
    │                                  │
    │ [Approve] [Reject]              │
    └──────────────────────────────────┘

    Database:
    {
      "id": 1,
      "receiverId": 1,                  // OWNER user ID
      "type": "new_user_registration",
      "data": {
        "userId": 2,
        "userName": "John Doe",
        "email": "john@example.com",
        "status": "pending"
      },
      "read": false,
      "createdAt": "2025-01-15T14:30:00Z"
    }


                        ERROR HANDLING
                        ==============

    Registration Error: Email Already Exists
    └─► 409 Conflict
        "Email already exists"

    Login Error: Email Not Verified
    └─► 403 Forbidden
        "Please verify your email before logging in"

    Login Error: Account Not Active
    └─► 403 Forbidden
        "Your account is pending approval from an administrator"

    Approve Error: Not Owner
    └─► 403 Forbidden
        "Only OWNER can approve users"

    Approve Error: User Not Found
    └─► 404 Not Found
        "User not found"

    Approve Error: Already Verified
    └─► 400 Bad Request
        "User is already verified"
```
