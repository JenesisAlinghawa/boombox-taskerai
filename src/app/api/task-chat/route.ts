import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

interface TeamMember {
  id: number;
  name: string;
  email: string;
}

interface TaskerBotRequest {
  message: string;
  teamMembers: TeamMember[];
}

interface TaskerBotResponse {
  action: "create" | "assign" | "update" | "delete" | "query" | null;
  title: string | null;
  description: string | null;
  assigneeEmail: string | null;
  dueDate: string | null;
  priority: "low" | "medium" | "high" | null;
  message: string;
}

const SYSTEM_PROMPT = `You are TaskerBot, a super smart, friendly, and helpful task assistant inspired by Grok. 

You understand natural language extremely well — typos, abbreviations, incomplete sentences, all requirements at once — you're very forgiving and intelligent.

Your ONLY job is to help create, assign, update, query, or delete tasks in a team management app.

For non-task messages, reply: "I'm your task assistant — i can create tasks for you! 😊"

Respond naturally, conversationally, encouraging, with light humor when it fits.

Always confirm actions clearly and use correct team member emails.

When extracting dates, interpret natural language:
- "tomorrow" = next day
- "next Friday" = upcoming Friday
- "in 3 days" = 3 days from now
- ISO format: YYYY-MM-DD

Output ONLY valid JSON with NO markdown or extra text:
{
  "action": "create" | "assign" | "update" | "delete" | "query" | null,
  "title": "task title or null",
  "description": "task description or null",
  "assigneeEmail": "matched team member email or null",
  "dueDate": "ISO date YYYY-MM-DD or null",
  "priority": "low" | "medium" | "high" | null,
  "message": "friendly response to user"
}

Be smart about matching team members by name or partial email. If ambiguous, ask!`;

function formatTeamMembers(members: TeamMember[]): string {
  if (!members.length) return "No team members available.";
  return members.map((m) => `- ${m.name} (${m.email})`).join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TaskerBotRequest;
    const { message, teamMembers = [] } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        {
          action: null,
          title: null,
          description: null,
          assigneeEmail: null,
          dueDate: null,
          priority: null,
          message: "Please type something!",
        },
        { status: 200 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        {
          action: null,
          title: null,
          description: null,
          assigneeEmail: null,
          dueDate: null,
          priority: null,
          message: "❌ API key not configured. Please set GEMINI_API_KEY in your environment.",
        },
        { status: 200 }
      );
    }

    // Use the correct, stable model (free tier friendly)
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash", // Fast, reliable, free tier — this fixes the 404 error!
      generationConfig: {
        temperature: 0.85,
        maxOutputTokens: 500,
        responseMimeType: "application/json", // Forces clean JSON output!
      },
    });

    const teamContext = `\n\nAvailable team members:\n${formatTeamMembers(teamMembers)}`;

    let responseText = "";

    try {
      console.log("[TaskerBot] Sending to Gemini API...", { message, teamMembersCount: teamMembers.length });
      
      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: `${message}${teamContext}` }],
          },
        ],
        systemInstruction: SYSTEM_PROMPT,
      });

      console.log("[TaskerBot] Got response from Gemini:", typeof result);

      // The correct way to get text from GenerateContentResult
      const response = result.response;
      if (!response) {
        throw new Error("No response from Gemini");
      }

      // response.text() is the method to get text
      if (typeof response.text === "function") {
        console.log("[TaskerBot] Using response.text() function");
        responseText = response.text();
      } else {
        console.log("[TaskerBot] Response structure:", JSON.stringify(response).substring(0, 300));
        throw new Error("response.text is not a function");
      }

      console.log("[TaskerBot] Response text:", responseText.substring(0, 200));
    } catch (geminiError) {
      console.error("[TaskerBot] Gemini API error:", geminiError);
      return NextResponse.json(
        {
          action: null,
          title: null,
          description: null,
          assigneeEmail: null,
          dueDate: null,
          priority: null,
          message: "Oops, I'm having a quick moment. Try again in a sec? 😅",
        },
        { status: 200 }
      );
    }

    let parsed: TaskerBotResponse;

    try {
      parsed = JSON.parse(responseText);
    } catch (parseError) {
      console.error("JSON parse error. Raw response:", responseText);
      return NextResponse.json(
        {
          action: null,
          title: null,
          description: null,
          assigneeEmail: null,
          dueDate: null,
          priority: null,
          message: "Hmm... I didn't quite catch that. Can you tell me more about the task?",
        },
        { status: 200 }
      );
    }

    // Ensure message field exists
    if (!parsed.message || typeof parsed.message !== "string") {
      parsed.message = "Got it! How else can I help with your tasks?";
    }

    // Post-process due date if needed (optional - AI should return ISO, but fallback)
    if (parsed.dueDate && !parsed.dueDate.includes("-")) {
      const calculated = calculateDueDate(parsed.dueDate);
      if (calculated) parsed.dueDate = calculated;
    }

    // Smart team member matching fallback (if AI didn't match)
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

    return NextResponse.json(parsed, { status: 200 });
  } catch (error) {
    console.error("TaskerBot API error:", error);
    return NextResponse.json(
      {
        action: null,
        title: null,
        description: null,
        assigneeEmail: null,
        dueDate: null,
        priority: null,
        message: `I'm here to help! Try asking me to create, assign, or update a task. (Error: ${error instanceof Error ? error.message : "Unknown"})`,
      },
      { status: 200 }
    );
  }
}

// Helper function for date parsing
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