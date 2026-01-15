import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

interface TaskChatRequest {
  message: string;
  teamMembers?: Array<{ id: number; firstName: string; lastName: string; email: string }>;
  userId?: number;
}

interface TaskChatResponse {
  action: "create" | "assign" | "update" | "query" | "delete" | null;
  title: string | null;
  description: string | null;
  assigneeEmail: string | null;
  dueDate: string | null;
  priority: "low" | "medium" | "high" | null;
  message: string;
}

// Task-related keywords to trigger chatbot
const TASK_KEYWORDS = [
  "create task",
  "make task",
  "add task",
  "assign task",
  "update task",
  "delete task",
  "task for",
  "give task to",
  "new task",
  "show tasks",
  "my tasks",
  "list tasks",
  "create a task",
  "add a task",
  "assign to",
  "who has",
  "task status",
  "mark as",
  "complete task",
  "finish task",
  "due date",
  "set priority",
  "task priority",
];

function isTaskRelated(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return TASK_KEYWORDS.some((keyword) => lowerMessage.includes(keyword));
}

function getTeamMembersText(
  members: Array<{ id: number; firstName: string; lastName: string; email: string }>
): string {
  if (!members || members.length === 0) return "No team members available";
  return members
    .map((m) => `${m.firstName} ${m.lastName} (${m.email})`)
    .join(", ");
}

export async function POST(request: NextRequest) {
  try {
    const data: TaskChatRequest = await request.json();
    const { message, teamMembers = [] } = data;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Check if message is task-related
    if (!isTaskRelated(message)) {
      return NextResponse.json({
        action: null,
        title: null,
        description: null,
        assigneeEmail: null,
        dueDate: null,
        priority: null,
        message:
          "I'm TaskerBot — I only handle tasks! Just type normally for team chat.",
      } as TaskChatResponse);
    }

    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get team members from database if not provided
    let members = teamMembers;
    if (!members || members.length === 0) {
      const dbMembers = await prisma.user.findMany({
        where: { active: true },
        select: { id: true, firstName: true, lastName: true, email: true },
      });
      members = dbMembers;
    }

    const teamMembersText = getTeamMembersText(members);

    // Grok-like system prompt for task handling
    const systemPrompt = `You are TaskerBot, a helpful, friendly, and witty AI assistant inside a team task management app, inspired by Grok.

YOUR ROLE:
- ONLY help with task requests: create, assign, update, query, delete tasks
- For non-task messages, respond: "I'm TaskerBot — I only handle tasks! Just type normally for team chat."
- Be natural, encouraging, and witty when appropriate
- Vary your phrasing so you never sound repetitive
- Always confirm actions clearly with specific details
- If unclear, ask clarifying questions

TEAM MEMBERS:
${teamMembersText}

INSTRUCTIONS:
1. CREATE: Extract title, description, priority (low/medium/high), due date from user message
2. ASSIGN: Match the assignee name/email to team members (be smart about partial matches)
   - If multiple matches: Ask which person they mean
   - If no match: List available members and ask them to choose
   - Always include the full email in confirmation
3. UPDATE: Identify what field to update (title, description, priority, status, due date)
4. QUERY: Return a friendly message about finding/showing tasks
5. DELETE: Ask for confirmation with the task name

RESPONSE FORMAT (VALID JSON ONLY):
{
  "action": "create"|"assign"|"update"|"query"|"delete"|null,
  "title": "task title or null",
  "description": "task description or null",
  "assigneeEmail": "user@gmail.com or null",
  "dueDate": "ISO date (YYYY-MM-DD) or null",
  "priority": "low"|"medium"|"high"|null,
  "message": "friendly confirmation, question, or explanation"
}

EXAMPLES:
User: "Create a task called 'Post Q4 promo' for Henry"
Response: {"action":"create","title":"Post Q4 promo","description":null,"assigneeEmail":"henry@boombox.com","dueDate":null,"priority":null,"message":"Got it! Task 'Post Q4 promo' created and assigned to Henry Boyd (henry@boombox.com). Want to add a due date or set priority? 🚀"}

User: "Assign 'Finalize budget' to Martha"
Response: {"action":"assign","title":"Finalize budget","description":null,"assigneeEmail":"martha@boombox.com","dueDate":null,"priority":null,"message":"All set! 'Finalize budget' assigned to Martha Garcia (martha@boombox.com). 💪"}

User: "Show my tasks"
Response: {"action":"query","title":null,"description":null,"assigneeEmail":null,"dueDate":null,"priority":null,"message":"Fetching your tasks now... Want to see them sorted by due date or priority?"}

IMPORTANT: Return ONLY valid JSON, no other text. Be conversational and helpful!`;

    // Call Gemini with temperature 0.85 for natural variation
    const model = genAI.getGenerativeModel({
      model: "gemini-pro",
      generationConfig: {
        temperature: 0.85,
        maxOutputTokens: 512,
      },
    });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: message }],
        },
      ],
      systemInstruction: systemPrompt,
    });

    // Extract text from response
    let responseText = "";
    try {
      const response = (result as any).response || result;
      if (typeof response.text === "function") {
        responseText = await response.text();
      } else if (typeof response.text === "string") {
        responseText = response.text;
      } else {
        responseText = JSON.stringify(result);
      }
    } catch (e) {
      console.warn("Failed to extract text from Gemini response:", e);
      responseText = "";
    }

    // Parse JSON response
    let chatResponse: TaskChatResponse;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        chatResponse = JSON.parse(jsonMatch[0]);
      } else {
        chatResponse = JSON.parse(responseText);
      }
    } catch (e) {
      console.error("Failed to parse Gemini response as JSON:", responseText, e);
      return NextResponse.json(
        {
          action: null,
          title: null,
          description: null,
          assigneeEmail: null,
          dueDate: null,
          priority: null,
          message:
            "Hmm, I had trouble understanding that. Can you rephrase your task request?",
        } as TaskChatResponse
      );
    }

    // Validate response structure
    if (!chatResponse.message) {
      chatResponse.message = "Something went wrong. Please try again.";
    }

    return NextResponse.json(chatResponse);
  } catch (error) {
    console.error("Task chat error:", error);
    return NextResponse.json(
      {
        error: "Failed to process task request",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
