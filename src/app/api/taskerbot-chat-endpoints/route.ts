import { HfInference } from '@huggingface/inference';
import { NextRequest, NextResponse } from "next/server";

// Create the client once
const inference = new HfInference(process.env.HUGGINGFACE_API_KEY);

interface TeamMember {
  id: number;
  name: string;
  email: string;
  role?: string;
}

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface TaskerBotRequest {
  message: string;
  teamMembers: TeamMember[];
  currentUser?: CurrentUser;
  sessionId?: string;
  userId?: string;
}

interface TaskerBotResponse {
  action: "confirm" | "create" | "assign" | "update" | "delete" | "query" | null;
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

## Current Context:

**You are chatting with:**
{CURRENT_USER}

**Available team members for task assignment:**
{TEAM_MEMBERS}

**Today's date:** {TODAY_DATE}

## Assignment Restrictions - CRITICAL:
Based on the user's role, they can only assign tasks to certain team members:
- **EMPLOYEE users**: Can ONLY assign to other EMPLOYEE team members. Do NOT suggest assigning to ADMIN or OWNER.
- **ADMIN users**: Can assign to EMPLOYEE or ADMIN team members. Do NOT suggest assigning to OWNER.
- **OWNER users**: Can assign to any team member (EMPLOYEE, ADMIN, or OWNER).

When a user tries to assign to someone outside their permission level, explain the restriction and ask for a valid assignee instead.

## Handling Team Member Names:
- Users may mention team members by first name, last name, full name, nickname, email, or partial name.
- ALWAYS search the Available team members list to identify who they're referring to.
- Match partial names (e.g., "Jen" likely means "Jenesis" if that's in the team).
- When unsure about a name match, ask for clarification with available options.
- Once identified, use their FULL NAME and EMAIL for clarity.

Example: If user says "assign to Jen", search team members:
- If you find "Jenesis" in the list, you can infer they mean that person.
- Confirm: "I'll assign this to Jenesis (jenesis@company.com)"

## Handling Casual, Greetings, or Off-Topic Inputs:
- This covers greetings ("hi", "hey", "hello", etc.), casual check-ins, jokes, random questions, or any non-task-related messages.
- ONLY apply this behavior if the message is detected as a greeting or casual input.
- IMPORTANT: If the message contains task-related keywords (create, assign, task, due, priority, tomorrow, etc.), treat it as a TASK REQUEST, NOT a greeting.
- For actual greetings/casual messages (not task-related):
  - Respond naturally and conversationally first — acknowledge the greeting or casual remark in a friendly, brief way (e.g., greet back).
  - Mirror the user's tone lightly to keep it engaging.
  - Then smoothly transition to offering task help.
  - Keep the overall response concise and professional.
- For task requests with greeting language (e.g., "Hey! Assign me a task..."), skip the greeting ritual and go straight to task mode.

## Your Core Behavior:

**When the conversation is about tasks or work**, switch to "task mode":
- Pay close attention to their goals and what they're trying to get done.
- FIRST, extract ALL available information from their message in a SINGLE pass:
  - Task title
  - Description (if mentioned)
  - Assignee name/email (search team members for matches based on name/email, RESPECTING ROLE RESTRICTIONS)
  - Due date (interpret natural language like "tomorrow", "in 3 days", "next Friday", etc.)
  - Priority (see priority rules below)
- If you extract enough information to create a task, USE action "confirm" to ask for user confirmation before actually creating it
- Only ask clarifying questions if truly critical information is missing
- Be supportive, brainstorm ideas if needed, and help refine their thoughts.

## Priority Rules (IMPORTANT):
Automatically set priority based on deadline proximity:
- "high" if due date is: today, tomorrow, or within 1 day
- "high" if due date is within 2-3 days AND user mentions urgency keywords (urgent, ASAP, critical, etc.)
- "medium" if due date is within 1-2 weeks
- "low" if due date is beyond 2 weeks or not specified
- Always favor higher priority for close deadlines

## Handling Idle or No Active Task:
- When Current Task State shows no task in progress:
  - Focus primarily on task-related help (e.g., offering to create or plan a new task).
  - Never mention, list, or assume the existence of past or completed tasks—we do not track them.
  - Respond conversationally but keep the focus on tasks.

## Due Date Interpretation:
- "tomorrow" means the next day from now.
- "next Friday" is the upcoming Friday.
- "in 3 days" adds three days to today ({TODAY_DATE}).
- Always use ISO format internally: YYYY-MM-DD.
- If something's unclear, ask for clarification politely.

## Current Task State:
{TASK_STATE}

## Response Format - RETURN ONLY VALID JSON

CRITICAL: You MUST respond with ONLY a JSON object. Do NOT include markdown, code blocks, or any other text.

Return a JSON object with these fields (use null for empty values):
- action: "confirm" (when ready with title + assignee + dueDate), or null otherwise
- message: Your conversational response (natural language string)
- title: Task title or null
- description: Task description or null
- assigneeEmail: Team member email or null
- dueDate: ISO format YYYY-MM-DD or null
- priority: "low", "medium", "high", or null

Example JSON when ready to create:
{"action":"confirm","message":"I can create Website redesign for Sarah with due date 2026-04-15 (HIGH priority). Should I proceed?","title":"Website redesign","assigneeEmail":"sarah@company.com","dueDate":"2026-04-15","priority":"high","description":null}

Example JSON when asking for missing info:
{"action":null,"message":"I'd love to help! I need to know who should this task be assigned to. Who from the team?","title":null,"description":null,"assigneeEmail":null,"dueDate":null,"priority":null}

Example JSON for casual chat:
{"action":null,"message":"That sounds interesting! Let me know if you need help organizing any tasks.","title":null,"description":null,"assigneeEmail":null,"dueDate":null,"priority":null}

GOLDEN RULES:
1. RESPOND WITH ONLY JSON - no other text
2. ALL fields must be present (even if some are null)
3. action is confirm only when you have: title AND assignee AND due date
4. message must be conversational, NOT formatted as JSON text
5. dueDate MUST be ISO format: YYYY-MM-DD
6. priority: high if within 1 day, medium if within 2 weeks, low otherwise
7. No markdown code blocks, no explanations, just pure JSON
8. When user mentions a name, ALWAYS identify the matching team member from the Available team members list
9. For assignee matching: compare first name, last name, full name, and email substring matches
10. IMPORTANT: Never suggest assigning to users outside the current user's role hierarchy (see Assignment Restrictions section)`;

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
  return members.map((m) => `- ${m.name} (${m.email}) - Role: ${m.role || "EMPLOYEE"}`).join("\n");
}

function formatCurrentUser(user: CurrentUser | undefined): string {
  if (!user) return "User identity: Not available";
  return `User identity: ${user.name} (${user.email}) - Role: ${user.role}`;
}

/**
 * Validates if the current user can assign a task to a team member
 * Rules:
 * - EMPLOYEE can only assign to EMPLOYEE role members
 * - ADMIN can assign to EMPLOYEE and other ADMIN members
 * - OWNER can assign to anyone
 */
function isValidAssignment(currentUserRole: string | undefined, targetMemberRole: string | undefined): boolean {
  const userRole = (currentUserRole || "EMPLOYEE").toUpperCase();
  const memberRole = (targetMemberRole || "EMPLOYEE").toUpperCase();

  // Define role hierarchy
  const roleHierarchy: { [key: string]: number } = {
    EMPLOYEE: 1,
    ADMIN: 2,
    OWNER: 3,
  };

  const userLevel = roleHierarchy[userRole] || 1;
  const memberLevel = roleHierarchy[memberRole] || 1;

  // User can only assign to members at their own level or below
  return userLevel >= memberLevel;
}

function isTaskRequest(message: string): boolean {
  // Keywords that indicate a task-related request
  const taskKeywords = [
    'assign', 'create', 'task', 'due', 'priority', 'tomorrow', 'today',
    'deadline', 'schedule', 'urgent', 'asap', 'high', 'medium', 'low',
    'complete', 'finish', 'done', 'pending', 'overdue', 'in progress',
    'in 3', 'in 2', 'in 1', 'next week', 'next monday', 'next tuesday',
    'next wednesday', 'next thursday', 'next friday', 'next saturday',
    'next sunday', 'remind', 'alert', 'notification'
  ];
  
  const lowerMessage = message.toLowerCase();
  return taskKeywords.some(keyword => lowerMessage.includes(keyword));
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
      console.log(`HF call attempt ${i + 1}/${retries}...`);
      return await inference.chatCompletion({
        model: "meta-llama/Llama-3.1-8B-Instruct",
        messages,
        max_tokens: 1500, // Increased for longer responses
        temperature: 0.7, // Lower for consistency
      });
    } catch (error) {
      console.error(`HF attempt ${i + 1} failed:`, error);
      if (i < retries - 1) {
        const delay = 1000 * Math.pow(2, i);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay)); // Exponential backoff
      }
    }
  }
  throw new Error('HF call failed after retries');
}

