# TaskerBot Architecture & Flow Diagrams

## 1. Overall System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TaskerAI Application                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐                      ┌──────────────────────┐    │
│  │  Messages Page   │                      │   Task Management    │    │
│  │  /messages       │◄─────────────────────►│   /tasks, /api       │    │
│  └────────┬─────────┘                      └──────────────────────┘    │
│           │                                                              │
│           │ (1) Message with keywords                                   │
│           │                                                              │
│           ▼                                                              │
│  ┌──────────────────────────────────────────┐                          │
│  │  TaskerBot Integration Layer             │                          │
│  │  ┌────────────────────────────────────┐  │                          │
│  │  │ Task Keyword Detection (24 keys)   │  │                          │
│  │  └────────────────────────────────────┘  │                          │
│  │  ┌────────────────────────────────────┐  │                          │
│  │  │ /api/task-chat Handler             │  │ (2) Process request    │
│  │  │ - Extract intent                   │  │                          │
│  │  │ - Get team members                 │  │                          │
│  │  │ - Call Gemini API                  │  │                          │
│  │  │ - Parse JSON response              │  │                          │
│  │  └────────────────────────────────────┘  │                          │
│  └───────┬────────────────┬──────────────────┘                          │
│          │                │                                              │
│  (3a)    │                │    (3b) If action                           │
│  Display │                │    needed: create                           │
│  TaskerBot               │    task in DB                               │
│  Message │                │                                              │
│          ▼                ▼                                              │
│  ┌──────────────┐  ┌─────────────────┐                                 │
│  │ TaskerBot    │  │ /api/tasks POST │                                 │
│  │ Component    │  │ Create in DB    │                                 │
│  └──────────────┘  └─────────────────┘                                 │
│          │                │                                              │
│          └────────┬───────┘                                              │
│                   │                                                      │
│                   ▼                                                      │
│           ┌──────────────────┐                                          │
│           │  Display in Chat │                                          │
│           │  (TaskerBot +    │                                          │
│           │   Regular Msgs)  │                                          │
│           └──────────────────┘                                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         External Services                                │
├─────────────────────────────────────────────────────────────────────────┤
│  Google Generative AI (Gemini API)                                      │
│  ├─ Model: gemini-pro                                                   │
│  ├─ Temperature: 0.85 (natural variation)                               │
│  ├─ System Prompt: Grok-style behavior                                  │
│  └─ Response: JSON with action, title, assignee, priority, message      │
│                                                                          │
│  PostgreSQL Database (via Prisma)                                       │
│  ├─ Task table (id, title, assignee, priority, dueDate, etc)            │
│  ├─ User table (id, email, firstName, lastName)                         │
│  └─ Supports task creation with full persistence                        │
└─────────────────────────────────────────────────────────────────────────┘
```

## 2. Message Processing Flow

```
User Input
    │
    ▼
[Message: "create task 'design home' for henry"]
    │
    ├─ Check if contains task keyword
    │  ├─ "create task" ✓ FOUND
    │  │
    │  ▼
    │  isTaskRelated() = true
    │
    ▼
setTaskerBotLoading(true)
    │
    ▼
Fetch Team Members
    │  GET /api/users
    │  ↓
    │  Returns: [{id, firstName, lastName, email}, ...]
    │
    ▼
Call TaskerBot API
    │  POST /api/task-chat
    │  Request: {message, teamMembers, userId}
    │
    │  ┌──────────────────────────────────┐
    │  │   Gemini Processing               │
    │  │                                   │
    │  │ 1. Receive message                │
    │  │ 2. Apply system prompt (Grok)     │
    │  │ 3. Extract intent & entities      │
    │  │ 4. Match assignee to team member  │
    │  │ 5. Build JSON response            │
    │  │ 6. Return JSON                    │
    │  └──────────────────────────────────┘
    │
    │  Response: {
    │    action: "create",
    │    title: "design home",
    │    assigneeEmail: "henry@boombox.com",
    │    priority: null,
    │    dueDate: null,
    │    message: "Got it! Task created... 🚀"
    │  }
    │
    ▼
Parse & Validate JSON
    │
    ├─ Valid JSON ✓
    │  ├─ setTaskerBotResponse(data)
    │  └─ setTaskerBotLoading(false)
    │
    └─ Invalid JSON ✗
       └─ Show error message
    │
    ▼
Check Action Type
    │
    ├─ action === "create" or "assign" or "update"
    │  │
    │  ▼
    │  POST /api/tasks
    │  {
    │    title: "design home",
    │    assigneeId: 5,  // found by matching henry@boombox.com
    │    priority: null,
    │    dueDate: null
    │  }
    │  │
    │  ▼
    │  Task Created in Database ✓
    │
    └─ action === null or "query" or "delete"
       └─ Skip task creation
    │
    ▼
Send Regular Message (DM or Channel)
    │  POST /api/channels/{id}/messages
    │  or
    │  POST /api/direct-messages/send
    │
    ▼
