import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { buildTaskGraph, findCriticalPath, formatPath, hasCircularDependencies } from "@/utils/dijkstra";
import type { TaskNode } from "@/utils/dijkstra";

interface TeamMember {
  id: number;
  name: string;
  email: string;
}

interface TaskerBotRequest {
  message: string;
  teamMembers: TeamMember[];
  userId?: string;
}

interface TaskerBotResponse {
  action: "create" | "assign" | "update" | "delete" | "query" | "optimize" | null;
  title: string | null;
  description: string | null;
  assigneeEmail: string | null;
  dueDate: string | null;
  priority: "low" | "medium" | "high" | null;
  message: string;
  optimizationPath?: string; // Optional field for optimization results
}

const SYSTEM_PROMPT = `You are TaskerBot, a helpful and conversational AI task assistant made in the style of Grok.

Your personality: Natural, witty, helpful, intelligent. You understand context, slang, typos, and vague prompts. You're flexible and don't require perfect grammar.

YOUR JOB:
1. Respond naturally to ANYTHING the user says - chat, questions, vague requests, bad grammar - treat it all as valid input
2. ALWAYS acknowledge what the user is asking or saying in a friendly way
3. AFTER responding, ALWAYS propose creating a task based on what they mentioned IF it sounds like something actionable
4. Recognize optimization queries about task sequences and critical paths
5. Be conversational first, task-creation second

IMPORTANT RULES:
- Even if the prompt is vague, bad grammar, or unclear - respond naturally and ask clarifying questions if needed
- If they mention anything that could become a task, propose it: "Want me to create a task for this?"
- Don't refuse to engage with casual chat or vague requests
- Always extract task details if they're interested (title, assignee, due date, priority)
- When user asks about "optimizing tasks", "shortest path", "critical path", "fastest way", "best sequence", or "task sequence" - respond with "optimize" action
- Return ONLY valid JSON (no markdown, no extra text)

JSON OUTPUT FORMAT (REQUIRED - ALWAYS RETURN THIS):
{
  "action": "create" | "optimize" | "chat" | null,
  "title": "task title or null",
  "description": "task description or null", 
  "assigneeEmail": "user@email.com or null",
  "dueDate": "YYYY-MM-DD or null",
  "priority": "low" | "medium" | "high" | null,
  "message": "Your friendly conversational response"
}

EXAMPLES:

Input: "bruh i gotta fix my car lol"
Output: {"action":"chat","title":null,"description":null,"assigneeEmail":null,"dueDate":null,"priority":null,"message":"Lol sounds like you've got car trouble 😅 Is that something you want to turn into a task so you don't forget? I can help you track it!"}

Input: "can you make or create a task about cars and assign to jinshi and it should be done until next month"
Output: {"action":"create","title":"Cars","description":null,"assigneeEmail":"jinshi@company.com","dueDate":"2026-02-16","priority":null,"message":"Got it! Creating 'Cars' for Jinshi with a due date next month. 🚀"}

Input: "optimize my tasks" or "what's the critical path?"
Output: {"action":"optimize","title":null,"description":null,"assigneeEmail":null,"dueDate":null,"priority":null,"message":"Let me analyze your task dependencies and find the optimal sequence!"}

Input: "what time is it"
Output: {"action":"chat","title":null,"description":null,"assigneeEmail":null,"dueDate":null,"priority":null,"message":"It's currently January 16, 2026. By the way, got anything on your plate that needs tracking? I can help turn anything into a task!"}

Input: "im so tired man"
Output: {"action":"chat","title":null,"description":null,"assigneeEmail":null,"dueDate":null,"priority":null,"message":"Oof, those days happen! Need a break or got tasks piling up? I can help you organize what's on your mind."}`;


function formatTeamMembers(members: TeamMember[]): string {
  if (!members.length) return "No team members available.";
  return members.map((m) => `- ${m.name} (${m.email})`).join("\n");
}

function parseGeminiResponse(text: string): TaskerBotResponse {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON found in response");
  }

  const parsed = JSON.parse(jsonMatch[0]) as TaskerBotResponse;

  if (!parsed.message || typeof parsed.message !== "string") {
    throw new Error("Response missing 'message' field");
  }

  return parsed;
}

