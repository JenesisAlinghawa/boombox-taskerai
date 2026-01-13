# Settings Dropdown Feature Documentation

## Overview

The Settings Dropdown feature provides users with a convenient way to manage their profile, notification preferences, and team members directly from the sidebar. This feature is fully integrated into the TaskerAI application and includes a comprehensive set of modals for managing different aspects of the user account and team.

## Features Implemented

### 1. Settings Dropdown Menu

Located in the sidebar footer (when not collapsed), the Settings dropdown button provides access to three main sections:

- **Update Profile Details** - Modify user name and view email
- **Change Notification Preferences** - Toggle email and push notifications
- **Team Management** - Add, edit, and remove team members

### 2. Update Profile Details Modal

- Allows users to update their display name
- Shows read-only email field for reference
- Real-time feedback with success/error messages
- Updates are persisted via `/api/users/profile` endpoint

**Features:**

- Name input field
- Disabled email field (read-only)
- Save and Cancel buttons
- Success/error messaging
- Auto-close on successful update

### 3. Notification Preferences Modal

- Toggle Email Notifications on/off
- Toggle Push Notifications on/off
- Save and Cancel buttons

**Features:**

- Checkbox-based preferences
- Clean, intuitive interface
- Settings can be extended to save to backend

### 4. Team Management Modal

The most comprehensive feature, allowing users to:

#### Add Users to Team

- Input field for email address
- Add button to invite users
- Error handling for invalid emails or duplicate entries
- Real-time team refresh after adding a user

#### Manage Team Members

- View all team members with their status
- Edit member status (Active/Inactive)
- Remove team members from the team
- Visual status indicators (green for active, gray for inactive)

**Features:**

- Displays team member name and email
- Status badges showing current status
- Edit button to change member status
- Remove button to delete team member
- Confirmation dialog before removing user
- Real-time team list updates

## API Endpoints Used

### Profile Management

- **PATCH** `/api/users/profile` - Update user profile
  - Header: `x-user-id` (user ID)
  - Body: `{ name: string }`

### Team Management

- **GET** `/api/teams` - Fetch user's team and members
  - Header: `x-user-id` (user ID)
- **POST** `/api/teams` - Add user to team
  - Header: `x-user-id` (user ID)
  - Body: `{ email: string }`
- **PATCH** `/api/teams/[id]` - Update team member status
  - Header: `x-user-id` (user ID)
  - Body: `{ status: string }` (e.g., "active", "inactive")
- **DELETE** `/api/teams/[id]` - Remove team member
  - Header: `x-user-id` (user ID)

## Component Structure

### SettingsDropdown.tsx

Main component located at `src/app/components/SettingsDropdown.tsx`

- Manages dropdown state
- Renders dropdown menu with three options
- Renders modals based on active modal state
- Closes dropdown when clicking outside

### Embedded Modal Components

All modal components are defined within SettingsDropdown.tsx:

1. **UpdateProfileModal** - Profile update form
2. **NotificationPreferencesModal** - Notification settings
3. **TeamManagementModal** - Team member management
4. **ModalOverlay** - Shared modal wrapper for styling

## Database Models

### Team Model

```prisma
model Team {
  id        Int      @id @default(autoincrement())
  name      String
  ownerId   Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  owner   User       @relation("TeamOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  members TeamMember[]
}
```

### TeamMember Model

```prisma
model TeamMember {
  id        Int      @id @default(autoincrement())
  teamId    Int
  userId    Int
  status    String   @default("active")
  joinedAt  DateTime @default(now())
  updatedAt DateTime @updatedAt

  team Team @relation(fields: [teamId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([teamId, userId])
}
```

## Integration Points

### Sidebar Integration

The Settings dropdown is integrated into the Sidebar component (`src/app/components/Sidebar.tsx`):

- Appears in the bottom section of the sidebar
- Only visible when sidebar is not collapsed
- Displays after the user avatar section
- Receives userId, userName, and userEmail as props

## UI/UX Details

### Colors Used

- Primary: `#5d8bb1` (light blue)
- Background: `#1a1f3a` (dark navy)
- Card Background: `#232d4a` (slightly lighter navy)
- Text: `#ffffff` (white)
- Muted: `#a0aec0` (light gray)
- Border: `#374151` (dark gray)
- Hover: `#2d3748` (medium gray)
- Danger: `#ef4444` (red)

### Responsive Design

- Modals are responsive with max-width
- Uses percentage-based widths for mobile compatibility
- Dropdown positioning adjusts based on available space

## Usage

1. **Access Settings**: Click the "⚙️ Settings" button in the sidebar footer
2. **Select Option**: Choose from the dropdown menu
3. **Modal Opens**: The corresponding modal will appear
4. **Make Changes**: Update desired settings or manage team members
5. **Confirm**: Click Save or appropriate action button
6. **Auto-close**: Successful operations automatically close the modal

## Error Handling

The feature includes comprehensive error handling:

- Invalid email validation when adding users
- Duplicate user prevention (can't add same user twice)
- Not found errors (user doesn't exist)
- Authorization checks (users can only manage their own team)
- Network error handling with user-friendly messages
- Confirmation dialogs for destructive actions (removing users)

## Future Enhancements

Potential improvements that could be added:

1. **Notification Preferences Backend**: Connect notification settings to database
2. **Change Password**: Add password change functionality
3. **Two-Factor Authentication**: Add 2FA setup option
4. **Team Invitations**: Send email invitations instead of direct adds
5. **Team Roles**: Implement role-based permissions (Admin, Member, etc.)
6. **Bulk User Management**: Add/remove multiple users at once
7. **User Permissions**: Set granular permissions for team members
8. **Audit Log**: Track changes to team members and settings

## Testing Checklist

- [ ] Settings dropdown appears in sidebar when not collapsed
- [ ] Clicking settings button opens dropdown menu
- [ ] Clicking outside dropdown closes it
- [ ] Update Profile modal works correctly
  - [ ] Can update name
  - [ ] Email field is read-only
  - [ ] Success message appears
  - [ ] Modal auto-closes after update
- [ ] Notification Preferences modal opens
  - [ ] Checkboxes toggle correctly
  - [ ] Save button works
- [ ] Team Management modal opens
  - [ ] Can add user by email
  - [ ] Team members list displays
  - [ ] Can edit member status
  - [ ] Can remove members
  - [ ] Confirmation before deletion
  - [ ] Team list updates in real-time
- [ ] API endpoints respond correctly
- [ ] Error messages display appropriately
- [ ] Mobile responsive design works

## File Locations

- Component: `src/app/components/SettingsDropdown.tsx`
- Sidebar Integration: `src/app/components/Sidebar.tsx`
- Profile API: `src/app/api/users/profile/route.ts`
- Teams API: `src/app/api/teams/route.ts`
- Teams ID API: `src/app/api/teams/[id]/route.ts`
- Database Schema: `prisma/schema.prisma`