Display in Message Stream
    │
    ├─ TaskerBotMessage Component
    │  ├─ Purple avatar with ✨
    │  ├─ Gradient bubble (purple/indigo)
    │  ├─ Action badge
    │  └─ Timestamp
    │
    └─ Regular MessageBubble
       ├─ User avatar
       ├─ Standard styling
       └─ Reactions/replies
    │
    ▼
Display Complete ✓
```

## 3. Team Member Matching Algorithm

```
Input: "assign to henry"
    │
    ▼
Fetch team members from /api/users
    │
    ├─ Henry Boyd (henry@boombox.com)
    ├─ Henry Smith (henry.smith@boombox.com)
    └─ Martha Garcia (martha@boombox.com)
    │
    ▼
Extract name from message
    │  "assign to [henry]"
    │  Name detected: "henry"
    │
    ▼
Perform matching
    │
    ├─ Exact match on firstName?
    │  ├─ YES: henry → matches "Henry Boyd" AND "Henry Smith"
    │  │      → MULTIPLE MATCHES
    │  │
    │  └─ NO: Continue
    │
    ├─ Partial match on email?
    │  ├─ YES: henry@... → matches "henry@boombox.com"
    │  │      → SINGLE MATCH → Henry Boyd
    │  │
    │  └─ NO: Continue
    │
    └─ No match?
       → List available members
       → Ask user to specify
    │
    ▼
Return Result
    │
    ├─ Single Match
    │  └─ assigneeEmail: "henry@boombox.com"
    │     message: "Assigned to Henry Boyd (henry@boombox.com)"
    │
    ├─ Multiple Matches
    │  └─ assigneeEmail: null
    │     message: "Found 2 Henrys. Did you mean..."
    │
    └─ No Match
       └─ assigneeEmail: null
          message: "Available: Henry Boyd, Henry Smith, Martha Garcia"
```

## 4. Component Hierarchy

```
App
│
└─ messages/page.tsx (Page Component)
   │
   ├─ State Management
   │  ├─ currentUser: User
   │  ├─ selectedChannel: Channel | null
   │  ├─ selectedDMUser: User | null
   │  ├─ messages: Message[]
   │  ├─ messageInput: string
   │  ├─ taskerBotResponse: TaskChatResponse | null
   │  └─ taskerBotLoading: boolean
   │
   ├─ Left Sidebar
   │  ├─ Channels List
   │  │  └─ New Channel Button
   │  └─ DM Conversations List
   │
   ├─ Center Chat Area
   │  ├─ Chat Header
   │  │  └─ Channel/User Info
   │  │
   │  ├─ Messages Container
   │  │  ├─ TaskerBotMessage
   │  │  │  ├─ Purple Avatar + Sparkles
   │  │  │  ├─ Gradient Bubble
   │  │  │  ├─ Action Badge
   │  │  │  └─ Timestamp
   │  │  │
   │  │  └─ MessageBubble (x multiple)
   │  │     ├─ User Avatar
   │  │     ├─ Message Content
   │  │     ├─ Reactions
   │  │     └─ Edit/Delete Menu
   │  │
   │  └─ Message Input Area
   │     ├─ TextArea (multiline)
   │     └─ Send Button
   │
   └─ Right Sidebar (Profile/Info)
      ├─ User/Channel Profile
      ├─ Member List (if channel)
      └─ Task Progress (if DM user)
```

## 5. Data Flow: Create Task

```
User Message
    "create task 'Post Q4' for henry with high priority"
    │
    ▼
messages/page.tsx sendMessage()
    │
    ├─ Detect "create task" keyword ✓
    ├─ setTaskerBotLoading(true)
    │
    ▼
Fetch team members
    │  GET /api/users
    │  [{id:1, firstName:"Henry", lastName:"Boyd", email:"henry@boombox.com"}, ...]
    │
    ▼
POST /api/task-chat
    │  Request: {
    │    message: "create task 'Post Q4' for henry...",
    │    teamMembers: [...],
    │    userId: 5
    │  }
    │
    │  ┌─────────────────────────────────┐
    │  │ Gemini API Processing           │
    │  │                                 │
    │  │ System Prompt (Grok):           │
    │  │ - Extract title: "Post Q4"      │
    │  │ - Detect assignee: henry       │
    │  │ - Detect priority: high        │
    │  │ - Build response                │
    │  └─────────────────────────────────┘
    │
    │  Response: {
    │    action: "create",
    │    title: "Post Q4",
    │    description: null,
    │    assigneeEmail: "henry@boombox.com",
    │    dueDate: null,
    │    priority: "high",
    │    message: "Got it! Task 'Post Q4' created and
    │             assigned to Henry Boyd (henry@boombox.com)..."
    │  }
    │
    ▼
setTaskerBotResponse(data)
setTaskerBotLoading(false)
    │
    ▼
Check if action exists and is create/assign/update
    │  action === "create" ✓
    │
    ▼
POST /api/tasks
    │  Request: {
    │    title: "Post Q4",
    │    description: null,
    │    priority: "high",
    │    dueDate: null,
    │    assigneeId: 1  // henry (matched by email)
    │  }
    │
    │  ┌─────────────────────┐
    │  │ Prisma ORM          │
    │  │ Create task record  │
    │  └─────────────────────┘
    │
    │  Task saved in PostgreSQL ✓
    │
    ▼
