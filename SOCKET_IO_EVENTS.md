# Socket.io Events Reference

## Client → Server Events

### `user:join`

Emitted when user connects and authenticates.

**Data:**

```typescript
{
  userId: string | number; // User ID from session
  userName: string; // User's display name
}
```

**Server Response:**

- Adds user to activeUsers map
- Broadcasts `users:active` event to all clients

---

### `message:send`

Emitted when user sends a new message.

**Data:**

```typescript
{
  channelId?: number;            // For channel messages
  recipientId?: number;          // For direct messages
  message: {
    id: number;
    content: string;
    senderId: number;
    sender: {
      id: number;
      firstName: string;
      lastName: string;
      profilePicture?: string;
    };
    createdAt: string;
    isEdited: false;
    reactions?: [];
    attachments?: string[];
    parentMessageId?: number;
  };
}
```

**Server Behavior:**

- If `channelId`: broadcasts to all users
- If `recipientId`: sends only to target user
- Stores in database via API

---

### `message:edit`

Emitted when user edits their message.

**Data:**

```typescript
{
  messageId: number;
  content: string;
}
```

**Server Response:**

- Broadcasts edited message to all clients
- Clients display with "(edited)" indicator

---

### `message:delete`

Emitted when user deletes their message.

**Data:**

```typescript
{
  messageId: number;
}
```

**Server Response:**

- Broadcasts deletion to all clients
- Clients mark message as deleted (hidden from view)

---

### `message:reaction`

Emitted when user adds emoji reaction to message.

**Data:**

```typescript
{
  messageId: number;
  emoji: string; // Single emoji character
}
```

**Server Response:**

- Identifies user from socket mapping
- Broadcasts reaction to all clients
- Clients add to reactions array with user ID

---

## Server → Client Events

### `message:new`

Received when another user sends a direct message to current user.

**Data:**

```typescript
{
  id: number;
  content: string;
  senderId: number;
  sender: { /* user object */ };
  createdAt: string;
  isEdited: boolean;
  reactions?: Array<{ emoji: string; userId: number }>;
  attachments?: string[];
  parentMessageId?: number;
}
```

**Client Action:**

- Adds message to messages state
- Triggers auto-scroll to bottom
- Updates filtered messages if search active

---

### `message:edited`

Received when any user edits a message.

**Data:**

```typescript
{
  id: number;
  content: string;
  isEdited: true;
}
```

**Client Action:**

- Updates message in state
- Displays "(edited)" indicator
- Updates filtered messages if applicable

---

### `message:deleted`

Received when any user deletes a message.

**Data:**

```typescript
number; // Message ID to delete
```

**Client Action:**

- Marks message as `isDeleted: true`
- Removes from display (shows "Message unsent")
- Updates filtered messages

---

### `message:reaction`

Received when any user adds reaction to message.

**Data:**

```typescript
{
  messageId: number;
  emoji: string;
  userId: string | number;
}
```

**Client Action:**

- Adds reaction to reactions array
- Aggregates reactions by emoji
- Updates reaction count display
- Shows reaction toggle state if current user reacted

---

### `users:active`

Broadcasts updated list of active user IDs.

**Data:**

```typescript
string[];  // Array of active user IDs
```

**Client Action:**

- Updates user online status
- Used for DM conversation status display
- Can be extended for typing indicators

---

### `connect`

Native Socket.io event when client connects.

**Client Action:**

- Logs connection
- Emits `user:join` event with user data

---

### `disconnect`

Native Socket.io event when client disconnects.

**Server Action:**

- Removes user from activeUsers map
- Broadcasts updated `users:active` list

---

## Implementation Example

### Frontend (messages/page.tsx)

