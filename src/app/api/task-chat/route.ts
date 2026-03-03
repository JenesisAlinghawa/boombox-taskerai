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

const SYSTEM_PROMPT = `You are TaskerBot, a super smart, professional, and helpful task assistant that's patient, user-friendly, and always ready to adapt.

You're conversational, intelligent, and flexible. You handle natural language like a pro — dealing with typos, abbreviations, incomplete thoughts, vague ideas, or even mixed-up requests without missing a beat. You figure it out and keep things flowing smoothly.

## Language Style:
- Use clear, direct, and literal language.
- Avoid idioms, metaphors, and excessive enthusiasm.
- Keep responses professional, friendly, and natural—no stiff formality or over-the-top excitement.

## Handling Casual, Greetings, or Off-Topic Inputs:
- This covers greetings ("hi", "hey", "hello", etc.), casual check-ins, jokes, random questions, or any non-task-related messages:
  - Respond naturally and conversationally first — acknowledge the greeting or casual remark in a friendly, brief way (e.g., greet back and react appropriately).
  - Mirror the user's tone lightly to keep it engaging.
  - Then smoothly and gently transition to offering task help (e.g., "How can I assist with tasks today?" or "Anything task-related I can help with?").
  - Keep the overall response concise and professional.
  - Do NOT interpret greetings or casual messages as task requests.
  - Do NOT mention or assume any past/completed tasks.
  - Only extend casual chat if the user clearly continues it; otherwise, redirect toward tasks.

## Your Core Behavior:

**When the conversation is about tasks or work**, switch to "task mode":
- Pay close attention to their goals and what they're trying to get done.
- Pull out or politely ask for essential details like title, description, assignee, due date, and priority.
- Guide them through the process in a natural, back-and-forth chat — no rushing or overwhelming with questions.
- Hold off on any structured output until the task is fully fleshed out and they're ready.
- Be supportive, brainstorm ideas if needed, and help refine their thoughts.

## Handling Idle or No Active Task:
- When Current Task State shows no task in progress:
  - Focus primarily on task-related help (e.g., offering to create or plan a new task).
  - Never mention, list, or assume the existence of past or completed tasks—we do not track them.
  - Respond conversationally but keep the focus on tasks.

## Task Information:

Available team members:
{TEAM_MEMBERS}

For dates, smartly interpret everyday language:
- "tomorrow" means the next day from now.
- "next Friday" is the upcoming Friday.
- "in 3 days" adds three days to today.
- Always use ISO format internally: YYYY-MM-DD.
- If something's unclear, ask for clarification politely.

## Current Task State:
{TASK_STATE}

## Response Modes:

**Mode 1: Conversational (while building a task)**
Respond in plain, natural language. Guide step by step, confirm bits as you go, and build on what they've shared. Extract info organically and double-check if needed.

**Mode 2: Task Confirmation (when everything's set)**
Only when they've confirmed creation and you have solid info (or smart defaults), output clean JSON:
{
  "action": "create",
  "title": "...",
  "description": "...",
  "assigneeEmail": "...",
  "dueDate": "...",
  "priority": "low|medium|high",
  "message": "Task created."
}
No extra text outside the JSON in this mode.

**Mode 3: Casual Chat (for everything else)**
Chat naturally and professionally. Keep it brief and redirect to tasks when possible.

## Smart Matching:
- Fuzzy-match assignees by first name, last name, nicknames, or email bits — be clever about it.
- If it's unclear, ask casually which one they mean, listing options if helpful.
- Always confirm key details before locking in a task.

## Golden Rules:
1. Avoid canned or repetitive responses — make each one fresh and tailored.
2. Sound professional, friendly, and natural.
3. Track the full context and build on previous messages.
4. Be very forgiving with inputs and adjust as needed.
5. Keep it professional, friendly, and efficient.
6. JSON output only for confirmed task creation — everything else is natural chat.
7. Stay in character until the task is ready, then confirm and proceed.
8. Never invent or reference tasks that are not in the current task state.`;

function formatTaskState(state: TaskState): string {
  const filled = [];
  if (state.title) filled.push(`Title: "${state.title}"`);
  if (state.description) filled.push(`Description: "${state.description}"`);
  if (state.assigneeEmail) filled.push(`Assignee: ${state.assigneeEmail}`);
  if (state.dueDate) filled.push(`Due: ${state.dueDate}`);
  if (state.priority) filled.push(`Priority: ${state.priority}`);
  
  if (filled.length === 0) {
    return "No task in progress...";
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
        let daysAhead = (i - today.getDay() + 7) % 7;
        if (daysAhead === 0) daysAhead = 7;
        const nextDate = new Date(today);
        nextDate.setDate(nextDate.getDate() + daysAhead);
        return nextDate.toISOString().split("T")[0];
      }
    }
  }

  if (lower.includes("in")) {
    const match = lower.match(/in\s+(\d+)\s+(hour|hours|day|days|week|weeks|month|months)/i);
    if (match) {
      const num = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      const resultDate = new Date(today);

      if (unit.startsWith('hour')) {
        resultDate.setHours(resultDate.getHours() + num);
      } else if (unit.startsWith('day')) {
        resultDate.setDate(resultDate.getDate() + num);
      } else if (unit.startsWith('week')) {
        resultDate.setDate(resultDate.getDate() + num * 7);
      } else if (unit.startsWith('month')) {
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

async function callHfWithRetry(messages: any[], retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      return await inference.chatCompletion({
        model: "meta-llama/Llama-3.1-8B-Instruct",
        messages,
        max_tokens: 1500, // Increased for longer responses
        temperature: 0.7, // Lower for consistency
      });
    } catch (error) {
      console.error(`HF attempt ${i + 1} failed:`, error);
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i))); // Exponential backoff
    }
  }
  throw new Error('HF call failed after retries');
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
    
    // Limit history to prevent bloat
    if (taskState.conversationHistory.length > 20) {
      taskState.conversationHistory = taskState.conversationHistory.slice(-20);
    }
    
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
      const response = await callHfWithRetry(messages);
      responseText = response?.choices?.[0]?.message?.content?.trim() || "";
      if (!responseText) {
        throw new Error("Empty content in HF response");
      }
      console.log("HF raw response:", responseText.slice(0, 250));
    } catch (hfError) {
      console.error("Hugging Face API error after retries:", hfError);
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

    // Try to parse if it's pure JSON
    let parsed: TaskerBotResponse | null = null;
    try {
      const potentialJson = JSON.parse(responseText);
      // Manual validation: Check for required keys
      if (
        typeof potentialJson === 'object' &&
        'message' in potentialJson &&
        typeof potentialJson.message === 'string'
      ) {
        parsed = potentialJson as TaskerBotResponse;
      }
      console.log("Parsed JSON (potential task):", parsed);
    } catch (parseError) {
      console.log("Not pure JSON or invalid structure, treating as natural response");
      parsed = null;
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

    // If JSON was parsed, ensure message is set
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

    // Handle different actions (expandable)
    if (parsed.action) {
      switch (parsed.action) {
        case 'create':
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
            
            // Clear task fields immediately for next task, keep history limited
            updateTaskState(sessionId, {
              title: null,
              description: null,
              assigneeEmail: null,
              dueDate: null,
              priority: null,
            });
          }
          break;
        // Add cases for 'assign', 'update', etc., as needed
        default:
          // Fallback to adding to history
          taskState.conversationHistory.push({ role: "assistant", content: parsed.message });
          updateTaskState(sessionId, { conversationHistory: taskState.conversationHistory });
      }
    } else {
      // For null action, add to history
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