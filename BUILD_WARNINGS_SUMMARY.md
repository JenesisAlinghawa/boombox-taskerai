# BUILD OUTPUT - UNUSED FILES SUMMARY

ESLINT WARNINGS SUMMARY:

UNUSED VARIABLES & IMPORTS BY FILE:
────────────────────────────────────────────────────────────────────────────

1. ./src/app/admin/pending-requests/page.tsx
   ├─ Line 25: Missing dependency 'checkAuthAndFetchUsers' in useEffect
   └─ Line 44: 'err' variable unused

2. ./src/app/analytics/page.tsx
   └─ Line 5: Unused import 'AlertCircle'

3. ./src/app/api/analytics/ai/route.ts
   ├─ Line 79: Unused variable 'tasks'
   └─ Line 217: Unused variable 'e'

4. ./src/app/api/auth/login/route.ts
   └─ Line 48: Unused variable '\_'

5. ./src/app/api/auth/register/route.ts
   └─ Line 72: Unused variable '\_'

6. ./src/app/api/auth/reset/route.ts
   └─ Line 15: Unused variable 'e'

7. ./src/app/api/auth/verify/route.ts
   ├─ Line 24: Unused variable 'e'
   └─ Line 73: Unused variable '\_'

8. ./src/app/api/channels/[id]/members/route.ts
   ├─ Line 6: Unused import 'canManageUsers'
   └─ ⚠️ CRITICAL: Line 178 Type Error - 'channelId_userId' doesn't exist in schema

9. ./src/app/api/invite/send/route.ts
   └─ Line 57: Unused variable 'tokenExpiry'

10. ./src/app/api/subscribe/route.ts
    ├─ Line 13: Unused variable 'e'
    └─ Line 26: Unused variable 'e'

11. ./src/app/auth/verify/page.tsx
    └─ Line 60: Unused variable 'err'

12. ./src/app/auth/verify/VerifyClient.tsx
    └─ Line 53: Unused variable 'error'

13. ./src/app/components/FilePreview.tsx
    └─ Line 11: ⚠️ Using <img> instead of Next.js <Image /> (performance)

14. ./src/app/components/messaging/ChatWindow2.tsx
    ├─ Line 98: Unused variable 'err'
    └─ Line 212: Unused variable 'isCurrentUser'

17. ./src/app/components/sidebar/NavigationMenu.tsx
    ├─ Line 86: Unused variable 'err'
    ├─ Line 217: ⚠️ Using <img> instead of Next.js <Image /> (performance)
    └─ Line 317: ⚠️ Using <img> instead of Next.js <Image /> (performance)

18. ./src/app/components/sidebar/SidebarFooter.tsx
    └─ Line 8: Unused variable 'collapsed'

19. ./src/app/components/sidebar/SidebarHeader.tsx
    └─ Line 15: Unused parameter 'onCollapse'

20. ./src/app/components/Sidebar.tsx
    ├─ Line 5: Unused import 'SettingsDropdown'
    └─ Line 26: Unused variable 'setCollapsed'

21. ./src/app/dashboard/layout.tsx
    └─ Line 12: Unused variable 'setCollapsed'

22. ./src/app/dashboard/messages/page.tsx
    └─ Line 3: Unused import 'useEffect'

23. ./src/app/dashboard/page.tsx
    └─ Line 94: Unused variable 'progressData'

24. ./src/app/invite/page.tsx
    └─ Line 34: Missing dependency 'verifyToken' in useEffect

25. ./src/app/logs/layout.tsx
    └─ Line 12: Unused variable 'setCollapsed'

26. ./src/app/logs/page.tsx
    ├─ Line 27: Unused variable 'userRole'
    ├─ Line 31: Missing dependency 'fetchUserAndLogs' in useEffect
    └─ Line 44: Unused variable 'err'

27. ./src/app/messages/layout.tsx
    └─ Line 12: Unused variable 'setCollapsed'

28. ./src/app/messages/page.tsx
    ├─ Line 10: Unused import 'Clock'
    ├─ Line 13: Unused import 'Edit2'
    ├─ Line 14: Unused import 'Trash2'
    ├─ Line 15: Unused import 'Reply'
    ├─ Line 16: Unused import 'Smile'
    ├─ Line 82: Missing dependencies in useEffect
    ├─ Line 110: Unused variable 'err'
    ├─ Line 127: Unused variable 'err'
    ├─ Line 142: Unused variable 'err'
    ├─ Line 182: Unused variable 'err'
    └─ Line 351: ⚠️ Using <img> instead of Next.js <Image /> (performance)

29. ./src/app/notifications/layout.tsx
    └─ Line 12: Unused variable 'setCollapsed'

30. ./src/app/notifications/page.tsx
    └─ Line 55: Missing dependency 'fetchNotifications' in useEffect

31. ./src/app/settings/layout.tsx
    └─ Line 12: Unused variable 'setCollapsed'

32. ./src/app/settings/page.tsx
    ├─ Line 57: Unused variable 'notificationSaving'
    ├─ Line 57: Unused variable 'setNotificationSaving'
    ├─ Line 64: Unused variable 'editingUserId'
    ├─ Line 65: Unused variable 'editingRole'
    ├─ Line 65: Unused variable 'setEditingRole'
    ├─ Line 70: Missing dependency 'loadCurrentUser' in useEffect
    ├─ Line 84: Unused variable 'err'
    └─ Line 303: ⚠️ Using <img> instead of Next.js <Image /> (performance)

33. ./src/app/settings/team/page.tsx
    ├─ Line 20: Unused import 'Edit2'
    └─ Line 20: Unused import 'Trash2'

34. ./src/app/tasks/layout.tsx
    └─ Line 12: Unused variable 'setCollapsed'

35. ./src/lib/sse.ts
    ├─ Line 24: Unused variable 'err'
    └─ Line 30: Anonymous default export (should assign to variable)

================================================================================
STATISTICS
================================================================================

Total Files with Warnings: 35
Total Warning Count: ~80+

By Category:
• Unused Variables: ~45 (mostly 'err', 'e', '\_')
• Unused Imports: ~8
• Missing Dependencies (useEffect): ~5
• <img> Performance Issues: ~6
• Type Errors: 1 (CRITICAL)
• Code Quality Issues: 1

Priority Fixes:
⚠️ CRITICAL (Must fix for build): - ./src/app/api/channels/[id]/members/route.ts:178 (Type error)

🔴 HIGH (Should fix): - 6 <img> tags should use Next.js <Image /> for optimization - 5 useEffect missing dependencies

🟡 MEDIUM (Nice to have): - ~45 unused error variables (mostly 'err', 'e') - ~8 unused imports - 1 anonymous default export

================================================================================
