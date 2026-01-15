# TaskerBot Quick Reference Guide

## 🚀 Quick Start

### For End Users

1. Type a task request: "create a task called design homepage"
2. Hit Send
3. Your message appears in chat
4. TaskerBot responds with confirmation
5. Task is created automatically

### For Developers

**Add TaskerBot to a conversation:**

1. Message includes task keyword → Auto-triggers
2. `/api/task-chat` processes request
3. Response parsed and displayed
4. No additional code needed

## 📋 Task Keywords That Trigger TaskerBot

```
Create: create task, make task, add task, new task, create a task, add a task
Assign: assign task, assign to, task for, give task to
Update: update task, mark as, complete task, finish task, set priority
Query: show tasks, my tasks, list tasks, task status, who has
Other: due date, task priority
```

## 🔧 API Reference

### POST /api/task-chat

**Request:**

```json
{
  "message": "create a task called design homepage for henry",
  "teamMembers": [
    {
      "id": 1,
      "firstName": "Henry",
      "lastName": "Boyd",
      "email": "henry@boombox.com"
    },
    {
      "id": 2,
      "firstName": "Martha",
      "lastName": "Garcia",
      "email": "martha@boombox.com"
    }
  ],
  "userId": 5
}
```

**Response:**

```json
{
  "action": "create",
  "title": "Design homepage",
  "description": null,
  "assigneeEmail": "henry@boombox.com",
  "dueDate": null,
  "priority": null,
  "message": "Got it! Task 'Design homepage' created and assigned to Henry Boyd (henry@boombox.com). Want to add a due date? 🚀"
}
```

**Possible Actions:**

- `"create"` - Create new task
- `"assign"` - Assign existing task
- `"update"` - Update task details
- `"query"` - Look up tasks
- `"delete"` - Delete task
- `null` - Not a task request

## 🎨 UI Components

### TaskerBotMessage Component

```tsx
<TaskerBotMessage
  message="Got it! Task created. 🚀"
  action="create"
  timestamp="2:45 PM"
/>
```

**Props:**

- `message` (string, required): Bot's response
- `action` (string | null): Action type
- `timestamp` (string): Time of response

## 📝 Response Examples

### Create Task

```
User: "Create task 'Post Q4 promo' for henry"
Bot: "Got it! Task 'Post Q4 promo' created and assigned to Henry Boyd (henry@boombox.com). Want to add a due date or set priority? 🚀"
```

### Assign Task

```
User: "Assign 'Finalize budget' to martha"
Bot: "All set! 'Finalize budget' assigned to Martha Garcia (martha@boombox.com). 💪"
```

### Show Tasks

```
User: "Show my tasks"
Bot: "Fetching your tasks now... Want to see them sorted by due date or priority?"
```

### Non-Task Message

```
User: "How's everyone doing?"
Bot: [Silent - no response]
```

### Ambiguous Assignment

```
User: "Assign to Henry"
Bot: "I found multiple Henrys. Did you mean Henry Boyd (henry@boombox.com) or Henry Smith (henry.smith@boombox.com)?"
```

## 🔌 Integration Points

### In Messages Page

```typescript
// 1. Import component
import { TaskerBotMessage } from "@/app/components/TaskerBotMessage";

// 2. Add state
const [taskerBotResponse, setTaskerBotResponse] = useState<any>(null);
const [taskerBotLoading, setTaskerBotLoading] = useState(false);

// 3. In sendMessage() function
if (isTaskRelated) {
  const botRes = await fetch("/api/task-chat", { ... });
  setTaskerBotResponse(await botRes.json());
}

// 4. Display in message stream
{taskerBotResponse && <TaskerBotMessage {...} />}
```

### Task Keyword Detection

```typescript
const taskKeywords = [
  "create task", "assign task", "update task", ...
];
const isTaskRelated = taskKeywords.some(k =>
  message.toLowerCase().includes(k)
);
```

### Creating Tasks

```typescript
if (botResponse.action === "create") {
  await fetch("/api/tasks", {
    method: "POST",
    body: JSON.stringify({
      title: botResponse.title,
      description: botResponse.description,
      priority: botResponse.priority,
      dueDate: botResponse.dueDate,
      assigneeId: findTeamMemberIdByEmail(botResponse.assigneeEmail),
    }),
  });
}
```

## 🎯 Configuration

### Task Keywords (in `/api/task-chat/route.ts`)

```typescript
const TASK_KEYWORDS = [
  "create task",
  "make task",
  "add task",
  // Add more keywords here
];
```

### Gemini Settings (in `/api/task-chat/route.ts`)

```typescript
generationConfig: {
  temperature: 0.85,      // 0.8-1.0 for variation
  maxOutputTokens: 512,   // Adjust if needed
}
```

### System Prompt (in `/api/task-chat/route.ts`)

Located in `systemPrompt` variable - modify tone/instructions here

## 📊 File Structure

```
src/app/
├── api/
│   └── task-chat/
│       └── route.ts              ← TaskerBot API
├── components/
│   └── TaskerBotMessage.tsx       ← Bot message UI
└── messages/
    └── page.tsx                   ← Updated messaging page

docs/
├── TASKBOT_README.md              ← Full documentation
└── TASKBOT_IMPLEMENTATION.md      ← Implementation details
```

## 🛠️ Troubleshooting

| Issue                      | Solution                                                      |
| -------------------------- | ------------------------------------------------------------- |
| TaskerBot not responding   | Check task keyword is in TASK_KEYWORDS array                  |
| Task not created           | Verify /api/tasks endpoint works, check user role permissions |
| Wrong team member matched  | Use full email: "assign to henry@boombox.com"                 |
| TaskerBot only shows error | Check GEMINI_API_KEY environment variable                     |
| Message not sending        | Verify channel/DM recipient selected                          |
| Styling issues             | Ensure Tailwind CSS is compiled, check gradient classes       |

## 📈 Performance

- **Response Time**: 1-3 seconds (Gemini API)
- **Token Usage**: ~50-150 tokens per request
- **Message Latency**: <100ms (non-blocking)
- **Database**: Standard Prisma latency
- **UI**: Responsive during bot processing

## 🔒 Security

✅ Respects user authentication
✅ Uses existing role-based task permissions
✅ Team member data only visible to authenticated users
✅ Emails shown only in chat (normal context)
✅ System prompt prevents harmful outputs
✅ All API requests validated

## 📞 Support

**Questions about TaskerBot?**

- See `TASKBOT_README.md` for full docs
- Check `TASKBOT_IMPLEMENTATION.md` for technical details
- Review `/api/task-chat/route.ts` for system prompt
- Check `/components/TaskerBotMessage.tsx` for UI

**Common Issues:**

1. "I'm TaskerBot — I only handle tasks!" = Message not task-related
2. "Did you mean..." = Ambiguous team member name
3. "I found multiple..." = Same issue, ask for clarification
4. "Hmm, I had trouble..." = Invalid request or parsing error

## 🚀 Future Enhancements

- [ ] Task modification in chat
- [ ] Bulk task operations
- [ ] Smart date parsing ("next Friday", "tomorrow")
- [ ] Recurring tasks
- [ ] Task dependencies
- [ ] Team analytics queries
- [ ] Integration with Google Calendar
- [ ] Slack-style slash commands

---

**Last Updated**: January 16, 2026
**Version**: 1.0.0
