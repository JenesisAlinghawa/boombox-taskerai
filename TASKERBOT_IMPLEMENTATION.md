# TaskerBot - Gemini-Powered AI Task Assistant

## Overview

TaskerBot is a Grok-style AI task assistant integrated into TaskerAI using Google Gemini 1.5 Flash. It understands natural language, typos, abbreviations, and creates tasks with intelligent team member matching.

## ✨ Key Features

### 1. **Natural Language Understanding**

- Handles typos: "creaet" → "create"
- Understands abbreviations and incomplete sentences
- Processes all requirements at once
- Interprets natural dates: "tomorrow", "next Friday", "in 3 days"
- Smart team member matching by name or email partial match

### 2. **Grok-Like Personality**

- Super helpful, friendly, encouraging
- Witty when appropriate with light humor
- Varies responses to never sound repetitive
- Conversational and intelligent

### 3. **Core Actions**

- **Create**: New tasks with title, description, priority, due date, assignee
- **Assign**: Add or change task assignee
- **Update**: Modify task details
- **Query**: Ask about tasks
- **Delete**: Remove tasks with confirmation

### 4. **Team Integration**

- Smart team member matching
- Shows full email in confirmations
- Asks clarifying questions if ambiguous
- Lists available members if not found

## 📁 File Structure

### 1. **src/app/components/ui/Chatbot.tsx** (Pure UI Component)

```tsx
- Floating chat button (💬) - bottom right
- Chat window with messages
- Input field for natural language
- Calls /api/task-chat API
- Automatic task creation via /api/tasks
- Loading state with animated dots
```

### 2. **src/app/api/task-chat/route.ts** (Gemini Integration)

```tsx
- Gemini 1.5 Flash model integration
- System prompt with Grok personality
- Temperature 0.85 for natural variation
- JSON mode output enforcement
- Smart due date calculation ("tomorrow", "in 3 days", etc.)
- Team member email matching fallback
- Error handling and graceful fallbacks
```

### 3. **src/app/messages/page.tsx** (Integration Point)

```tsx
- Import and render Chatbot component
- Pass teamMembers as props from DM conversations
- Appears as floating widget on messages page
```

## 🚀 How It Works

### User Flow:

1. User clicks 💬 button (bottom right)
2. Types naturally: "Create a task for fixing bugs assigned to Henry due tomorrow"
3. Message sent to `/api/task-chat`
4. Gemini analyzes using system prompt + team context
5. Returns JSON: `{ action, title, description, assigneeEmail, dueDate, priority, message }`
6. TaskerBot shows friendly confirmation
7. If action is create/assign/update: task saved to `/api/tasks`
8. User sees confirmation with task ID

### API Response Example:

```json
{
  "action": "create",
  "title": "Fix critical bugs",
  "description": "Address reported issues in the app",
  "assigneeEmail": "henry@boombox.com",
  "dueDate": "2026-01-17",
  "priority": "high",
  "message": "Got it! Created 'Fix critical bugs' assigned to Henry Boyd (henry@boombox.com) due tomorrow. Anything else? 🚀"
}
```

## 🔧 System Prompt (The Secret Sauce)

The Gemini system prompt tells it to:

- Be TaskerBot - super smart, friendly, witty AI inspired by Grok
- Understand natural language extremely well (forgiving with typos/abbreviations)
- Only respond to task-related requests
- For non-task messages: "I'm your task assistant — ask me about tasks! 😊"
- Respond naturally with light humor when appropriate
- Always confirm with correct team member emails
- Output ONLY valid JSON

## 📊 Temperature & Model Settings

- **Model**: `gemini-1.5-flash` (fast, capable, cost-effective)
- **Temperature**: `0.85` (natural variation, not too random)
- **Response MIME**: `application/json` (enforces JSON output)
- **Max Tokens**: `500` (enough for response + context)

## 🎨 UI Features

- **Floating Button**: Purple gradient (from-purple-500 to-indigo-600)
- **Sparkles Icon**: Identifies TaskerBot messages
- **Chat Window**: 380x500px, fixed bottom-right
- **Message Bubbles**: Purple for user, gray for bot
- **Loading Animation**: 3 bouncing dots while Gemini processes
- **Tailwind CSS**: Responsive, clean design

## ⚙️ Environment Variables Required

```bash
GEMINI_API_KEY=your_api_key_here
```

Get it from: https://makersuite.google.com/app/apikey

## 🔐 Error Handling

- **Missing API Key**: Returns helpful error message
- **Empty Response**: Shows "Empty response from API" error
- **JSON Parse Fails**: Graceful fallback with clarification request
- **Task Creation Fails**: Still shows bot message, logs error
- **Team Member Not Found**: Lists available members, asks to clarify

## 🧪 Testing

### Test Natural Language:

```
"Create a task about fixing bugs for henry due tomorrow"
"Assign 'Finalize budget' to Martha with high priority"
"Create task 'Post Q4 promo' for henry by 2026-01-20"
"Update my task, make it medium priority"
"Show my tasks"
```

### Expected Behavior:

1. ✅ Chatbot appears on messages page
2. ✅ Can type naturally (typos, abbreviations, all info at once)
3. ✅ Gets Grok-style friendly response
4. ✅ Task created in database automatically
5. ✅ Confirmation shows email and task ID
6. ✅ Non-task messages get friendly redirect

## 📝 Implementation Notes

- **Chatbot Component**: Self-contained, reusable, no state management needed
- **API Route**: Handles all Gemini communication, team member matching, date calculation
- **No Side Effects**: Clean separation between UI and logic
- **Fallbacks**: If anything fails, user still sees helpful message
- **Scalable**: Can add more actions (delete, query, analytics) easily

## 🎯 Next Steps (Optional Enhancements)

1. Add task search/query functionality
2. Show task list after creation
3. Add voice input support
4. Custom AI personality per user/team
5. Task history and analytics
6. Gemini vision for image-based tasks
