import { HfInference } from '@huggingface/inference';
import { NextRequest, NextResponse } from "next/server";

// Create the client once
const inference = new HfInference(process.env.HUGGINGFACE_API_KEY);

interface TeamMember {
  id: number;
  name: string;
  email: string;
}

interface TaskerBotRequest {
  message: string;
  teamMembers: TeamMember[];
  sessionId?: string;
}

interface TaskerBotResponse {
  action: "create" | "assign" | "update" | "delete" | "query" | null;
  title: string | null;
  description: string | null;
  assigneeEmail: string | null;
  dueDate: string | null;
  priority: "low" | "medium" | "high" | null;
  message: string;
  isConfirmed?: boolean;
}

interface TaskState {
  title: string | null;
  description: string | null;
  assigneeEmail: string | null;
  dueDate: string | null;
  priority: "low" | "medium" | "high" | null;
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
  lastUpdated: number;
}

// Simple in-memory task state store (use Redis/DB in production)
const taskStateStore = new Map<string, TaskState>();

// Cleanup old sessions after 30 minutes
const SESSION_TIMEOUT = 30 * 60 * 1000;

function getOrCreateTaskState(sessionId: string): TaskState {
  const existing = taskStateStore.get(sessionId);
  
  if (existing && Date.now() - existing.lastUpdated < SESSION_TIMEOUT) {
    return existing;
  }
  
  const newState: TaskState = {
    title: null,
    description: null,
    assigneeEmail: null,
    dueDate: null,
    priority: null,
    conversationHistory: [],
    lastUpdated: Date.now(),
  };
  
  taskStateStore.set(sessionId, newState);
  return newState;
}

function updateTaskState(sessionId: string, updates: Partial<TaskState>) {
  const state = getOrCreateTaskState(sessionId);
  Object.assign(state, updates, { lastUpdated: Date.now() });
  taskStateStore.set(sessionId, state);
}

const SYSTEM_PROMPT = `You are TaskerBot, a super smart, witty, and genuinely helpful task assistant inspired by Grok and Claude.

You're conversational, intelligent, and adaptable. You understand natural language extremely well — typos, abbreviations, incomplete sentences, vague requests, all mixed together — you roll with it and figure it out.

## Your Core Behavior:

**If the user is talking about tasks or work**, you're in "task mode":
- Listen carefully to what they're trying to accomplish
- Extract or ask for key details: title, description, assignee, due date, priority
- Guide them conversationally through the task creation process
- Don't force JSON output until the task is ready to create
- Be encouraging and help them think through requirements

**If the user is off-topic, making jokes, asking random questions, or just chatting**:
- Respond naturally and authentically—be witty, helpful, friendly
- Match their energy and tone
- NEVER give a canned response like "I'm just a task assistant!"
- If they've been working on a task, gently redirect after your response (e.g., "By the way, were you done describing that bug fix task?")
- Be human-like, not robotic

## Task Information:

Available team members:
{TEAM_MEMBERS}

When extracting dates, interpret natural language:
- "tomorrow" = next day
- "next Friday" = upcoming Friday
- "in 3 days" = 3 days from now
- ISO format: YYYY-MM-DD

## Current Task State:
{TASK_STATE}

## Response Modes:

**Mode 1: Conversational (during task building)**
Just respond naturally in your message. Help guide them through the process. Extract info as they provide it.

**Mode 2: Task Confirmation (when ready)**
If the user confirms they want to create a task and you have all key info (or reasonable defaults), output JSON:
{
  "action": "create",
  "title": "...",
  "description": "...",
  "assigneeEmail": "...",
  "dueDate": "...",
  "priority": "low|medium|high",
  "message": "friendly confirmation"
}

**Mode 3: Off-Topic Banter (jokes, random q's)**
Just chat naturally. No JSON. Be genuine and funny when it fits.

## Smart Matching:
- Match assignees by first name, last name, or email prefix (fuzzy matching is okay)
- If ambiguous, ask which one they meant
- Confirm before finalizing

## Golden Rules:
1. NEVER output static, precoded responses
2. Always sound like a real person having a conversation
3. Remember the context of what they've told you
4. Be forgiving and adaptable
5. Use light humor, but keep it professional and friendly
6. Output JSON ONLY when creating a confirmed task
7. Until then, respond in natural language`;

