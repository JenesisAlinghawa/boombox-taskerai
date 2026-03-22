import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { HfInference } from '@huggingface/inference';

// Create the Hugging Face client once (same as TaskerBot)
const inference = new HfInference(process.env.HUGGINGFACE_API_KEY);

interface TaskDetail {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  dueDate?: string;
  assignee?: string;
}

interface InsightRequest {
  completed: number;
  inProgress: number;
  pending: number;
  overdue: number;
  total: number;
  tasks?: TaskDetail[]; // Optional task details for better analysis
}

async function generateAIInsight(data: InsightRequest): Promise<string> {
  try {
    // Build task details string if provided
    let taskDetailsString = "";
    if (data.tasks && data.tasks.length > 0) {
      taskDetailsString = `

Task Details:
${data.tasks.map((task) => {
            const desc = task.description ? ` - ${task.description}` : "";
            const dueInfo = task.dueDate ? ` (Due: ${task.dueDate})` : "";
            const assignInfo = task.assignee ? ` [Assigned to: ${task.assignee}]` : "";
            return `- [${task.status}] ${task.title}${desc}${assignInfo}${dueInfo}`;
          }).join("\n")}`;
    }

    const userMessage = `Based on this task execution data, provide a concise, actionable insight (1-2 sentences) in a friendly tone. Use "your team" instead of generic language.

Task Data:
- Total Tasks: ${data.total}
- Completed: ${data.completed}
- In Progress: ${data.inProgress}
- Pending: ${data.pending}
- Overdue: ${data.overdue}${taskDetailsString}

Generate a brief, insightful observation about the team's current task execution status. Be encouraging but honest. Focus on what's happening and what the team should focus on next. If specific task titles are provided, reference them if relevant.`;

    console.log("[AI Insights] Generating insight using HfInference (same as TaskerBot)...");
    
    // Use the same HfInference client as TaskerBot - this is what works!
    if (!process.env.HUGGINGFACE_API_KEY) {
      console.warn("[AI Insights] Hugging Face API key not configured. Using enhanced fallback insights.");
      return generateFallbackInsight(data);
    }

    try {
      // Use chatCompletion exactly like TaskerBot does - this is the working approach!
      const response = await inference.chatCompletion({
        model: "meta-llama/Llama-3.1-8B-Instruct",
        messages: [
          {
            role: "system",
            content: "You are an AI business analyst specializing in team productivity and task management. Provide clear, actionable insights based on task data."
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        max_tokens: 150,
        temperature: 0.7,
      });

      console.log("[AI Insights] API response received successfully");

      // Extract the content exactly like TaskerBot does
      const insight = response?.choices?.[0]?.message?.content?.trim();

      if (insight && insight.length > 10) {
        console.log("[AI Insights] Successfully generated:", insight.slice(0, 100));
        return insight;
      }

      console.warn("[AI Insights] Response missing content, using fallback");
      return generateFallbackInsight(data);
    } catch (apiError) {
      console.error("[AI Insights] Hugging Face API error:", apiError);
      return generateFallbackInsight(data);
    }
  } catch (error) {
    console.error("[AI Insights] Error in generateAIInsight:", error);
    return generateFallbackInsight(data);
  }
}

function generateFallbackInsight(data: InsightRequest): string {
  if (data.total === 0) {
    return "No tasks yet. Start by creating your first task for your team to begin tracking progress.";
  }

  const completionRate = Math.round((data.completed / data.total) * 100);
  const inProgressRatio = data.inProgress / data.total;
  
  // If we have task details, generate smarter insights based on specific tasks
  if (data.tasks && data.tasks.length > 0) {
    const overdueTasks = data.tasks.filter(t => t.status !== "completed" && t.dueDate && new Date(t.dueDate) < new Date());
    const soonTasks = data.tasks.filter(t => t.status !== "completed" && t.dueDate && new Date(t.dueDate) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000));
    const highPriorityTasks = data.tasks.filter(t => t.priority === "high" && t.status !== "completed");
    
    let insight = "";
    
    if (overdueTasks.length > 0) {
      const overdueNames = overdueTasks.slice(0, 2).map(t => `"${t.title}"`).join(", ");
      insight = `⚠️ ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? "s" : ""} need immediate attention: ${overdueNames}. Prioritize these to prevent delays.`;
    } else if (highPriorityTasks.length > 0) {
      const highNames = highPriorityTasks.slice(0, 2).map(t => `"${t.title}"`).join(", ");
      insight = `🎯 Focus on high-priority tasks: ${highNames}. These require immediate attention to stay on track.`;
    } else if (data.inProgress === 0 && data.pending > 0) {
      const pendingNames = data.tasks.filter(t => t.status === "pending").slice(0, 2).map(t => `"${t.title}"`).join(", ");
      insight = `📌 Get started! Begin with: ${pendingNames}. Starting these tasks will build momentum for the team.`;
    } else if (completionRate > 80) {
      const inProgressNames = data.tasks.filter(t => t.status !== "completed" && t.status !== "pending").slice(0, 1).map(t => `"${t.title}"`).join(", ");
      insight = `✨ Excellent progress! ${completionRate}% complete. Finish ${inProgressNames || "the remaining tasks"} to close strong.`;
    } else if (completionRate > 50) {
      insight = `📊 Solid progress! ${completionRate}% complete with ${data.pending} pending tasks. Keep the momentum going to hit your goals.`;
    } else {
      insight = `🚀 Team is working on ${data.inProgress} task${data.inProgress !== 1 ? "s" : ""} with ${data.pending} pending. Prioritize the highest-impact items next.`;
    }
    
    return insight;
  }
  
  // Fallback if no task details provided
  if (data.overdue > 0) {
    const overduePercentage = Math.round((data.overdue / data.total) * 100);
    return `⚠️ Your team has ${overduePercentage}% overdue tasks (${data.overdue} total). Focus on completing these urgent items first.`;
  }

  if (completionRate > 80) {
    return `✨ Excellent work! Your team has achieved a ${completionRate}% completion rate. Keep maintaining this momentum!`;
  }

  if (completionRate > 50) {
    return `📊 Your team is making solid progress with ${completionRate}% of tasks completed. ${data.pending + data.inProgress} tasks remain—prioritize to accelerate delivery.`;
  }

  if (data.pending > 0 && data.inProgress === 0 && data.completed === 0) {
    return `🚀 All ${data.pending} tasks are pending. Start working on these to build momentum and improve the completion rate.`;
  }

  return `📈 Your team is progressing with ${completionRate}% completion and ${data.inProgress} tasks in progress. Focus on the ${data.pending} pending tasks next.`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as InsightRequest;

    // Validate input
    if (typeof body.total !== "number" || body.total < 0) {
      return NextResponse.json(
        { error: "Invalid input: total must be a non-negative number" },
        { status: 400 }
      );
    }

    const insight = await generateAIInsight(body);

    return NextResponse.json({ insight }, { status: 200 });
  } catch (error) {
    console.error("[AI Insights API] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate AI insights" },
      { status: 500 }
    );
  }
}
