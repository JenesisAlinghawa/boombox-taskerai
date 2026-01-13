import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

interface TaskData {
  tasks: any[];
  members: any[];
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  overdueTasks: number;
  avgTasksPerMember: number;
}

interface AIRecommendation {
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  icon: string;
}

interface AITrend {
  text: string;
  icon: string;
}

function generateRecommendations(
  completionRate: number,
  overdueTasks: number,
  totalTasks: number,
  completedTasks: number,
  memberCount: number
): AIRecommendation[] {
  const recommendations: AIRecommendation[] = [];

  if (completionRate < 50) {
    recommendations.push({
      title: "Improve Task Completion Rate",
      description: "Current completion rate is below 50%. Consider breaking down larger tasks, improving team communication, or reallocating resources.",
      impact: "high",
      icon: "rocket",
    });
  }

  if (overdueTasks > totalTasks * 0.2) {
    recommendations.push({
      title: "Address Overdue Tasks",
      description: "More than 20% of tasks are overdue. Review task deadlines, dependencies, and team capacity.",
      impact: "high",
      icon: "alarm",
    });
  }

  if (memberCount > 0 && completedTasks / memberCount < 5) {
    recommendations.push({
      title: "Optimize Team Capacity",
      description: "Average task completion per member is low. Consider workload redistribution or additional support.",
      impact: "medium",
      icon: "groups",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: "Maintain Momentum",
      description: "Team is performing well. Continue current practices and look for optimization opportunities.",
      impact: "medium",
      icon: "thumbsup",
    });
  }

  return recommendations;
}

function generateTrends(
  completionRate: number,
  overdueTasks: number,
  tasks: any[]
): AITrend[] {
  const trends: AITrend[] = [];

  if (completionRate > 75) {
    trends.push({
      text: "Strong task completion momentum",
      icon: "up",
    });
  } else if (completionRate < 40) {
    trends.push({
      text: "Task completion rate declining",
      icon: "down",
    });
  }

  if (overdueTasks > 0) {
    trends.push({
      text: "Overdue tasks require immediate attention",
      icon: "warning",
    });
  } else {
    trends.push({
      text: "All tasks on schedule",
      icon: "checkmark",
    });
  }

  return trends;
}