export async function POST(req: NextRequest) {
  try {
    console.log("🤖 TaskerBot API: Processing request...");
    
    // Parse FormData if files are present, otherwise parse JSON
    let body: any = {};
    const contentType = req.headers.get("content-type") || "";
    
    if (contentType.includes("multipart/form-data")) {
      // Handle FormData with files
      const formData = await req.formData();
      body.message = formData.get("message") as string;
      body.teamMembers = JSON.parse((formData.get("teamMembers") as string) || "[]");
      body.currentUser = JSON.parse((formData.get("currentUser") as string) || "null");
      body.sessionId = formData.get("sessionId") as string;
      body.userId = formData.get("userId") as string;
      body.pendingTask = JSON.parse((formData.get("pendingTask") as string) || "null");
      
      // Get file metadata
      const files = formData.getAll("files") as File[];
      if (files.length > 0) {
        body.attachments = files.map(f => ({
          name: f.name,
          type: f.type,
          size: f.size,
        }));
        console.log("📎 Files received:", body.attachments);
      }
    } else {
      // Handle JSON
      body = (await req.json()) as TaskerBotRequest;
    }
    
    const { message, teamMembers = [], currentUser, sessionId = "default", pendingTask } = body;
    
    console.log("📝 Message received:", message.slice(0, 100));
    console.log("👥 Team members:", teamMembers.length);
    console.log("📌 Session ID:", sessionId);
    if (pendingTask) {
      console.log("⏳ Pending task context:", pendingTask);
    }

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

    // Detect if this is a task request (to avoid unnecessary greetings)
    const isTask = isTaskRequest(message);
    const isFirstMessage = taskState.conversationHistory.length === 0;
    const shouldSkipGreeting = isTask && isFirstMessage;

    const teamContext = `Available team members:\n${formatTeamMembers(teamMembers)}`;
    const taskStateContext = `Current task state:\n${formatTaskState(taskState)}`;
    const userContext = `${formatCurrentUser(currentUser)}`;
    
    // Get today's date in ISO format for priority calculations
    const today = new Date().toISOString().split("T")[0];

    // Debug logging
    console.log("🔍 Context being sent to AI:");
    console.log("1️⃣ User Context:", userContext);
    console.log("2️⃣ Team Members Count:", teamMembers.length);
    console.log("3️⃣ Today's Date:", today);
    console.log("4️⃣ Is Task Request:", isTask);
    console.log("5️⃣ Should Skip Greeting:", shouldSkipGreeting);

    // Build system prompt with dynamic context
    let systemPromptWithContext = SYSTEM_PROMPT
      .replace("{CURRENT_USER}", userContext)
      .replace("{TODAY_DATE}", today)
      .replace("{TEAM_MEMBERS}", teamContext)
      .replace("{TASK_STATE}", taskStateContext);

    // If it's a clear task request on first message, add instruction to skip greeting
    if (shouldSkipGreeting) {
      systemPromptWithContext += `\n\n## IMPORTANT - First Message is Task Request:\nThe user has sent a task request as their first message. Do NOT greet them or add unnecessary pleasantries. Go straight to task mode. Extract task information and respond with JSON containing action and task details.`;
    }

    // Add user message to conversation history
    taskState.conversationHistory.push({ role: "user", content: message });
    updateTaskState(sessionId, { conversationHistory: taskState.conversationHistory });

    // Convert conversation history to messages format
    const messages = [
      { role: "system" as const, content: systemPromptWithContext },
      ...taskState.conversationHistory.map(h => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
    ];

    console.log("📨 Sending to HF:");
    console.log("  - Session ID:", sessionId);
    console.log("  - History length:", taskState.conversationHistory.length);
    console.log("  - Skipping greeting:", shouldSkipGreeting);

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

    // Validate assignee role if an assignee was specified
    if (parsed.assigneeEmail && currentUser) {
      const assignee = teamMembers.find(
        (m: TeamMember) => m.email.toLowerCase() === parsed.assigneeEmail?.toLowerCase()
      );

      if (assignee && !isValidAssignment(currentUser.role, assignee.role)) {
        console.warn(
          `❌ Invalid assignment attempt: ${currentUser.name} (${currentUser.role}) tried to assign to ${assignee.name} (${assignee.role})`
        );
        
        // Clear the invalid assignee and ask for a valid one
        parsed.assigneeEmail = null;
        parsed.action = null;
        
        // Build list of assignable members for this user
        const assignableRoles = currentUser.role === "OWNER" 
          ? ["EMPLOYEE", "ADMIN"] 
          : currentUser.role === "ADMIN" 
          ? ["EMPLOYEE", "ADMIN"] 
          : ["EMPLOYEE"];
        
        const assignableMembers = teamMembers.filter(
          (m: TeamMember) => assignableRoles.includes((m.role || "EMPLOYEE").toUpperCase())
        );

        if (assignableMembers.length > 0) {
          parsed.message = `I can't assign tasks to ${assignee.name} because they have the ${assignee.role} role. As a ${currentUser.role}, you can only assign to team members with these roles: ${assignableRoles.join(", ")}. Who else would you like to assign this to?`;
        } else {
          parsed.message = `I can't assign tasks to ${assignee.name} because they have the ${assignee.role} role. As a ${currentUser.role}, you don't have permission to assign to available team members.`;
        }
      }
    }

    // Handle different actions (expandable)
    if (parsed.action) {
      switch (parsed.action) {
        case 'confirm':
          // Confirmation action - store the current task state for later creation
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
          }
          break;
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