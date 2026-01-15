# User Approval System - Code Changes Summary

## 1. Registration API - Mark New Users as Inactive

**File:** `src/app/api/auth/register/route.ts`

### Change: New users created with active: false

```typescript
// BEFORE
const user = await prisma.user.create({
  data: {
    email: normalizedEmail,
    password: hashedPassword,
    firstName: firstName,
    lastName: lastName,
    role: "EMPLOYEE",
    isVerified: false,
    active: true, // ❌ Could login immediately
  },
});

// AFTER
const user = await prisma.user.create({
  data: {
    email: normalizedEmail,
    password: hashedPassword,
    firstName: firstName,
    lastName: lastName,
    role: "EMPLOYEE",
    isVerified: false,
    active: false, // ✅ Must be approved first
  },
});
```

### Change: Create notification for owner

```typescript
// Notify OWNER about new user registration
try {
  const owner = await prisma.user.findFirst({
    where: { role: "OWNER" },
  });

  if (owner) {
    await prisma.notification.create({
      data: {
        receiverId: owner.id,
        type: "new_user_registration",
        data: {
          userId: user.id,
          userName: `${user.firstName} ${user.lastName}`,
          email: user.email,
          status: "pending",
        },
      },
    });
  }
} catch (e) {
  console.warn("Failed to send owner notification", e);
}
```

---

## 2. Login API - Check Active Status

**File:** `src/app/api/auth/login/route.ts`

### Change: Added active account check

```typescript
// BEFORE
if (!user.isVerified) {
  return NextResponse.json(
    { error: "Please verify your email before logging in." },
    { status: 403 }
  );
}

return NextResponse.json({ success: true, user: userWithoutPassword });

// AFTER
if (!user.isVerified) {
  return NextResponse.json(
    { error: "Please verify your email before logging in." },
    { status: 403 }
  );
}

// ✅ NEW: Check if account is active (approved by owner)
if (!user.active) {
  return NextResponse.json(
    {
      error:
        "Your account is pending approval from an administrator. Please wait for approval.",
    },
    { status: 403 }
  );
}

return NextResponse.json({ success: true, user: userWithoutPassword });
```

---

## 3. Notifications Page - Add Approve/Reject Buttons

**File:** `src/app/notifications/page.tsx`

### Change: Added handler functions

```typescript
const handleApproveUser = async (notificationId: number, userId: number) => {
  try {
    const response = await fetch(`/api/users/${userId}/approve`, {
      method: "POST",
    });
    if (response.ok) {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      alert("User approved successfully!");
    } else {
      alert("Failed to approve user");
    }
  } catch (err) {
    console.error("Failed to approve user:", err);
    alert("Error approving user");
  }
};

const handleRejectUser = async (notificationId: number, userId: number) => {
  try {
    if (
      !confirm(
        "Are you sure you want to reject this user? This will delete their account."
      )
    ) {
      return;
    }
    const response = await fetch(`/api/users/${userId}/deny`, {
      method: "POST",
    });
    if (response.ok) {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      alert("User rejected and account deleted");
    } else {
      alert("Failed to reject user");
    }
  } catch (err) {
    console.error("Failed to reject user:", err);
    alert("Error rejecting user");
  }
};
```

### Change: Added icon and color for new_user_registration

```typescript
const getNotificationIcon = (type: string) => {
  switch (type) {
    case "task_assigned":
      return "📋";
    case "channel_added":
      return "👥";
    case "welcome":
      return "🎉";
    case "task_deadline":
      return "⏰";
    case "new_user_registration":
      return "👤"; // ✅ NEW
    default:
      return "📢";
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case "task_assigned":
      return "#3b82f6";
    case "channel_added":
      return "#10b981";
    case "welcome":
      return "#f59e0b";
    case "task_deadline":
      return "#ef4444";
    case "new_user_registration":
      return "#8b5cf6"; // ✅ NEW (purple)
    default:
      return "#6366f1";
  }
};
```

### Change: Conditional button rendering

