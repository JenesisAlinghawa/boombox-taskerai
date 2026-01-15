# TaskerAI Quick Reference Guide

## 🔑 Key Credentials

### OWNER Account (Pre-seeded)

```
Email: jenesissanchezalinghawa@gmail.com
Password: password123
Role: OWNER (full access)
Created: scripts/seed-owner.ts
```

---

## 🚀 Quick Start (5 minutes)

```bash
# 1. Install & setup
npm install
npx prisma migrate dev --name init
npx ts-node scripts/seed-owner.ts

# 2. Create .env.local
DATABASE_URL="postgresql://localhost:5432/taskersai"
JWT_SECRET="dev-secret-key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# 3. Run
npm run dev
# Visit http://localhost:3000
```

---

## 🎯 Core Concepts

### User Roles (5 tiers)

| Role      | User Management | Team Management | Task Assign | Promote Users |
| --------- | --------------- | --------------- | ----------- | ------------- |
| EMPLOYEE  | ❌              | ❌              | Self only   | ❌            |
| TEAM_LEAD | ❌              | ❌              | Anyone      | ❌            |
| MANAGER   | ✅              | ✅              | Anyone      | ❌            |
| CO_OWNER  | ✅              | ✅              | Anyone      | ❌            |
| OWNER     | ✅              | ✅              | Anyone      | ✅            |

### User Lifecycle

```
1. Signup → Creates EMPLOYEE, isVerified=false
2. OWNER approves → Sets isVerified=true, sends email
3. User logins → If verified, access granted
4. OWNER can promote → Via /api/users/promote or /settings
```

### Task Rules

```
EMPLOYEE creates task
├─ Can assign to: Self only
└─ Cannot assign to: Others

MANAGER+ creates task
├─ Can assign to: Anyone
└─ Cannot assign to: No restrictions
```

### Messaging

```
Channels:
├─ Anyone can create
├─ Creator can modify/delete
├─ Members can send messages
└─ Supports: reactions, editing, deleting, threading

Direct Messages:
├─ 1-on-1 conversations
├─ Real-time messaging
└─ Supports: reactions, editing, deleting
```

---

## 🔌 API Patterns

### Protected Endpoint (Role-based)

```typescript
// /api/some-route/route.ts
export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!canManageUsers(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Your code here
}
```

### Create with Logging

```typescript
// Create resource
const task = await prisma.task.create({...});

// Log the action
await prisma.log.create({
  data: {
    userId: user.id,
    action: "Task Created",
    data: { taskId: task.id, title: task.title }
  }
});
```

### Send Notification

```typescript
await prisma.notification.create({
  data: {
    receiverId: userId,
    type: "task_assigned",
    data: {
      title: "Task Assigned",
      message: `You were assigned: ${taskTitle}`,
      taskId: task.id,
    },
    read: false,
  },
});
```

---

## 🔄 Common Workflows

### Add User to Team

```
1. OWNER goes to /settings → Team Management
2. Clicks "Add Member"
3. Enters email → Sends invite
4. User receives email with link
5. Click link → /invite?token=xyz
6. User fills: password, firstName, lastName
7. Account created & verified
```

### Promote User

```
1. OWNER goes to /settings → Team Management
2. Finds user in list
3. Clicks "Change Role"
4. Selects new role from dropdown
5. User promoted to new role
6. Notification sent to user
```

### Create Task with Logging

```
1. User creates task
2. API calls /api/tasks (POST)
3. canAssignTask() validates assignment
4. Task created in database
5. Log entry created automatically
6. Response sent with task details
```

---

## 📊 File Structure

