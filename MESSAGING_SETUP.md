# Socket.io Real-Time Messaging Setup Guide

## Overview

This guide explains how to set up and run the messaging application with real-time Socket.io support.

## What's Implemented

### Frontend Features (messages/page.tsx)

✅ **3-Column Layout**

- Left sidebar: Channels & conversations with search
- Center: Chat area with messages, search, and input
- Right: User profile & task progress stats

✅ **Message Features**

- Send messages to channels and DMs
- Edit own messages (click edit button)
- Delete/unsend messages
- React with emojis (7 presets: 👍 ❤️ 😂 😮 😢 🔥 👏)
- Reply to messages with threading
- Message search/filtering
- Timestamps and "edited" indicators

✅ **Real-Time Capabilities**

- Socket.io client connection with auto-reconnect
- Real-time message delivery to other users
- Real-time edit/delete/reaction broadcasts
- Active user status tracking
- Live typing indicators ready for expansion

✅ **UI/UX**

- Sent messages aligned right (blue background)
- Received messages aligned left (gray background)
- Auto-scroll to bottom on new messages
- Loading states for sending
- Error toast notifications
- Responsive design

### Backend Components

**API Endpoints Used:**

- `POST /api/channels/{id}/messages` - Send channel message
- `POST /api/direct-messages/send` - Send direct message
- `PUT /api/messages/{id}` - Edit message
- `DELETE /api/messages/{id}` - Delete message
- `POST /api/messages/{id}/reactions` - Add emoji reaction
- `GET /api/messages?channelId={id}&limit=100` - Fetch messages
- `GET /api/direct-messages?userId={id}` - Fetch DMs
- `GET /api/tasks?userId={id}` - Fetch user tasks

**Socket.io Events:**

- `user:join` - User authenticates and joins
- `message:send` - New message broadcast
- `message:edit` - Edit event broadcast
- `message:delete` - Delete event broadcast
- `message:reaction` - Reaction event broadcast
- `users:active` - Active user list update
- `disconnect` - User disconnection handling

## Installation & Setup

### 1. Dependencies (Already Installed)

```bash
npm install socket.io socket.io-client
```

### 2. Custom Server Configuration

To enable Socket.io with Next.js, you must use a custom server:

**Update package.json scripts:**

```json
{
  "scripts": {
    "dev": "node server.ts",
    "build": "next build",
    "start": "NODE_ENV=production node server.ts"
  }
}
```

The `server.ts` file at the project root handles:

- HTTP server creation
- Socket.io initialization
- Real-time event handling
- User connection management

### 3. Environment Variables (Optional)

Add to `.env.local`:

```env
# Socket.io endpoint (optional, defaults to same origin)
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000

# App URL for CORS
NEXT_PUBLIC_APP_URL=http://localhost:3000

# API URL
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 4. Running the Application

**Development:**

```bash
npm run dev
```

The server will start on `http://localhost:3000` with:

- Next.js app
- Socket.io server
- Real-time messaging enabled

**Production:**

```bash
npm run build
npm start
```

## Architecture

### Client-Side (messages/page.tsx)

```
MessagesPage
├── Socket.io Connection (useEffect)
├── State Management (messages, channels, DMs)
├── Event Handlers (send, edit, delete, react)
├── Left Sidebar (channels & conversations)
├── Center Chat Area
│   ├── Message List (flex-col-reverse for auto-scroll)
│   ├── MessageBubble Components
│   └── Message Input
└── Right Profile Panel
```

### Server-Side (server.ts)

```
HTTP Server
└── Socket.io Server
    ├── Connection Handler
    ├── User Management (activeUsers Map)
    ├── Event Listeners
    │   ├── message:send
    │   ├── message:edit
    │   ├── message:delete
    │   ├── message:reaction
    │   └── disconnect
    └── Broadcasting
```

### Message Bubble Component (MessageBubble.tsx)

```
MessageBubble
├── Conditional Rendering (deleted messages)
├── Avatar (left for others, right for self)
├── Message Content
│   ├── Editing Mode
│   ├── Display Mode with Actions
│   ├── Attachments
│   └── Reactions
├── Action Buttons (hover)
│   ├── React (emoji picker)
│   ├── Reply
│   ├── Edit (own messages)
│   └── Delete (own messages)
├── Emoji Picker
├── Reactions Display
└── Timestamp
```

## Real-Time Flow Example

### Sending a Message

1. User types and clicks Send
2. Frontend sends POST to `/api/channels/{id}/messages`
3. Message saved to database
4. API returns saved message object
5. Frontend displays message immediately
6. Frontend emits `message:send` via Socket.io
7. Server broadcasts to other connected users
8. Other clients receive `message:new` event
9. Message appears in their chat in real-time

### Editing a Message

1. User clicks edit button on their message
2. Message enters edit mode with input field
3. User modifies and clicks save
4. Frontend sends PUT to `/api/messages/{id}`
5. Database updates with new content and `isEdited: true`
6. Frontend updates local state immediately
7. Frontend emits `message:edit` via Socket.io
8. Server broadcasts to all users
9. Other clients update the message in real-time with "(edited)" indicator