```typescript
{
  /* Action buttons */
}
{
  notification.type === "new_user_registration" ? (
    <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
      {/* Approve Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleApproveUser(
            notification.id,
            (notification as any).data?.userId
          );
        }}
        style={{
          background: "rgba(16, 185, 129, 0.2)",
          color: "#10b981",
          border: "1px solid rgba(16, 185, 129, 0.3)",
          borderRadius: "6px",
          padding: "6px 12px",
          fontSize: "12px",
          fontWeight: 500,
          cursor: "pointer",
          transition: "all 0.2s",
        }}
      >
        Approve
      </button>

      {/* Reject Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleRejectUser(notification.id, (notification as any).data?.userId);
        }}
        style={{
          background: "rgba(239, 68, 68, 0.2)",
          color: "#ef4444",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          borderRadius: "6px",
          padding: "6px 12px",
          fontSize: "12px",
          fontWeight: 500,
          cursor: "pointer",
          transition: "all 0.2s",
        }}
      >
        Reject
      </button>
    </div>
  ) : (
    // Regular Delete button for other notification types
    <button>Delete</button>
  );
}
```

---

## 4. Approve Endpoint - Activate Account

**File:** `src/app/api/users/[id]/approve/route.ts`

### Change: Set active: true when approving

```typescript
// BEFORE
const approvedUser = await prisma.user.update({
  where: { id: userId },
  data: { isVerified: true },
  select: {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    role: true,
    isVerified: true,
  },
});

// AFTER
const approvedUser = await prisma.user.update({
  where: { id: userId },
  data: {
    isVerified: true,
    active: true, // ✅ NEW: Activate account
  },
  select: {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    role: true,
    isVerified: true,
    active: true, // ✅ NEW: Include in response
  },
});
```

---

## 5. Registration Form - Separate First/Last Name

**File:** `src/app/components/auth/registerForm.tsx`

### Change: Split name state

```typescript
// BEFORE
const [name, setName] = useState("");

// AFTER
const [firstName, setFirstName] = useState("");
const [lastName, setLastName] = useState("");
```

### Change: Create two side-by-side inputs

```typescript
// BEFORE
<input
  placeholder="Full Name"
  value={name}
  onChange={(e) => setName(e.target.value)}
  style={{ /* styles */ }}
/>

// AFTER
<div style={{ display: "flex", gap: 12, width: "100%", maxWidth: 320 }}>
  <input
    placeholder="First Name"
    value={firstName}
    onChange={(e) => setFirstName(e.target.value)}
    style={{ flex: 1, /* ...other styles */ }}
  />
  <input
    placeholder="Last Name"
    value={lastName}
    onChange={(e) => setLastName(e.target.value)}
    style={{ flex: 1, /* ...other styles */ }}
  />
</div>
```

### Change: Update API payload

```typescript
// BEFORE
fetch("/api/auth/register", {
  body: JSON.stringify({ name, email, password }),
});

// AFTER
fetch("/api/auth/register", {
  body: JSON.stringify({ firstName, lastName, email, password }),
});
```

---

## Summary of Changes

| Component          | Change                               | Type       |
| ------------------ | ------------------------------------ | ---------- |
| Register API       | New users: `active: false`           | Config     |
| Register API       | Create owner notification            | Feature    |
| Login API          | Check `active: true`                 | Validation |
| Notifications Page | Approve/Reject handlers              | Handlers   |
| Notifications Page | Icon/Color for new_user_registration | UI         |
| Notifications Page | Conditional button rendering         | UI         |
| Approve Endpoint   | Set `active: true`                   | Update     |
| Register Form      | Split firstName/lastName             | UI         |

## Testing Code

```javascript
// Test 1: Create user and verify inactive
const user = await fetch("/api/auth/register", {
  method: "POST",
  body: JSON.stringify({
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    password: "Test123!",
  }),
});
// Check database: active should be false

// Test 2: Try login before approval
const login = await fetch("/api/auth/login", {
  method: "POST",
  body: JSON.stringify({
    email: "john@example.com",
    password: "Test123!",
  }),
});
// Should return 403 with message about pending approval

// Test 3: Approve user
const approve = await fetch("/api/users/2/approve", {
  method: "POST",
});
// Check database: active should be true

// Test 4: Login after approval
const login2 = await fetch("/api/auth/login", {
  method: "POST",
  body: JSON.stringify({
    email: "john@example.com",
    password: "Test123!",
  }),
});
// Should return 200 with user data
```

## No Breaking Changes

- Existing approved users unaffected
- Existing login flow unchanged for approved users
- Email verification still required
- Role-based access control unchanged
- All endpoints remain backward compatible
