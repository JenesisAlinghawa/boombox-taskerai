/**
 * Analytics AI API
 * 
 * Grok-style AI insights for task analytics
 * - Natural language, friendly, encouraging
 * - Light humor when appropriate
 * - Insightful observations
 * - Varies phrasing to avoid repetition
 * 
 * POST /api/analytics/ai
 * Body: {
 *   tasks: Task[],
 *   members: User[],
 *   totalTasks: number,
 *   completedTasks: number,
 *   completionRate: number,
 *   overdueTasks: number,
 *   avgTasksPerMember: number
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

interface TaskData {
  tasks: any[];
  members: any[];
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  overdueTasks: number;
  avgTasksPerMember: number;
}

// Multiple phrasing templates for varied responses
const recommendationTemplates = {
  lowCompletion: [
    "Your team's moving slower than molasses this month. Let's break those tasks into smaller chunks and get some wins on the board! 🎯",
    "Completion rate's hanging out below 50% — time to revisit priorities and maybe shuffle some workloads?",
    "Less than half your tasks are done. No judgment, but let's focus on quality over quantity and nail the important stuff.",
  ],
  manyOverdue: [
    "You've got overdue tasks stacking up like plates after Thanksgiving dinner. Let's untangle this before it gets messier.",
    "Overdue pile's getting out of hand. Worth checking if tasks need better deadlines or if the team needs more support.",
    "Some tasks are running late! This is usually a sign to either adjust scope or get more help. What do you think?",
  ],
  lowTeamCapacity: [
    "Your team's stretched thin! With {memberCount} people tackling {avgTasks} tasks each, burnout's a real risk.",
    "Workload's unevenly distributed. Some folks might have way too on their plate.",
    "Looks like the team's overloaded. Time to either hire more hands or get strategic about priorities.",
  ],
  goodProgress: [
    "Hey, you're crushing it! {completionRate}% done — keep this momentum going and you'll hit all your goals.",
    "Looking solid! {completedTasks} tasks finished and {completionRate}% completion rate? The team's on fire. 🔥",
    "Great work! Your team's making real progress. Keep this up and you'll be unstoppable.",
  ],
  noTasks: [
    "You're just getting started — exciting! Once you add tasks, I'll give you insights on how the team's tracking.",
    "Fresh slate! No tasks yet, but I'm ready to help once you create some.",
    "Clean slate energy! Ready to track once you've got tasks in the system.",
  ],
};

const trendTemplates = {
  upwardTrend: [
    "Completion rate's trending up — the team's finding their rhythm!",
    "You're building momentum! Completion's going in the right direction.",
    "Keep this up! The trend's looking positive. 📈",
  ],
  downwardTrend: [
    "Completion rate's slipping. Worth a quick check-in with the team?",
    "Looks like momentum's slowed — might be time to refocus efforts.",
    "Dips happen, but let's course-correct and get back on track.",
  ],
  stable: [
    "Steady as she goes! Completion rate's holding firm.",
    "Consistent performance — the team knows what they're doing.",
    "No big swings — solid, predictable progress.",
  ],
};

function selectRandomTemplate(templates: string[]): string {
  return templates[Math.floor(Math.random() * templates.length)];
}

function generateRecommendations(data: TaskData): string[] {
  const recommendations: string[] = [];
  const { completionRate, overdueTasks, totalTasks, completedTasks, avgTasksPerMember, members } = data;

  if (totalTasks === 0) {
    return [selectRandomTemplate(recommendationTemplates.noTasks as any)];
  }

  if (completionRate < 50) {
    recommendations.push(selectRandomTemplate(recommendationTemplates.lowCompletion as any));
  }

  if (overdueTasks > totalTasks * 0.2) {
    recommendations.push(selectRandomTemplate(recommendationTemplates.manyOverdue as any));
  }

  if (avgTasksPerMember > 5 && members.length > 0) {
    const template = selectRandomTemplate(recommendationTemplates.lowTeamCapacity as any);
    recommendations.push(
      template
        .replace("{memberCount}", members.length.toString())
        .replace("{avgTasks}", Math.round(avgTasksPerMember).toString())
    );
  }

  if (completionRate >= 70) {
    const template = selectRandomTemplate(recommendationTemplates.goodProgress as any);
    recommendations.push(
      template
        .replace("{completionRate}", Math.round(completionRate).toString())
        .replace("{completedTasks}", completedTasks.toString())
    );
  }

  return recommendations.length > 0 ? recommendations : [selectRandomTemplate(recommendationTemplates.goodProgress as any).replace("{completionRate}", Math.round(completionRate).toString()).replace("{completedTasks}", completedTasks.toString())];
}

function generateTrends(completionRate: number): string {
  if (completionRate > 75) {
    return selectRandomTemplate(trendTemplates.upwardTrend as any);
  } else if (completionRate < 40) {
    return selectRandomTemplate(trendTemplates.downwardTrend as any);
  } else {
    return selectRandomTemplate(trendTemplates.stable as any);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const taskData: TaskData = await request.json();

    // Generate recommendations using varied templates
    const recommendations = generateRecommendations(taskData);
    const trends = generateTrends(taskData.completionRate);

    // Create a natural language summary
    let summary = "";
    if (taskData.totalTasks === 0) {
      summary = "You're all set to start tracking! Create your first task and let's get rolling.";
    } else {
      summary = `Your team has completed ${taskData.completedTasks} out of ${taskData.totalTasks} tasks (${Math.round(taskData.completionRate)}% done). ${taskData.overdueTasks > 0 ? `There are ${taskData.overdueTasks} overdue task${taskData.overdueTasks > 1 ? "s" : ""}.` : "No overdue tasks — great job staying on schedule!"}`;
    }

    return NextResponse.json({
      summary,
      recommendations,
      trend: trends,
      insights: {
        completionRate: Math.round(taskData.completionRate),
        overdueTasks: taskData.overdueTasks,
        avgTasksPerMember: Math.round(taskData.avgTasksPerMember * 10) / 10,
        totalTasks: taskData.totalTasks,
        completedTasks: taskData.completedTasks,
      },
    });
  } catch (error) {
    console.error("Error in analytics AI:", error);
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 }
    );
  }
}
