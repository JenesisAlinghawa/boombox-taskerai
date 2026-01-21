import { HfInference } from '@huggingface/inference';
import { NextRequest, NextResponse } from "next/server";

const inference = new HfInference(process.env.HUGGINGFACE_API_KEY);

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

// Template variations for diverse recommendations
const recommendationTemplates = {
  lowCompletion: [
    {
      title: "Let's Boost That Completion Rate 🚀",
      description: "Your team's sitting at {rate}% completion — there's huge potential here! Try breaking tasks into smaller, bite-sized pieces or having a quick sync to understand any blockers. Sometimes it's just about visibility.",
    },
    {
      title: "Time to Unlock More Momentum",
      description: "Only {rate}% of tasks are wrapped up. This might signal that tasks are too big, unclear, or the team needs a little support. Let's figure out what's stuck and get rolling again.",
    },
    {
      title: "Completion Rate Needs Some Love",
      description: "At {rate}%, your completion rate is telling you something — maybe tasks need clearer goals, better prioritization, or a team huddle. Don't worry, this is totally fixable!",
    },
  ],
  overdueTasks: [
    {
      title: "Overdue Tasks Are Calling Out",
      description: "You've got {count} tasks past their due date. Let's prioritize and get these moving — sometimes it's just about a quick conversation or reassigning resources to unstuck things.",
    },
    {
      title: "Time to Handle Those Overdue Items",
      description: "With {count} overdue tasks, the team might be feeling the pressure. Check if deadlines are realistic, if dependencies are blocking progress, or if anyone needs backup.",
    },
    {
      title: "Your Overdue Queue Needs Attention",
      description: "{count} tasks are overdue, which could mean deadlines are unrealistic, priorities are unclear, or the team's stretched thin. Let's dig in and find solutions together.",
    },
  ],
  lowCapacity: [
    {
      title: "Let's Optimize Team Bandwidth",
      description: "Your team's averaging only {avg} tasks per person — that could mean tasks are complex, people are overloaded elsewhere, or there's room to redistribute. Let's find the right balance.",
    },
    {
      title: "Team Capacity Has Room to Grow",
      description: "At {avg} tasks per person, there might be untapped potential here. Either tasks are really meaty (good!), or there's room to adjust workload and speed things up.",
    },
    {
      title: "Check Your Workload Distribution",
      description: "With only {avg} tasks per team member, it's worth asking: are some people overloaded while others have breathing room? Smart distribution could level things up.",
    },
  ],
  goodMomentum: [
    {
      title: "Your Team Is Crushing It! 💪",
      description: "Keep doing what you're doing — your team's performance is impressive. Stay curious, keep the communication flowing, and look for small ways to optimize even more.",
    },
    {
      title: "Great Work, Team!",
      description: "The team's performing well and staying on schedule. This is solid. Keep the positive energy, celebrate wins, and keep an eye out for ways to scale.",
    },
    {
      title: "You're Nailing This",
      description: "Performance looks great from here. The team's delivering consistently, which means your processes are working. Nice! Keep the momentum and refine where you can.",
    },
  ],
};

// Template variations for diverse trends
const trendTemplates = {
  strongCompletion: [
    "Team's crushing completion goals — momentum is real! 📈",
    "Strong completion streak happening — keep the energy up! 🔥",
    "Completion numbers are looking fantastic — team's in flow state.",
  ],
  weaker: [
    "Completion rate's dipping — might be time to regroup.",
    "Tasks are piling up a bit — could use some team sync.",
    "Momentum's slowing — let's find out what's blocking progress.",
  ],
  overdueIssue: [
    "{count} tasks are overdue — timeline check needed! ⚠️",
    "Overdue queue alert: {count} tasks need attention.",
    "Watch out: {count} tasks are past deadline.",
  ],
  onTrack: [
    "All tasks on schedule — timeline's looking good! ✅",
    "No overdue tasks — your deadlines are holding strong.",
    "Everyone's on track — that's the way to do it! ✓",
  ],
};

// Empty state messages
const emptyStateMessages = [
  "You're just getting started — excited to help once tasks are added! 🚀",
  "No tasks yet, but that's totally fine! Start adding some, and we'll help you conquer them.",
  "Ready to go? Add some tasks and let's make magic happen together! ✨",
  "Great timing to kick things off — add tasks and let's get rolling!",
];

function getRandomTemplate(templates: string[]): string {
  return templates[Math.floor(Math.random() * templates.length)];
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
    const template = recommendationTemplates.lowCompletion[
      Math.floor(Math.random() * recommendationTemplates.lowCompletion.length)
    ];
    recommendations.push({
      title: template.title,
      description: template.description.replace("{rate}", completionRate.toFixed(0)),
      impact: "high",
      icon: "rocket",
    });
  }

  if (overdueTasks > totalTasks * 0.2) {
    const template = recommendationTemplates.overdueTasks[
      Math.floor(Math.random() * recommendationTemplates.overdueTasks.length)
    ];
    recommendations.push({
      title: template.title,
      description: template.description.replace("{count}", overdueTasks.toString()),
      impact: "high",
      icon: "alarm",
    });
  }

  if (memberCount > 0 && completedTasks / memberCount < 5) {
    const template = recommendationTemplates.lowCapacity[
      Math.floor(Math.random() * recommendationTemplates.lowCapacity.length)
    ];
    recommendations.push({
      title: template.title,
      description: template.description.replace("{avg}", (completedTasks / memberCount).toFixed(1)),
      impact: "medium",
      icon: "groups",
    });
  }

  if (recommendations.length === 0) {
    const template = recommendationTemplates.goodMomentum[
      Math.floor(Math.random() * recommendationTemplates.goodMomentum.length)
    ];
    recommendations.push({
      title: template.title,
      description: template.description,
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
      text: getRandomTemplate(trendTemplates.strongCompletion),
      icon: "up",
    });
  } else if (completionRate < 40) {
    trends.push({
      text: getRandomTemplate(trendTemplates.weaker),
      icon: "down",
    });
  }

  if (overdueTasks > 0) {
    trends.push({
      text: getRandomTemplate(trendTemplates.overdueIssue).replace("{count}", overdueTasks.toString()),
      icon: "warning",
    });
  } else {
    trends.push({
      text: getRandomTemplate(trendTemplates.onTrack),
      icon: "checkmark",
    });
  }

  return trends;
}