Send Regular Message
    │  POST /api/channels/{id}/messages
    │  Content: "create task 'Post Q4' for henry with high priority"
    │
    ▼
Display in Chat
    │
    ├─ TaskerBotMessage
    │  "Got it! Task 'Post Q4' created and assigned to
    │   Henry Boyd (henry@boombox.com). Want to add a
    │   due date? 🚀"
    │
    └─ Regular Message
       "create task 'Post Q4' for henry with high priority"
    │
    ▼
COMPLETE ✓
(Task in DB, Bot responded, Message sent, UI updated)
```

## 6. API Endpoints Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    TaskerBot API Endpoints                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  NEW ENDPOINT:                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ POST /api/task-chat                                     │   │
│  │ ─────────────────────────────────────────────────────── │   │
│  │ Request:                                                │   │
│  │ {                                                       │   │
│  │   message: "create task 'x' for y",                    │   │
│  │   teamMembers: User[],                                 │   │
│  │   userId: number                                       │   │
│  │ }                                                       │   │
│  │                                                         │   │
│  │ Response:                                               │   │
│  │ {                                                       │   │
│  │   action: "create"|"assign"|"update"|"query"|null,    │   │
│  │   title: string|null,                                  │   │
│  │   description: string|null,                            │   │
│  │   assigneeEmail: string|null,                          │   │
│  │   dueDate: ISO string|null,                            │   │
│  │   priority: "low"|"medium"|"high"|null,               │   │
│  │   message: string  (bot response)                      │   │
│  │ }                                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  EXISTING ENDPOINTS (USED):                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ GET /api/users                                          │   │
│  │ Returns: { users: User[] }                              │   │
│  │ Used for: Team member matching, getting team list       │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ POST /api/tasks                                         │   │
│  │ Request: {title, description, priority, dueDate, ...}  │   │
│  │ Returns: { task: Task }                                 │   │
│  │ Used for: Create task when bot detects create action   │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ POST /api/channels/{id}/messages                        │   │
│  │ POST /api/direct-messages/send                          │   │
│  │ Used for: Send regular messages (user message + bot)    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 7. Error Handling Flow

```
API Call to /api/task-chat
    │
    ├─ Network Error (timeout, 5xx)
    │  │
    │  ▼
    │  console.error()
    │  setTaskerBotLoading(false)
    │  → Message still sent (non-blocking)
    │  → TaskerBot silent, no error shown
    │
    ├─ Invalid JSON Response
    │  │
    │  ▼
    │  JSON.parse() fails
    │  │
    │  ▼
    │  Fallback message:
    │  "Hmm, I had trouble understanding that.
    │   Can you rephrase your task request?"
    │  │
    │  ▼
    │  No task created
    │  Message sent normally
    │
    ├─ Task Creation Fails (POST /api/tasks)
    │  │
    │  ▼
    │  Bot response still shown
    │  Task creation skipped
    │  Error logged to console
    │  │
    │  ▼
    │  User sees: "Task 'X' created..." (from bot)
    │  But task not in DB (silent failure)
    │
    └─ Team Member Not Found
       │
       ▼
       Bot asks for clarification:
       "I found 2 Henrys. Did you mean..."

       or

       "Here are our team members: Alice, Bob, Charlie..."
       │
       ▼
       No task created
       User must re-specify
```

## 8. Keyword Detection Pattern

```
User Input Analysis
    │
    ▼
Task Keyword Check
    │
    ├─ CREATE Keywords
    │  ├─ "create task" ──┐
    │  ├─ "make task" ──┐ │
    │  ├─ "add task" ─┐ │ │
    │  ├─ "new task" ─┼─┼─┐
    │  └─ "create a" ─┘ │ │ → All trigger bot
    │                  │ │
    ├─ ASSIGN Keywords  ├─┘
    │  ├─ "assign to" ──┐
    │  ├─ "task for" ─┐ │
    │  └─ "give to" ──┼─┤
    │                 │ │
    ├─ UPDATE Keywords ├─┤
    │  ├─ "mark as" ──┐ │
    │  ├─ "complete" ──┼─┤
    │  └─ "set priority"┘ │
    │                   │
    ├─ QUERY Keywords    │
    │  ├─ "show tasks" ──┐
    │  ├─ "my tasks" ───┼─┤
    │  └─ "task status" ┘ │
    │                   │
    ▼                   │
Case-insensitive match │
message.toLowerCase() │
  .includes(keyword)  │
                      │
                      ▼
            isTaskRelated = true
                      │
                      ▼
            Activate TaskerBot ✓
```

---

**Reference**: These diagrams provide visual understanding of how TaskerBot works internally. Refer back to these when:

- Understanding the flow (Diagram 2)
- Debugging issues (Diagram 7)
- Modifying keyword detection (Diagram 8)
- Learning architecture (Diagram 1)
- Tracing data (Diagram 5)