function parseTaskFromMessage(message: string, teamMembers: TeamMember[]): TaskerBotResponse {
  const lower = message.toLowerCase();

  // Check if it's explicitly a task-related message (strong intent)
  const taskKeywords = ["create", "add", "make", "assign", "task", "todo", "new task", "create task", "add task"];
  const isExplicitTask = taskKeywords.some(kw => lower.includes(kw));

  // For explicit task requests, extract details
  if (isExplicitTask) {
    // Extract title - more flexible patterns
    let title = null;
    
    // Try pattern: "about X and assign"
    let match = message.match(/about\s+([^,\n]+?)(?:\s+and\s+assign|\s+and\s+it)/i);
    if (match) {
      title = match[1].trim();
    } else {
      // Try pattern: "task X and assign" or "task called X"
      match = message.match(/(?:make|create|add)\s+(?:a\s+)?task\s+(?:about|called|named)?\s*([^,\n]+?)(?:\s+and|\s+for|\s+assign|\s+with|\s+due|\s+until|\s*$)/i);
      if (match) {
        title = match[1].trim();
      } else {
        // Fallback: grab words after "about" or after "task"
        match = message.match(/(?:about|task)\s+([a-zA-Z\s]+?)(?:\s+and\s+(?:assign|it)|$)/i);
        if (match) {
          title = match[1].trim();
        }
      }
    }

    // Clean up title if it contains unwanted words
    if (title) {
      title = title.replace(/\s+(?:shit|crap|damn|fuck)/gi, "").trim();
      if (title.length > 50) {
        title = title.split(/\s+and\s+/i)[0].trim();
      }
    }

    // Extract assignee - more flexible
    let assigneeEmail = null;
    const assignMatch = message.match(/(?:assign\s+(?:it\s+)?to|to)\s+([a-zA-Z]+)/i);
    if (assignMatch) {
      const assigneeName = assignMatch[1].trim().toLowerCase();
      const member = teamMembers.find(m => 
        m.name.toLowerCase().startsWith(assigneeName) || 
        m.email.split("@")[0].toLowerCase() === assigneeName
      );
      if (member) {
        assigneeEmail = member.email;
      }
    }

    // Extract priority
    let priority: "low" | "medium" | "high" | null = null;
    if (lower.includes("high") || lower.includes("urgent")) priority = "high";
    else if (lower.includes("medium") || lower.includes("normal")) priority = "medium";
    else if (lower.includes("low")) priority = "low";

    // Extract due date - improved pattern matching
    let dueDate: string | null = null;
    if (lower.includes("tomorrow")) {
      dueDate = "tomorrow";
    } else if (lower.includes("today")) {
      dueDate = "today";
    } else if (lower.includes("next month") || lower.includes("until next month")) {
      dueDate = "next month";
    } else if (lower.includes("next year") || lower.includes("until next year")) {
      dueDate = "next year";
    } else {
      let nextMatch = lower.match(/(?:until|due)\s+next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
      if (nextMatch) {
        dueDate = nextMatch[0];
      } else {
        nextMatch = lower.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
        if (nextMatch) {
          dueDate = nextMatch[0];
        } else {
          const inMatch = lower.match(/in\s+(\d+)\s+(day|week|month)s?/i);
          if (inMatch) {
            dueDate = inMatch[0];
          } else {
            const untilMatch = lower.match(/until\s+([a-zA-Z\s]+?)(?:\s+month|\s+year|$)/i);
            if (untilMatch) {
              dueDate = untilMatch[0];
            }
          }
        }
      }
    }

    // Calculate actual due date
    const calculatedDueDate = dueDate ? calculateDueDate(dueDate) : null;

    if (!title || title.length < 2) {
      return {
        action: null,
        title: null,
        description: null,
        assigneeEmail: null,
        dueDate: null,
        priority: null,
        message: "I caught that you want to create a task! What should I call it?"
      };
    }

    return {
      action: "create",
      title,
      description: null,
      assigneeEmail,
      dueDate: calculatedDueDate,
      priority,
      message: `Got it! Creating "${title}"${assigneeEmail ? ` for ${teamMembers.find(m => m.email === assigneeEmail)?.name}` : ""}${calculatedDueDate ? ` due ${dueDate}` : ""}${priority ? ` (${priority} priority)` : ""}. 🚀`
    };
  }

  // For non-explicit task messages, chat naturally and propose task creation
  let response = "";

  // Detect what they might be asking about and respond naturally
  if (lower.includes("hello") || lower.includes("hey") || lower.includes("hi") || lower.includes("sup") || lower.includes("yo")) {
    response = `Hey there! 👋 What's on your mind?`;
  } else if (lower.includes("thanks") || lower.includes("thank you")) {
    response = `No problem! Happy to help. 😊`;
  } else if (lower.includes("how are you") || lower.includes("whats up") || lower.includes("what's up")) {
    response = `Doing great! How about you? Got anything that needs organizing?`;
  } else if (lower.includes("time") || lower.includes("date")) {
    response = `It's January 16, 2026. Got anything on your plate?`;
  } else {
    // For everything else, acknowledge what they said and offer to help
    const firstWords = message.split(" ").slice(0, 8).join(" ");
    response = `${firstWords}... Got it! ${message.length < 30 ? "Sounds interesting. " : ""}That sounds like something you might want to track. Want me to create a task for this?`;
  }

  return {
    action: null,
    title: null,
    description: null,
    assigneeEmail: null,
    dueDate: null,
    priority: null,
    message: response
  };
}

function calculateDueDate(dateString: string): string | null {
  if (!dateString) return null;

  const lower = dateString.toLowerCase().trim();
  const today = new Date();

  if (lower === "tomorrow") {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  }

  if (lower === "today") {
    return today.toISOString().split("T")[0];
  }

  if (lower === "next month" || lower.includes("next month")) {
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth.toISOString().split("T")[0];
  }

  if (lower === "next year" || lower.includes("next year")) {
    const nextYear = new Date(today);
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    return nextYear.toISOString().split("T")[0];
  }

  if (lower.startsWith("next")) {
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    for (let i = 0; i < days.length; i++) {
      if (lower.includes(days[i])) {
        const daysAhead = (i - today.getDay() + 7) % 7 || 7;
        const nextDate = new Date(today);
        nextDate.setDate(nextDate.getDate() + daysAhead);
        return nextDate.toISOString().split("T")[0];
      }
    }
  }

  if (lower.includes("until")) {
    // Extract what comes after "until"
    const match = lower.match(/until\s+(.+?)(?:\s+month|\s+year|$)/);
    if (match) {
      const dateRef = match[1].trim();
      // Recursively process the extracted date
      return calculateDueDate(dateRef);
    }
  }

  if (lower.includes("in")) {
    const match = lower.match(/in\s+(\d+)\s+(day|week|month)s?/i);
    if (match) {
      const num = parseInt(match[1], 10);
      const unit = match[2].toLowerCase();
      const resultDate = new Date(today);

      if (unit === "day") resultDate.setDate(resultDate.getDate() + num);
      else if (unit === "week") resultDate.setDate(resultDate.getDate() + num * 7);
      else if (unit === "month") resultDate.setMonth(resultDate.getMonth() + num);

      return resultDate.toISOString().split("T")[0];
    }
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }

  return null;
}

async function handleOptimizationQuery(userId: string): Promise<string> {
  try {
    // Fetch all user's tasks
    const tasks = await prisma.task.findMany({
      where: { createdById: parseInt(userId) }
    });

    if (tasks.length === 0) {
      return "You don't have any tasks yet. Create some tasks with dependencies, and I can help you find the optimal sequence!";
    }

    // Convert tasks to Dijkstra format
    const dijkstraTasks: TaskNode[] = tasks.map(task => ({
      id: task.id,
      title: task.title,
      duration: Math.ceil((new Date(task.dueDate || new Date()).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) || 1,
      priority: (task.priority || "medium") as "low" | "medium" | "high",
      dependencies: [] // No dependencies in current schema, will be added in future updates
    }));

    // Build graph
    const graph = buildTaskGraph(dijkstraTasks);

    // Check for circular dependencies
    if (hasCircularDependencies(graph)) {
      return "⚠️ I found circular dependencies in your tasks! This means Task A depends on B, and B (directly or indirectly) depends on A. Please fix these and try again.";
    }

    // Find critical path
    const criticalResult = findCriticalPath(graph);

    if (!criticalResult.path || criticalResult.path.length === 0) {
      return "Your tasks don't have dependencies yet. Add dependencies between tasks to see the optimal sequence!";
    }

    const pathTitles = criticalResult.path
      .map(nodeId => tasks.find(t => t.id === nodeId)?.title || nodeId)
      .join(" → ");

    return `🎯 **Critical Path Analysis**\n\nOptimal task sequence: ${pathTitles}\n\nTotal duration: **${criticalResult.totalDuration?.toFixed(1) || 0} days**\n\nThis is the longest chain of dependent tasks. Completing this path determines your minimum project completion time. Tasks not on this path can run in parallel!`;
  } catch (error) {
    console.error("[TaskerBot] Optimization error:", error);
    return "I couldn't analyze your tasks right now. Make sure you have tasks set up!";
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  // Parse body once at the start
  let body: TaskerBotRequest;
  try {
    body = (await req.json()) as TaskerBotRequest;
  } catch {
    return NextResponse.json({
      action: null,
      title: null,
      description: null,
      assigneeEmail: null,
      dueDate: null,
      priority: null,
      message: "Invalid request format",
    });
  }

  const { message, teamMembers = [], userId } = body;

  try {
    console.log("[TaskerBot]", "Received:", message);

    if (!message?.trim()) {
      return NextResponse.json({
        action: null,
        title: null,
        description: null,
        assigneeEmail: null,
        dueDate: null,
        priority: null,
        message: "Please type a message!",
      });
    }

    // Check for optimization queries
    const optimizationKeywords = ["optimize", "shortest path", "critical path", "fastest way", "best sequence", "task sequence", "what's the optimal"];
    const lowerMessage = message.toLowerCase();
    const isOptimizationQuery = optimizationKeywords.some(keyword => lowerMessage.includes(keyword));

    if (isOptimizationQuery && userId) {
      console.log("[TaskerBot] Detected optimization query");
      const optimizationResult = await handleOptimizationQuery(userId);
      return NextResponse.json({
        action: "optimize",
        title: null,
        description: null,
        assigneeEmail: null,
        dueDate: null,
        priority: null,
        message: optimizationResult,
      });
    }

    // Always try Gemini first
    if (!process.env.GEMINI_API_KEY) {
      console.error("[TaskerBot] ❌ GEMINI_API_KEY not configured!");
      return NextResponse.json({
        action: null,
        title: null,
        description: null,
        assigneeEmail: null,
        dueDate: null,
        priority: null,
        message: "❌ Gemini API key not configured. Please set GEMINI_API_KEY environment variable.",
      });
    }

    try {
      console.log("[TaskerBot] Initializing Gemini...");
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-pro"
      });

      const teamContext =
        teamMembers.length > 0 ? `\n\nTeam Members:\n${formatTeamMembers(teamMembers)}` : "";

      console.log("[TaskerBot] Calling Gemini API...");
      console.log("[TaskerBot] User message:", message);

      const response = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: message + teamContext }] }],
        systemInstruction: SYSTEM_PROMPT,
        generationConfig: {
          temperature: 0.8, // Slightly higher for more natural responses
          maxOutputTokens: 500,
        },
      });

      console.log("[TaskerBot] Got Gemini response");

      const responseText = response.response.text();
      console.log("[TaskerBot] Raw response text:", responseText);

      let parsed: TaskerBotResponse;
      try {
        parsed = parseGeminiResponse(responseText);
        console.log("[TaskerBot] Parsed successfully - Action:", parsed.action);
      } catch (parseError) {
        console.error("[TaskerBot] Parse error:", parseError);
        console.error("[TaskerBot] Response text that failed to parse:", responseText);
        throw parseError;
      }

      // Post-process due date
      if (parsed.dueDate && !parsed.dueDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const calculated = calculateDueDate(parsed.dueDate);
        if (calculated) parsed.dueDate = calculated;
      }

      // Smart team member matching
      if (!parsed.assigneeEmail && teamMembers.length > 0) {
        const combined = (message + " " + (parsed.title || "")).toLowerCase();
        for (const member of teamMembers) {
          if (
            combined.includes(member.name.toLowerCase()) ||
            combined.includes(member.email.split("@")[0].toLowerCase())
          ) {
            parsed.assigneeEmail = member.email;
            break;
          }
        }
      }

      const duration = Date.now() - startTime;
      console.log("[TaskerBot] ✅ Success in", `${duration}ms`);

      return NextResponse.json(parsed);
    } catch (geminiError) {
      console.error("[TaskerBot] ❌ Gemini error:", geminiError);
      const duration = Date.now() - startTime;
      return NextResponse.json({
        action: null,
        title: null,
        description: null,
        assigneeEmail: null,
        dueDate: null,
        priority: null,
        message: `Error connecting to AI: ${geminiError instanceof Error ? geminiError.message : "Unknown error"}`,
      });
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("[TaskerBot] Unexpected error:", error, `(${duration}ms)`);

    return NextResponse.json({
      action: null,
      title: null,
      description: null,
      assigneeEmail: null,
      dueDate: null,
      priority: null,
      message: `Error: ${error instanceof Error ? error.message : "Unknown"}. Try: 'create a task called X'`,
    });
  }
}