export async function POST(request: NextRequest) {
  try {
    const data: TaskData = await request.json();

    if (!process.env.HUGGINGFACE_API_KEY) {
      return NextResponse.json(
        { error: "Hugging Face API key not configured" },
        { status: 400 }
      );
    }

    // Handle empty task list with a welcoming message
    if (data.totalTasks === 0) {
      const emptyMessage = getRandomTemplate(emptyStateMessages);
      return NextResponse.json({
        recommendations: [],
        trends: [],
        performanceSummary: emptyMessage,
      });
    }

    // Prepare data summary for Llama with Grok-style guidance
    const taskSummary = `
TASK PERFORMANCE DATA FOR ANALYSIS:

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

ANALYSIS NEEDED:
1. Provide 2-3 specific recommendations based on task data (focus on what's actually happening, not generic advice)
2. Identify current performance trends and what they mean for execution
3. Give a brief, natural summary of team performance and what's working or needs attention

RESPONSE FORMAT (VALID JSON ONLY - NO MARKDOWN):
{
  "recommendations": [
    {
      "title": "Conversational recommendation title",
      "description": "Natural language explanation with specific actions tied to the data",
      "impact": "high|medium|low",
      "icon": "recommendation category (rocket, alarm, chart, thumbsup, groups, etc.)"
    }
  ],
  "trends": [
    {
      "text": "Natural observation about task performance trends",
      "icon": "indicator (up, down, warning, checkmark, activity, etc.)"
    }
  ],
  "performanceSummary": "Brief, natural summary of team performance and next steps"
}

IMPORTANT: Return ONLY valid JSON with no markdown or extra text. Be conversational, vary your phrasing, and tie insights to the actual data provided.
    `;

    const systemPrompt = `You are an insightful and witty AI assistant analyzing task management performance data. Your role is to provide natural, conversational insights that are:

- NATURAL & FRIENDLY: Talk like a real person. Use "you" and "we", be encouraging and warm.
- WITTY & INSIGHTFUL: Add light humor when appropriate. Make observations that are clever but actionable.
- ENCOURAGING: Help teams see possibilities, not just problems. Frame challenges as opportunities.
- VARIED & FRESH: Vary your language so responses never feel recycled or robotic.
- SPECIFIC & TACTICAL: Always tie insights back to concrete actions the team can take.

AVOID:
- Corporate jargon or exaggeration
- Recycled phrases or generic advice
- Being overly cheerful about real issues
- Repetitive patterns

Respond ONLY with valid JSON output containing recommendations, trends, and a performance summary.`;

    let responseText = "";

    try {
      const response = await inference.chatCompletion({
        model: "meta-llama/Llama-3.1-8B-Instruct",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: taskSummary },
        ],
        max_tokens: 1000,
        temperature: 0.85,
      });

      responseText = response?.choices?.[0]?.message?.content?.trim() || "";

      if (!responseText) {
        throw new Error("Empty response from Hugging Face");
      }

      console.log("HF analytics response:", responseText.slice(0, 250));
    } catch (hfError) {
      console.warn("Hugging Face API error, using fallback:", hfError);
      responseText = "";
    }

    let aiData: any = null;

    if (responseText) {
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiData = JSON.parse(jsonMatch[0]);
        } else {
          aiData = JSON.parse(responseText);
        }
      } catch (parseErr) {
        console.warn("Failed to parse AI response, using fallback", parseErr);
        aiData = null;
      }
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
      strategy: "https://img.icons8.com/color/96/000000/strategy.png",
      analytics: "https://img.icons8.com/color/96/000000/combo-chart.png",
      default: "https://img.icons8.com/color/96/000000/info.png",
    };

    if (!aiData) {
      // Enhanced fallback using rule-based logic when AI is unavailable
      const fallbackRecs = generateRecommendations(
        data.completionRate,
        data.overdueTasks,
        data.totalTasks,
        data.completedTasks,
        data.members?.length || 0
      );
      const fallbackTrends = generateTrends(data.completionRate, data.overdueTasks, data.tasks || []);

      // Convert fallback recommendations to include icon URLs
      const enrichedRecs = fallbackRecs.map((rec) => ({
        ...rec,
        icon: iconMap[rec.icon] || iconMap.default,
      }));

      // Convert fallback trends to include icon URLs
      const enrichedTrends = fallbackTrends.map((trend) => ({
        ...trend,
        icon: iconMap[trend.icon] || iconMap.default,
      }));

      return NextResponse.json({
        recommendations: enrichedRecs,
        trends: enrichedTrends,
        performanceSummary: "Your team is working hard — keep up the momentum and look for ways to optimize!",
      });
    }

    // Enhance recommendations with icons8 URLs
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
    console.error("Analytics Error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate analytics",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