### Adding a Reaction

1. User hovers over message and clicks emoji button
2. Emoji picker appears with 7 preset emojis
3. User selects emoji
4. Frontend sends POST to `/api/messages/{id}/reactions`
5. Database adds reaction entry
6. Frontend updates local reactions array
7. Frontend emits `message:reaction` via Socket.io
8. Server broadcasts to all users
9. Other clients see the new reaction added with count

## Features Checklist

### ✅ Completed

- [x] 3-column layout (sidebar, chat, profile)
- [x] Message alignment (right for sent, left for received)
- [x] Auto-scroll to bottom (flex-col-reverse)
- [x] Channel/DM switching
- [x] Message sending (channels & DMs)
- [x] Message editing
- [x] Message deletion
- [x] Emoji reactions
- [x] Reply threading (parentMessageId)
- [x] Message search/filtering
- [x] User status display (online/offline/last active)
- [x] Task progress visualization (managers/admins)
- [x] Loading states
- [x] Error notifications
- [x] Socket.io real-time events
- [x] User authentication
- [x] Active user tracking

### 📋 Optional Enhancements

- [ ] Typing indicators ("User is typing...")
- [ ] Read receipts (message seen status)
- [ ] Voice messages
- [ ] Video call integration
- [ ] File/image uploads
- [ ] Pinned messages
- [ ] Message reactions with custom emojis
- [ ] Channel notifications settings
- [ ] Message forwarding
- [ ] Mention notifications (@username)
- [ ] Message translations
- [ ] Dark mode

## Troubleshooting

### Socket.io Connection Issues

**Issue: "Cannot POST to Socket.io endpoint"**

- Ensure `server.ts` is running with `npm run dev`
- Check that port 3000 is not blocked

**Issue: "Socket.io client fails to connect"**

- Verify `socket.io-client` is installed
- Check browser console for CORS errors
- Ensure NEXT_PUBLIC_SOCKET_URL is set correctly

**Issue: "Messages not appearing in real-time"**

- Verify Socket.io connection in browser DevTools
- Check server logs for event handling
- Ensure Socket.io event names match between client and server

### Message API Issues

**Issue: "Failed to send message"**

- Verify API endpoint exists and is working
- Check that user authentication is correct
- Ensure database has required tables
- Check server logs for errors

**Issue: "Edit/Delete not working"**

- Verify PUT/DELETE endpoints exist
- Check that message belongs to current user (for edit/delete)
- Verify message ID is being sent correctly

## Database Schema Notes

Ensure your database has these fields for messages:

- `id` (primary key)
- `content` (text)
- `isEdited` (boolean, default: false)
- `isDeleted` (boolean, default: false)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)
- `senderId` (foreign key to users)
- `channelId` (foreign key to channels, nullable)
- `parentMessageId` (foreign key to messages, nullable for threading)

Reactions table:

- `id` (primary key)
- `messageId` (foreign key to messages)
- `userId` (foreign key to users)
- `emoji` (string)
- `createdAt` (timestamp)

Attachments table:

- `id` (primary key)
- `messageId` (foreign key to messages)
- `url` (string)
- `fileName` (string)
- `fileSize` (number)
- `mimeType` (string)

## Performance Optimization

### Client-Side

- Messages are filtered in real-time on search (useState)
- Reactions are deduplicated by emoji
- Images are lazy-loaded
- Socket.io reconnects automatically with exponential backoff

### Server-Side

- Active users stored in memory (Map)
- Socket.io namespaces can be used for channel isolation
- Consider Redis for scaling beyond single instance
- Message history fetched with limit (100 messages by default)

## Security Notes

### Currently Implemented

- User authentication via session
- User ID verification for edit/delete operations
- CORS configuration for Socket.io

### Recommended Additional Security

- Add rate limiting to message endpoints
- Validate message content length
- Implement message moderation
- Add user roles for channel access control
- Encrypt sensitive data in transit
- Add audit logging for deletions
- Implement XSS protection on message content

## API Integration Checklist

Ensure these API endpoints exist and work correctly:

```typescript
// POST /api/channels/[id]/messages
// Body: { channelId, content, userId, parentMessageId? }
// Returns: { message: Message }

// POST /api/direct-messages/send
// Body: { recipientId, content, senderId, parentMessageId? }
// Returns: { message: Message }

// PUT /api/messages/[id]
// Body: { content }
// Returns: { message: Message }

// DELETE /api/messages/[id]
// Returns: { success: true }

// POST /api/messages/[id]/reactions
// Body: { emoji }
// Returns: { reaction: Reaction }

// GET /api/messages?channelId=[id]&limit=100
// Returns: { messages: Message[] }

// GET /api/direct-messages?userId=[id]
// Returns: { messages: Message[] }

// GET /api/channels?userId=[id]
// Returns: { channels: Channel[] }

// GET /api/tasks?userId=[id]
// Returns: { tasks: Task[] }
```

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review browser console and server logs
3. Verify all dependencies are installed correctly
4. Ensure database is properly configured
5. Check that API endpoints are returning correct data formats

---

**Last Updated:** January 15, 2026
**Version:** 1.0.0
