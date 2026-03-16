import { NextRequest, NextResponse } from "next/server";
import { HfInference } from '@huggingface/inference';

const inference = new HfInference(process.env.HUGGINGFACE_API_KEY);

function getUserIdFromRequest(request: NextRequest): string | null {
  return request.headers.get('x-user-id');
}

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { tasks } = await request.json();

    if (!tasks || !Array.isArray(tasks)) {
      return NextResponse.json(
        { error: "Invalid tasks data" },
        { status: 400 }
      );
    }

    if (!process.env.HUGGINGFACE_API_KEY) {
      return NextResponse.json(
        { error: "HUGGINGFACE_API_KEY not configured" },
        { status: 500 }
      );
    }

    // Format tasks for AI analysis
    const taskSummary = tasks.map((task: any, idx: number) => ({
      id: task.id,
      index: idx + 1,
      title: task.title,
      priority: task.priority || "medium",
      status: task.status || "todo",
      dueDate: task.dueDate || "no deadline",
      description: task.description || "no description",
    }));

    const prompt = `You are a project management expert analyzing task prioritization. 

Given these tasks, provide intelligent prioritization recommendations considering:
1. Deadline urgency (tasks due sooner = higher priority)
2. Priority level (high priority tasks matter more)
3. Current status (stuck or in-progress tasks need attention)
4. Task complexity (assess from title/description)
5. Dependencies (identify which tasks likely block others)
6. Business impact (assess which tasks are most valuable)

Tasks to analyze:
${JSON.stringify(taskSummary, null, 2)}

Respond in JSON format with:
{
  "priorityAdjustments": [
    {
      "taskId": number,
      "taskTitle": string,
      "recommendedOrder": number,
      "reason": string,
      "urgencyBoost": number (0-50, how much to boost priority),
      "riskLevel": "high" | "medium" | "low" (risk of task failing/missing deadline)
    }
  ],
  "insights": [
    {
      "type": "warning" | "opportunity" | "insight",
      "title": string,
      "description": string
    }
  ],
  "summary": "Brief strategic recommendation"
}`;

    const result = await inference.textGeneration({
      model: "mistralai/Mistral-7B-Instruct-v0.1",
      inputs: prompt,
      parameters: {
        max_new_tokens: 1024,
      },
    });
    const responseText = result.generated_text;

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON in AI response");
    }

    const aiAnalysis = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      success: true,
      analysis: aiAnalysis,
    });
  } catch (error) {
    console.error("Task prioritization AI error:", error);
    return NextResponse.json(
      { 
        error: "Failed to analyze tasks with AI",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
