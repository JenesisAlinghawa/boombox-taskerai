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

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
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

    // Grok-style system prompt for natural, friendly, witty AI responses
    const systemPrompt = `You are Grok, a helpful and witty AI assistant for a marketing team using a task management platform. Your role is to analyze task performance data and provide natural, conversational insights that are:

- NATURAL & FRIENDLY: Talk like a real person, not a robot. Use "you" and "we", be encouraging and warm.
- WITTY & INSIGHTFUL: Add light humor when appropriate, but keep it professional. Make observations that are clever but actionable.
- ENCOURAGING: Help the team see possibilities, not just problems. Frame challenges as opportunities.
- VARIED IN PHRASING: Even when analyzing similar data, vary your language so responses feel fresh and thoughtful.
- SPECIFIC & TACTICAL: Always tie insights back to concrete actions the team can take.

AVOID:
- Exaggeration or corporate jargon
- Repetitive language or recycled phrases
- Being overly cheerful when addressing real issues
- Generic advice without context

Your analysis should focus on social media campaign delivery and PR strategy execution. Consider task completion as campaign success, overdue tasks as timeline risks, and team capacity as resource allocation for marketing initiatives.`;

    // Prepare data summary for Gemini with Grok-style guidance
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
2. Identify current performance trends and what they mean for campaign execution
3. Give a brief, natural summary of team performance and what's working or needs attention

RESPONSE FORMAT (VALID JSON ONLY):
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

IMPORTANT: Return ONLY valid JSON. Be conversational, vary your phrasing, and tie insights to the actual data provided.
    `;

    // Use Gemini with temperature 0.8-1.0 for natural variation
    const model = genAI.getGenerativeModel({ 
      model: "gemini-pro",
      generationConfig: {
        temperature: 0.85, // Natural variation range for conversational responses
        maxOutputTokens: 1024,
      }
    });

    let aiData: any = null;
    try {
      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: taskSummary }],
          },
        ],
        systemInstruction: systemPrompt,
      });

      // Extract text from Gemini response
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
      console.warn("AI model call failed, will use enhanced fallback:", aiErr);
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
      // Enhanced fallback using multi-template rule-based logic when AI is unavailable
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
        performanceSummary: "Your team is working hard — keep up the great work and watch for ways to optimize!",
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
