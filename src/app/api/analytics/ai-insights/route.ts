import { NextRequest, NextResponse } from "next/server";

interface InsightRequest {
  completed: number;
  inProgress: number;
  pending: number;
  overdue: number;
  total: number;
}

async function generateAIInsight(data: InsightRequest): Promise<string> {
  try {
    const prompt = `You are an AI business analyst. Based on task execution data, provide a concise, actionable insight (1-2 sentences) in a friendly tone. Use "your team" instead of generic language.

Task Data:
- Total Tasks: ${data.total}
- Completed: ${data.completed}
- In Progress: ${data.inProgress}
- Pending: ${data.pending}
- Overdue: ${data.overdue}

Generate a brief, insightful observation about the team's current task execution status. Be encouraging but honest. Focus on what's happening and what the team should focus on next.`;

    const response = await fetch("https://api-inference.huggingface.co/models/mistral-community/Mistral-7B-Instruct-v0.1", {
      headers: { Authorization: `Bearer ${process.env.HUGGING_FACE_API_KEY}` },
      method: "POST",
      body: JSON.stringify({ inputs: prompt, parameters: { max_length: 150, temperature: 0.7 } }),
    });

    if (!response.ok) {
      console.error("[AI Insights] Hugging Face API error:", response.status, response.statusText);
      return generateFallbackInsight(data);
    }

    const result = await response.json();
    
    if (Array.isArray(result) && result[0]?.generated_text) {
      // Extract the generated text after the prompt
      const generatedText = result[0].generated_text;
      const insightText = generatedText.includes(prompt) 
        ? generatedText.split(prompt)[1].trim()
        : generatedText;
      
      // Clean up and return first 1-2 sentences
      const sentences = insightText.match(/[^.!?]+[.!?]+/g) || [];
      return sentences.slice(0, 2).join(" ").trim() || generateFallbackInsight(data);
    }

    return generateFallbackInsight(data);
  } catch (error) {
    console.error("[AI Insights] Error calling Hugging Face API:", error);
    return generateFallbackInsight(data);
  }
}

function generateFallbackInsight(data: InsightRequest): string {
  if (data.total === 0) {
    return "No tasks yet. Start by creating your first task for your team to begin tracking progress.";
  }

  const completionRate = Math.round((data.completed / data.total) * 100);
  const inProgressRatio = data.inProgress / data.total;
  
  if (data.overdue > 0) {
    const overduePercentage = Math.round((data.overdue / data.total) * 100);
    return `Your team has ${overduePercentage}% overdue tasks (${data.overdue} total). Focus on completing these urgent items and the ${data.inProgress} in-progress tasks to improve overall productivity.`;
  }

  if (completionRate > 80) {
    return `Excellent work! Your team has achieved a ${completionRate}% completion rate. Keep maintaining this momentum with the ${data.pending} pending tasks.`;
  }

  if (completionRate > 50) {
    return `Your team is making solid progress with ${completionRate}% of tasks completed. ${data.pending + data.inProgress} tasks remain—prioritize the ${data.pending} pending ones to accelerate delivery.`;
  }

  if (data.pending > 0 && data.inProgress === 0 && data.completed === 0) {
    return `All ${data.pending} tasks are pending. Your team should start working on these tasks to build momentum and improve the completion rate.`;
  }

  return `Your team is progressing with ${completionRate}% completion and ${data.inProgress} tasks in progress. Consider prioritizing the ${data.pending} pending tasks to accelerate the workflow.`;
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