export async function POST(request: NextRequest) {
  try {
    const data: TaskData = await request.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 400 }
      );
    }

    // Prepare data summary for Gemini
    const taskSummary = `
TASK PERFORMANCE & CAMPAIGN ANALYSIS DATA:

Overall Metrics:
- Total Tasks: ${data.totalTasks}
- Completed Tasks: ${data.completedTasks}
- Completion Rate: ${data.completionRate}%
- Overdue Tasks: ${data.overdueTasks}
- Team Members: ${data.members?.length || 0}
- Avg Tasks per Member: ${data.avgTasksPerMember}

Task Status Distribution:
${
  Object.entries(
    data.tasks?.reduce(
      (acc: any, task: any) => {
        const status = task.status || "unknown";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {}
    ) || {}
  )
    .map(([status, count]) => `- ${status}: ${count}`)
    .join("\n") || "No data"
}

ANALYSIS CONTEXT:
This data represents task execution performance for social media campaigns and public relations strategies. Analyze completion rates as campaign delivery success, overdue tasks as PR timeline risks, and team capacity as resource allocation for marketing initiatives.

REQUIRED ANALYSIS:
1. Social Media Campaign Performance: Evaluate task completion in the context of campaign execution timelines, content calendar adherence, and posting schedule reliability
2. Public Relations Strategy Insights: Assess team capacity for handling PR activities, response times to critical tasks, and ability to manage multiple initiatives simultaneously
3. Market Trend Detection: Identify patterns in task execution that indicate campaign momentum, team engagement levels, and capability to scale PR efforts
4. Actionable Recommendations: Provide 3-4 specific, tactical recommendations for improving social media campaign delivery and PR strategy execution

RESPONSE FORMAT (VALID JSON ONLY):
{
  "recommendations": [
    {
      "title": "Specific social media or PR strategy recommendation",
      "description": "Detailed action items for campaign optimization or PR improvement based on task data",
      "impact": "high|medium|low",
      "icon": "recommendation category (e.g., 'rocket', 'alarm', 'chart', 'thumbsup', 'groups')"
    }
  ],
  "trends": [
    {
      "text": "Market trend observation relevant to social media or PR execution",
      "icon": "trend indicator (e.g., 'up', 'down', 'warning', 'checkmark', 'activity')"
    }
  ],
  "performanceSummary": "Comprehensive analysis of campaign performance, PR execution capability, team readiness for scaled initiatives, and strategic next steps for social media and public relations"
}

IMPORTANT: Return ONLY valid JSON, no additional text.
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    let aiData: any = null;
    try {
      const result = await model.generateContent(taskSummary);

      // Try several common shapes to extract text/json from the response
      let text = "";
      try {
        const response = (result as any).response || (result as any).output?.[0] || result;
        if (!response) {
          text = JSON.stringify(result);
        } else if (typeof response === "string") {
          text = response;
        } else if (typeof response.text === "function") {
          text = await response.text();
        } else if (typeof response.text === "string") {
          text = response.text;
        } else if ((result as any).output && (result as any).output[0]?.content) {
          const content = (result as any).output[0].content.find((c: any) => c.type === "output_text") || (result as any).output[0].content[0];
          text = content?.text || JSON.stringify(result);
        } else {
          text = JSON.stringify(result);
        }
      } catch (parseErr) {
        console.warn("AI response parse attempt failed, will fallback", parseErr);
        text = "";
      }

      if (text) {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiData = JSON.parse(jsonMatch[0]);
        } else {
          // Try to parse as JSON directly
          try {
            aiData = JSON.parse(text);
          } catch (e) {
            aiData = null;
          }
        }
      }
    } catch (aiErr) {
      console.warn("AI model call failed, will fallback:", aiErr);
      aiData = null;
    }

    // Map icons to icons8 URLs
    const iconMap: Record<string, string> = {
      rocket: "https://img.icons8.com/color/96/000000/rocket.png",
      alarm: "https://img.icons8.com/color/96/000000/alarm.png",
      chart: "https://img.icons8.com/color/96/000000/combo-chart.png",
      thumbsup: "https://img.icons8.com/color/96/000000/thumb-up.png",
      handshake: "https://img.icons8.com/color/96/000000/handshake.png",
      groups: "https://img.icons8.com/color/96/000000/groups.png",
      warning: "https://img.icons8.com/color/96/000000/error.png",
      up: "https://img.icons8.com/color/96/000000/up.png",
      down: "https://img.icons8.com/color/96/000000/down.png",
      right: "https://img.icons8.com/color/96/000000/right.png",
      checkmark: "https://img.icons8.com/color/96/000000/checkmark.png",
      activity: "https://img.icons8.com/color/96/000000/activity.png",
      error: "https://img.icons8.com/color/96/000000/error.png",
      // Social media & PR specific icons
      socialmedia: "https://img.icons8.com/color/96/000000/facebook-new.png",
      campaign: "https://img.icons8.com/color/96/000000/bullhorn.png",
      engagement: "https://img.icons8.com/color/96/000000/hearts.png",
      growth: "https://img.icons8.com/color/96/000000/growth.png",
      analytics: "https://img.icons8.com/color/96/000000/combo-chart.png",
      publicrelations: "https://img.icons8.com/color/96/000000/megaphone.png",
      strategy: "https://img.icons8.com/color/96/000000/strategy.png",
      audience: "https://img.icons8.com/color/96/000000/contacts.png",
      content: "https://img.icons8.com/color/96/000000/document.png",
      default: "https://img.icons8.com/color/96/000000/info.png",
    };

    if (!aiData) {
      // Fallback using simple rule-based logic when AI is unavailable or unparseable
      const fallbackRecs = generateRecommendations(
        data.completionRate,
        data.overdueTasks,
        data.totalTasks,
        data.completedTasks,
        data.members?.length || 0
      );
      const fallbackTrends = generateTrends(data.completionRate, data.overdueTasks, data.tasks || []);
      return NextResponse.json({
        recommendations: fallbackRecs,
        trends: fallbackTrends,
        performanceSummary: "",
      });
    }

    // Enhance recommendations with icons8 URLs (aiData may already include icon keys)
    const recommendations: AIRecommendation[] = (aiData.recommendations || []).map((rec: any) => ({
      title: rec.title,
      description: rec.description,
      impact: rec.impact || "low",
      icon: iconMap[(rec.icon || "default").toString().toLowerCase()] || iconMap.default,
    }));

    // Enhance trends with icons8 URLs
    const trends: AITrend[] = (aiData.trends || []).map((trend: any) => ({
      text: typeof trend === "string" ? trend : trend.text || JSON.stringify(trend),
      icon: iconMap[(trend.icon || "default").toString().toLowerCase()] || iconMap.default,
    }));

    return NextResponse.json({
      recommendations,
      trends,
      performanceSummary: aiData.performanceSummary || "",
    });
  } catch (error) {
    console.error("AI Analytics Error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate AI analytics",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