function formatTaskState(state: TaskState): string {
  const filled = [];
  if (state.title) filled.push(`Title: "${state.title}"`);
  if (state.description) filled.push(`Description: "${state.description}"`);
  if (state.assigneeEmail) filled.push(`Assignee: ${state.assigneeEmail}`);
  if (state.dueDate) filled.push(`Due: ${state.dueDate}`);
  if (state.priority) filled.push(`Priority: ${state.priority}`);
  
  if (filled.length === 0) {
    return "No task in progress — starting fresh!";
  }
  
  const missing = [];
  if (!state.title) missing.push("title");
  if (!state.description) missing.push("description");
  if (!state.priority) missing.push("priority");
  
  let status = `We have: ${filled.join(", ")}`;
  if (missing.length > 0) {
    status += `\nStill need: ${missing.join(", ")}`;
  }
  return status;
}

function formatTeamMembers(members: TeamMember[]): string {
  if (!members.length) return "No team members available.";
  return members.map((m) => `- ${m.name} (${m.email})`).join("\n");
}

function isTaskRelated(message: string): boolean {
  const taskKeywords = [
    "task", "create", "make", "add", "assign", "due", "priority", "deadline",
    "bug", "feature", "fix", "update", "delete", "remove", "done", "complete",
    "work", "project", "milestone", "checklist", "todo", "urgent", "asap",
    "when", "date", "who", "responsible", "owner", "description", "details",
  ];
  
  const lower = message.toLowerCase();
  return taskKeywords.some(keyword => lower.includes(keyword));
}

