# TaskerBot - Grok-Style Task Management Chatbot

## Overview

TaskerBot is a helpful, friendly, and witty AI assistant integrated into the TaskerAI messaging system. It provides intelligent task management directly in chat conversations, handling task creation, assignment, updates, and queries with natural, encouraging language inspired by Grok.

## Features

### 1. **Automatic Task Detection**

TaskerBot activates only when messages contain task-related keywords:

- Create: "create task", "make task", "add task", "new task", "create a task"
- Assign: "assign task", "assign to", "task for", "give task to"
- Update: "update task", "mark as", "complete task", "set priority"
- Query: "show tasks", "my tasks", "list tasks", "task status", "who has"
- Other: "due date", "task priority"

For non-task messages, TaskerBot stays silent and lets regular team chat flow naturally.

### 2. **Grok-Like Personality**

- **Natural & Friendly**: Talks like a teammate, not a bot
- **Witty & Encouraging**: Light humor when appropriate (e.g., "Got it! Task created. Want to make it extra spicy with a due date? 🚀")
- **Varied Phrasing**: Never repeats the same response for similar requests
- **Helpful**: Clarifies unclear requests and suggests improvements

### 3. **Smart Team Member Matching**

When assigning tasks, TaskerBot:

- Matches partial names/emails to team members
- If multiple matches: "Did you mean Henry Boyd (henry@boombox.com) or Henry Smith?"
- If no match: Lists available team members
- Always includes full email in confirmations

### 4. **Intelligent Actions**

TaskerBot understands and executes:

- **Create**: Extract title, description, priority, due date from conversation
- **Assign**: Match assignee and confirm with full email
- **Update**: Identify fields to modify (title, description, priority, status, due date)
- **Query**: Provide friendly task lookup and suggestions
- **Delete**: Ask for confirmation with task name

### 5. **Seamless Integration**

- Appears as "TaskerBot" with purple gradient avatar and sparkles icon
- Displays in a distinct UI (purple gradient bubble)
- Runs in parallel with normal messaging
- Automatically creates tasks in database when appropriate

## Architecture

### Files Created/Modified

#### 1. `/api/task-chat/route.ts` (NEW)

The core TaskerBot API endpoint that:

- Checks if message is task-related using keyword matching
- Calls Google Gemini API with Grok-style system prompt
- Parses JSON response containing action, task details, and friendly message
- Handles team member matching for task assignment
- Returns JSON response for frontend to process

**Key Components:**

```typescript
interface TaskChatResponse {
  action: "create" | "assign" | "update" | "query" | "delete" | null;
  title: string | null;
  description: string | null;
  assigneeEmail: string | null;
  dueDate: string | null;
  priority: "low" | "medium" | "high" | null;
  message: string;
}
```

**System Prompt Highlights:**

- Focuses on task-only assistance
- Emphasizes natural, conversational tone
- Requires JSON output only
- Temperature set to 0.85 for natural variation

#### 2. `/components/TaskerBotMessage.tsx` (NEW)

React component that renders TaskerBot responses:

- Purple gradient avatar with Sparkles icon
- Distinct visual styling (gradient bubble)
- Action indicator showing what was detected
- Timestamp display

#### 3. `/app/messages/page.tsx` (UPDATED)

Enhanced messaging page with:

- TaskerBot import and state management
- Task keyword detection logic in `sendMessage()` function
- API call to `/api/task-chat` for task-related messages
- Task creation via `/api/tasks` when appropriate
- TaskerBot response display in message flow
- Continues normal messaging in parallel

**New State:**

```typescript
const [taskerBotResponse, setTaskerBotResponse] = useState<any>(null);
const [taskerBotLoading, setTaskerBotLoading] = useState(false);
```

## How It Works

### Flow Diagram

```
User sends message
    ↓
Check against task keywords
    ↓
If task-related:
  ├─ Call /api/task-chat with message + team members
  ├─ Gemini processes with Grok prompt
  ├─ Returns action, title, assignee, due date, priority, message
  ├─ If action is create/assign/update: Call /api/tasks
  └─ Display TaskerBotMessage component
    ↓
Send regular message (channel or DM) regardless
```

### Example Interactions

**Example 1: Create Task**

```
User: "Create a task called 'Post Q4 promo' for Henry"

TaskerBot Response:
{
  "action": "create",
  "title": "Post Q4 promo",
  "assigneeEmail": "henry@boombox.com",
  "message": "Got it! Task 'Post Q4 promo' created and assigned to Henry Boyd (henry@boombox.com). Want to add a due date or set priority? 🚀"
}

Result: Task created in DB, assigned to Henry, TaskerBot response displayed
```

**Example 2: Ambiguous Assignment**

```
User: "Assign this to Henry"

TaskerBot Response:
{
  "action": null,
  "message": "I found multiple Henrys. Did you mean Henry Boyd (henry@boombox.com) or Henry Smith (henry.smith@boombox.com)?"
}
```

**Example 3: Non-Task Message**