```typescript
// Initialize connection
useEffect(() => {
  socketRef.current = io(undefined, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  const socket = socketRef.current;

  socket.on("connect", () => {
    socket.emit("user:join", {
      userId: currentUser.id,
      userName: `${currentUser.firstName} ${currentUser.lastName}`,
    });
  });

  socket.on("message:new", (newMessage) => {
    setMessages((prev) => [...prev, newMessage]);
  });

  socket.on("message:edited", (editedMessage) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === editedMessage.id ? editedMessage : msg))
    );
  });

  // ... other listeners

  return () => socket.disconnect();
}, [currentUser]);

// Send message
const sendMessage = async () => {
  const response = await fetch(`/api/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content, userId: currentUser.id }),
  });

  const { message } = await response.json();
  setMessages((prev) => [...prev, message]);

  // Broadcast to other clients
  socketRef.current?.emit("message:send", {
    channelId,
    message,
  });
};
```

### Backend (server.ts)

```typescript
io.on("connection", (socket) => {
  socket.on("user:join", (data) => {
    activeUsers.set(data.userId, socket.id);
    io.emit("users:active", Array.from(activeUsers.keys()));
  });

  socket.on("message:send", (data) => {
    if (data.channelId) {
      io.emit(`channel:${data.channelId}:message`, data.message);
    } else if (data.recipientId) {
      const recipientSocketId = activeUsers.get(String(data.recipientId));
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("message:new", data.message);
      }
    }
  });

  socket.on("message:edit", (data) => {
    io.emit("message:edited", {
      id: data.messageId,
      content: data.content,
      isEdited: true,
    });
  });

  // ... other handlers

  socket.on("disconnect", () => {
    const userId = Array.from(activeUsers.entries()).find(
      ([_, id]) => id === socket.id
    )?.[0];
    if (userId) {
      activeUsers.delete(userId);
      io.emit("users:active", Array.from(activeUsers.keys()));
    }
  });
});
```

---

## Debugging Tips

### Enable Socket.io Debugging

**Browser Console:**

```javascript
localStorage.debug = "*"; // Enable all debug logs
```

### Common Event Names to Watch

- `connect` - Client connects
- `disconnect` - Client disconnects
- `message:send` - Message sent
- `message:new` - New message received
- `message:edited` - Message edited
- `message:deleted` - Message deleted
- `message:reaction` - Reaction added
- `users:active` - User list updated

### Check Server Logs

Look for Socket.io connection messages:

```
[Socket.io] User connected: [socketId]
[Socket.io] User [userId] ([userName]) authenticated
[Socket.io] Message sent to channel [channelId]
[Socket.io] User [userId] disconnected
```

### DevTools Network Tab

- Look for WebSocket connection to `ws://localhost:3000/socket.io/`
- Monitor frame content for emitted events
- Check message payload structure

---

## Event Flow Diagram

```
User A                          Server                          User B
  |                               |                               |
  |--- connect ----------------->|                               |
  |                               |                               |
  |--- user:join ----------------->|                               |
  |                               |<------ users:active --------|
  |                               |                               |
  |                          [User B comes online]                |
  |                               |<------ users:active ---------|
  |                               |                               |
  |--- message:send ------------->|                               |
  |     (content, recipientId)    |                               |
  |                               |--- message:new ---------->|
  |                               |     (full message obj)   |
  |<------ [immediate display]    |   [display in chat]      |
  |                               |                               |
  |--- message:edit ------------->|                               |
  |     (messageId, newContent)   |                               |
  |                               |--- message:edited ------->|
  |<------ [show edited]          |     (messageId, content) |
  |                               |   [update in chat]       |
  |                               |                               |
  |--- message:reaction --------->|                               |
  |     (messageId, emoji)        |                               |
  |                               |--- message:reaction ---->|
  |<------ [add emoji btn]        |     (messageId, emoji)   |
  |                               |   [add reaction]         |
  |                               |                               |
  |--- disconnect ----------------->|                               |
  |                               |--- users:active ------->|
  |                               |   (User A offline)      |
  |                          [connection closed]                  |
```

---

**Socket.io Docs:** https://socket.io/docs/
**Version:** Socket.io v4+
**Last Updated:** January 15, 2026