function calculateDueDate(dueString: string | null): string | null {
  if (!dueString) return null;

  const lower = dueString.toLowerCase().trim();
  const today = new Date();

  if (lower === "tomorrow") {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  }

  if (lower.includes("next")) {
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    for (let i = 0; i < dayNames.length; i++) {
      if (lower.includes(dayNames[i])) {
        const daysAhead = (i - today.getDay() + 7) % 7 || 7;
        const nextDate = new Date(today);
        nextDate.setDate(nextDate.getDate() + daysAhead);
        return nextDate.toISOString().split("T")[0];
      }
    }
  }

  if (lower.includes("in")) {
    const match = lower.match(/in\s+(\d+)\s+(day|week|month)/i);
    if (match) {
      const num = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      const resultDate = new Date(today);

      if (unit === "day" || unit === "days") {
        resultDate.setDate(resultDate.getDate() + num);
      } else if (unit === "week" || unit === "weeks") {
        resultDate.setDate(resultDate.getDate() + num * 7);
      } else if (unit === "month" || unit === "months") {
        resultDate.setMonth(resultDate.getMonth() + num);
      }

      return resultDate.toISOString().split("T")[0];
    }
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(dueString)) {
    return dueString;
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TaskerBotRequest;
    const { message, teamMembers = [], sessionId = "default" } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        {
          action: null,
          title: null,
          description: null,
          assigneeEmail: null,
          dueDate: null,
          priority: null,
          message: "Hey, what's on your mind? 👀",
        },
        { status: 200 }
      );
    }

    if (!process.env.HUGGINGFACE_API_KEY) {
      console.log("Missing HUGGINGFACE_API_KEY");
      return NextResponse.json(
        {
          action: null,
          title: null,
          description: null,
          assigneeEmail: null,
          dueDate: null,
          priority: null,
          message: "❌ Hugging Face API key not configured.",
        },
        { status: 200 }
      );
    }

    // Get or create task state for this session
    const taskState = getOrCreateTaskState(sessionId);
    taskState.conversationHistory.push({ role: "user", content: message });

    const teamContext = `Available team members:\n${formatTeamMembers(teamMembers)}`;
    const taskStateContext = `Current task state:\n${formatTaskState(taskState)}`;

    // Build system prompt with dynamic context
    const systemPromptWithContext = SYSTEM_PROMPT
      .replace("{TEAM_MEMBERS}", teamContext)
      .replace("{TASK_STATE}", taskStateContext);

    // Convert conversation history to messages format
    const messages = [
      { role: "system" as const, content: systemPromptWithContext },
      ...taskState.conversationHistory.map(h => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
    ];

    console.log("Sending to HF with session:", sessionId);
    console.log("Conversation history length:", taskState.conversationHistory.length);

    let responseText = "";

    try {
      const response = await inference.chatCompletion({
        model: "meta-llama/Llama-3.1-8B-Instruct",
        messages: messages,
        max_tokens: 900,
        temperature: 0.9,
      });

      responseText = response?.choices?.[0]?.message?.content?.trim() || "";

      if (!responseText) {
        throw new Error("Empty content in HF response");
      }

      console.log("HF raw response:", responseText.slice(0, 250));
    } catch (hfError) {
      console.error("Hugging Face API error:", hfError);
      return NextResponse.json(
        {
          action: null,
          title: null,
          description: null,
          assigneeEmail: null,
          dueDate: null,
          priority: null,
          message: "Oops, I hit a snag on my end. Try again in a moment? 😅",
        },
        { status: 200 }
      );
    }

    // Try to parse JSON if it looks like a task confirmation
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const hasJsonStructure = jsonMatch !== null;

    let parsed: TaskerBotResponse | null = null;

    if (hasJsonStructure) {
      try {
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        console.log("Parsed JSON (potential task):", parsed);
      } catch (parseError) {
        console.log("JSON in response but failed to parse, treating as natural response");
        parsed = null;
      }
    }

    // If no valid JSON parsed, return as natural language response
    if (!parsed) {
      // Add assistant response to history
      taskState.conversationHistory.push({ role: "assistant", content: responseText });
      updateTaskState(sessionId, { conversationHistory: taskState.conversationHistory });

      return NextResponse.json(
        {
          action: null,
          title: null,
          description: null,
          assigneeEmail: null,
          dueDate: null,
          priority: null,
          message: responseText,
        },
        { status: 200 }
      );
    }

    // If JSON was parsed, validate it's a proper task creation
    if (!parsed.message || typeof parsed.message !== "string") {
      parsed.message = "Got it!";
    }

    // Post-process due date if needed
    if (parsed.dueDate && !parsed.dueDate.includes("-")) {
      const calculated = calculateDueDate(parsed.dueDate);
      if (calculated) parsed.dueDate = calculated;
    }

    // Smart team member matching fallback
    if (!parsed.assigneeEmail && teamMembers.length > 0) {
      const lowerMessage = message.toLowerCase();
      for (const member of teamMembers) {
        if (
          lowerMessage.includes(member.name.toLowerCase()) ||
          lowerMessage.includes(member.email.split("@")[0].toLowerCase())
        ) {
          parsed.assigneeEmail = member.email;
          break;
        }
      }
    }

    // If action is "create" and we have essentials, update state and confirm
    if (parsed.action === "create") {
      if (parsed.title) {
        updateTaskState(sessionId, {
          title: parsed.title,
          description: parsed.description,
          assigneeEmail: parsed.assigneeEmail,
          dueDate: parsed.dueDate,
          priority: parsed.priority || "medium",
          conversationHistory: [
            ...taskState.conversationHistory,
            { role: "assistant", content: parsed.message },
          ],
        });
        
        // Clear state after task creation for next task
        setTimeout(() => {
          updateTaskState(sessionId, {
            title: null,
            description: null,
            assigneeEmail: null,
            dueDate: null,
            priority: null,
          });
        }, 500);
      }
    } else {
      // For other actions or if not a pure creation, add to history
      taskState.conversationHistory.push({ role: "assistant", content: parsed.message });
      updateTaskState(sessionId, { conversationHistory: taskState.conversationHistory });
    }

    return NextResponse.json(parsed, { status: 200 });
  } catch (error) {
    console.error("TaskerBot overall error:", error);
    return NextResponse.json(
      {
        action: null,
        title: null,
        description: null,
        assigneeEmail: null,
        dueDate: null,
        priority: null,
        message: `Something went wrong on my end, but I'm on it! Tell me what you need? 🚀 (${
          error instanceof Error ? error.message : "Unknown error"
        })`,
      },
      { status: 200 }
    );
  }
}