```
TaskerAI/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Migration history
├── src/
│   ├── app/
│   │   ├── api/               # API routes
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── tasks/
│   │   │   ├── channels/
│   │   │   ├── messages/
│   │   │   ├── direct-messages/
│   │   │   ├── notifications/
│   │   │   ├── analytics/
│   │   │   ├── invite/
│   │   │   └── logs/
│   │   ├── admin/
│   │   │   └── pending-requests/page.tsx
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   ├── reset/
│   │   │   └── verify/
│   │   ├── components/        # UI components
│   │   ├── dashboard/page.tsx
│   │   ├── messages/page.tsx  # Messaging UI
│   │   ├── settings/page.tsx  # Profile & team
│   │   ├── logs/page.tsx      # Activity logs
│   │   ├── invite/page.tsx    # Invite signup
│   │   └── ...
│   ├── lib/
│   │   ├── auth.ts            # Role-based helpers
│   │   ├── prisma.ts          # Prisma client
│   │   ├── email.ts           # Email service
│   │   └── socket-client.ts   # WebSocket client
│   └── utils/
│       └── sessionManager.ts  # Session handling
├── scripts/
│   └── seed-owner.ts          # Create OWNER account
└── package.json
```

---

## 🔧 Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm start               # Start production server

# Database
npx prisma studio      # Open Prisma UI
npx prisma migrate dev # Create & run migration
npx prisma db seed     # Run seed script
npx prisma db reset    # Reset database

# Utilities
npx ts-node scripts/seed-owner.ts  # Seed OWNER
npm run type-check      # Check TypeScript
npm run lint            # Run ESLint
```

---

## 🐛 Debugging Tips

### Check User Role

```typescript
const user = await getCurrentUser(request);
console.log(user.role); // OWNER, MANAGER, etc.
```

### Verify Task Assignment

```typescript
const canAssign = canAssignTask(user.role, assigneeId, user.id);
if (!canAssign) {
  console.log(`${user.role} cannot assign to ${assigneeId}`);
}
```

### View Database

```bash
npx prisma studio
# Opens GUI at http://localhost:5555
```

### Check API Logs

```bash
# Terminal shows fetch requests
# API console.error() shows server-side errors
```

---

## 🚨 Common Issues & Fixes

### "User not found"

```
Cause: localStorage userId doesn't match database
Fix: Clear localStorage, login again
```

### "Unauthorized" on protected endpoint

```
Cause: Missing x-user-id header or getCurrentUser returns null
Fix: Ensure user is logged in, check sessionManager
```

### "Cannot read property of undefined"

```
Cause: Null/undefined type mismatch
Fix: Add null checks, use optional chaining (?.)
```

### Build fails with "Type error"

```
Cause: TypeScript type mismatch
Fix: Run npm run build to see detailed error, add type assertions
```

---

## 🎓 Learning Paths

### New to the codebase?

1. Read SETUP_AND_GUIDE.md (this repo)
2. Explore `src/lib/auth.ts` (understand roles)
3. Check `src/app/api/users/route.ts` (see pattern)
4. Review `prisma/schema.prisma` (understand data model)

### Adding a new feature?

1. Design database model (schema.prisma)
2. Run `npx prisma migrate dev`
3. Create API route under `src/app/api/`
4. Add permission check with getCurrentUser()
5. Create/update page under `src/app/`
6. Test endpoint with curl/Postman

### Fixing a bug?

1. Check browser console for errors
2. Check terminal for server errors
3. Run `npm run build` for TypeScript errors
4. Use Prisma studio to check data
5. Add console.log() for debugging

---

## 📈 Performance Tips

- Use `npx prisma studio` to see query patterns
- Add indexes to frequently queried fields
- Implement pagination for large lists
- Cache analytics data (don't recalculate every load)
- Use Socket.io for real-time instead of polling

---

## ✅ Verification Checklist

```
Before deploying to production:
[ ] All tests passing
[ ] No console errors
[ ] Environment variables set
[ ] Database backups configured
[ ] Email service working
[ ] HTTPS enabled
[ ] User flows tested (signup→approve→login)
[ ] Task assignment rules verified
[ ] Messaging works real-time (or gracefully degraded)
[ ] Analytics shows correct data
[ ] Logging captures activity
[ ] No unused code or imports
```

---

## 🔗 Useful Links

- Prisma Docs: https://www.prisma.io/docs
- Next.js App Router: https://nextjs.org/docs/app
- TypeScript: https://www.typescriptlang.org/docs
- Socket.io: https://socket.io/docs
- Lucide Icons: https://lucide.dev

---

**Questions? Check IMPLEMENTATION_COMPLETE.md for detailed feature breakdown!**
