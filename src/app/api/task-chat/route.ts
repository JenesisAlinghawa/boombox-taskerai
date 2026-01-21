import { HfInference } from "@huggingface/inference";
import { NextRequest, NextResponse } from "next/server";

const client = new HfInference(process.env.HUGGINGFACE_API_KEY || "");

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
  const startTime = Date.now();
  
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

    // Check for Hugging Face API key
    if (!process.env.HUGGINGFACE_API_KEY) {
      console.error("[TaskerBot] ❌ HUGGINGFACE_API_KEY not configured!");
      return NextResponse.json(
        {
          action: null,
          title: null,
          description: null,
          assigneeEmail: null,
          dueDate: null,
          priority: null,
          message: "❌ Hugging Face API key not configured. Please set HUGGINGFACE_API_KEY.",
        },
        { status: 200 }
      );
    }

    console.log("[TaskerBot] Using HF API key:", process.env.HUGGINGFACE_API_KEY.slice(0, 10) + "...");

    const teamContext = `\n\nAvailable team members:\n${formatTeamMembers(teamMembers)}`;
    
    // Build the full prompt with system instructions
    const fullPrompt = `${SYSTEM_PROMPT}\n\nUser message: ${message}${teamContext}`;
    
    console.log("[TaskerBot] 📤 Sending prompt to Hugging Face (Llama 3.1):");
    console.log("[TaskerBot] Input (first 150 chars):", fullPrompt.slice(0, 150) + "...");

    let responseText = "";

    try {
      // Call Hugging Face Inference API using Llama 3.1
      const response = await client.textGeneration({
        model: "meta-llama/Llama-2-7b-chat-hf", // Using Llama-2 for better free-tier availability
        inputs: fullPrompt,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.85,
          top_p: 0.95,
          repetition_penalty: 1.2,
          do_sample: true,
        },
      });

      responseText = response.generated_text || "";
      
      // Remove the prompt from the response (HF includes the input in output)
      if (responseText.includes(message)) {
        responseText = responseText.substring(responseText.indexOf(message) + message.length).trim();
      }

      console.log("[TaskerBot] 📥 HF raw response (first 300 chars):", responseText.slice(0, 300) + "...");
      
      // Try to extract JSON from the response
      // Llama might wrap it or add explanation, so we need to find the JSON object
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        responseText = jsonMatch[0];
      }
      
    } catch (hfError) {
      console.error("[TaskerBot] ❌ Hugging Face API Error:", hfError);
      const errorMsg = hfError instanceof Error ? hfError.message : "Unknown HF error";
      console.error("[TaskerBot] Error details:", errorMsg);
      
      return NextResponse.json(
        {
          action: null,
          title: null,
          description: null,
          assigneeEmail: null,
          dueDate: null,
          priority: null,
          message: "Oops, I'm having a quick moment. Try again? 😅",
        },
        { status: 200 }
      );
    }

    // Parse the JSON response
    let parsed: TaskerBotResponse;

    try {
      parsed = JSON.parse(responseText);
      console.log("[TaskerBot] ✅ Parsed JSON:", JSON.stringify(parsed).slice(0, 200) + "...");
    } catch (parseError) {
      console.error("[TaskerBot] ❌ JSON parse error. Raw response:", responseText);
      console.error("[TaskerBot] Parse error:", parseError);
      
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

    // Post-process due date if needed
    if (parsed.dueDate && !parsed.dueDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
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

    const duration = Date.now() - startTime;
    console.log(`[TaskerBot] ⏱️  Completed in ${duration}ms`);

    return NextResponse.json(parsed, { status: 200 });
    
  } catch (error) {
    console.error("[TaskerBot] ❌ Overall error:", error);
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    
    return NextResponse.json(
      {
        action: null,
        title: null,
        description: null,
        assigneeEmail: null,
        dueDate: null,
        priority: null,
        message: `I'm here to help! Try asking me to create, assign, or update a task. (Error: ${errorMsg})`,
      },
      { status: 200 }
    );
  }
}