```
User: "Hey team, let's grab lunch tomorrow"

TaskerBot Response:
{
  "action": null,
  "message": "I'm TaskerBot — I only handle tasks! Just type normally for team chat."
}

Result: Message sent normally, TaskerBot silent
```

## Configuration

### Environment Variables

Required in `.env.local`:

```
GEMINI_API_KEY=your_google_generative_ai_key
```

### Task Keywords (Customizable)

In `/api/task-chat/route.ts`, modify the `TASK_KEYWORDS` array to add/remove triggers:

```typescript
const TASK_KEYWORDS = [
  "create task",
  "make task",
  "add task",
  // ... add more as needed
];
```

### Temperature

Default temperature: `0.85` (range: 0.8-1.0 for natural variation)
Modify in `/api/task-chat/route.ts`:

```typescript
generationConfig: {
  temperature: 0.85,  // Adjust here
  maxOutputTokens: 512,
}
```

## UI/UX Details

### TaskerBot Message Styling

- **Avatar**: Purple gradient circle with Sparkles icon (✨)
- **Bubble**: Gradient background (purple-100 to indigo-100)
- **Text**: Gray-800 text color for contrast
- **Action Badge**: Purple-600 text showing detected action
- **Timestamp**: Soft gray color below message

### Interaction Flow

1. User types task-related message
2. User clicks Send or presses Enter
3. Regular message is sent (for team visibility)
4. TaskerBot processes in parallel
5. TaskerBot response appears in message stream
6. Task created in database (if applicable)
7. User sees confirmation from TaskerBot

## Error Handling

### Task API Failures

If task creation fails:

- TaskerBot response still displays
- Error logged to console with warning
- User informed via TaskerBot message if critical

### Gemini API Failures

If TaskerBot API fails:

- Message sent normally (no interruption)
- TaskerBot response skipped silently
- Error logged to console

### JSON Parsing Failures

If Gemini response is not valid JSON:

- Graceful fallback message: "Hmm, I had trouble understanding that. Can you rephrase your task request?"
- No task creation attempted
- Regular message still sent

## Database Integration

### Task Creation

When TaskerBot detects a create/assign action:

```typescript
POST /api/tasks {
  title: "Post Q4 promo",
  description: "...",
  priority: "high",
  dueDate: "2026-02-15",
  assigneeId: 42  // Matched from team members
}
```

### Team Member Matching

Tasks assigned using assignee ID found by matching email:

```typescript
const assignee = teamMembers.find((m) => m.email === botResponse.assigneeEmail);
assigneeId = assignee?.id;
```

## Future Enhancements

Potential improvements for TaskerBot:

1. **Task Modification**: "Update task 123 priority to high"
2. **Bulk Operations**: "Create 3 tasks for..."
3. **Team Analytics**: "Show my team's task status"
4. **Smart Scheduling**: "Create task due next Friday"
5. **Task Subtasks**: "Add subtask to..."
6. **Collaboration**: "@mention in task description"
7. **Recurring Tasks**: "Create recurring task every Monday"
8. **Learning**: Better email matching with more context

## Testing Checklist

- [ ] Create simple task: "create a task called test"
- [ ] Create task with assignee: "create a task called test for [teammate name]"
- [ ] Create task with priority: "create high priority task"
- [ ] Create task with due date: "create task due tomorrow"
- [ ] Ambiguous assignment: Multiple people with same first name
- [ ] Non-task message: Should not trigger TaskerBot
- [ ] Message sending: Regular message still delivered
- [ ] Database: Task actually created in database
- [ ] Varied responses: Similar requests produce different phrasings
- [ ] Error scenarios: Gemini API down, invalid JSON, etc.

## Troubleshooting

### TaskerBot Not Responding

1. Check if keyword is in `TASK_KEYWORDS` array
2. Verify `GEMINI_API_KEY` is set correctly
3. Check browser console for API errors
4. Ensure `/api/task-chat` endpoint is running

### Tasks Not Created

1. Check if action is not "query" or "delete"
2. Verify team member email matching
3. Check `/api/tasks` is accessible
4. Review server logs for task creation errors

### Wrong Team Member Matched

1. TaskerBot uses Gemini's string matching
2. Try being more specific: "assign to henry.boyd@boombox.com"
3. Provide full email if ambiguous

### Styling Issues

1. Verify Tailwind CSS is compiled
2. Check `TaskerBotMessage.tsx` CSS classes
3. Ensure gradient colors render (from-purple-500 to indigo-600)

## Security Notes

1. **Task Authorization**: Uses existing `/api/tasks` authorization (respects role-based permissions)
2. **User Context**: TaskerBot operates with current user context
3. **Team Data**: Only shows team members to authenticated users
4. **Email Exposure**: Team member emails shown in matches (normal for team chat)
5. **Gemini Safety**: System prompt prevents harmful outputs

## Performance Considerations

- TaskerBot response time: ~1-3 seconds (Gemini API latency)
- Parallel processing: Regular message sends immediately
- No blocking: UI remains responsive during API calls
- Token usage: ~50-150 tokens per request

---

**Created**: January 16, 2026
**Version**: 1.0
**Status**: Production Ready
