import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, eachDayOfInterval } from "date-fns";
import { updateOverdueTasks, notifyApproachingDeadlines } from "@/lib/overdueTasks";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 401 }
      );
    }

    const numUserId = parseInt(userId);

    // Ensure overdue tasks are updated
    await updateOverdueTasks();

    // Check for approaching deadlines
    await notifyApproachingDeadlines();

    // Get tasks for the current user (limit to prevent memory issues)
    const tasks = await prisma.task.findMany({
      where: {
        OR: [
          { createdById: numUserId },
          { assigneeId: numUserId },
        ],
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 1000, // Limit total tasks to prevent memory issues
    });

    console.log(`Dashboard API: Found ${tasks.length} tasks for user ${numUserId}`);

    // Calculate stats
    const now = new Date();
    const pending = tasks.filter((t) => t.status === "todo").length;
    const inProgress = tasks.filter((t) => t.status === "inprogress").length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    // Count tasks marked as stuck (which are automatically marked overdue tasks) or those that are overdue
    const overdue = tasks.filter(
      (t) =>
        (t.status === "stuck" || 
         (t.status !== "completed" &&
          t.dueDate &&
          new Date(t.dueDate) < now))
    ).length;

    // Get weekly data
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const weeklyData = {
      labels: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      inProgress: weekDays.map((day) =>
        tasks.filter(
          (t) =>
            t.status === "inprogress" &&
            format(new Date(t.createdAt), "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
        ).length
      ),
      completed: weekDays.map((day) =>
        tasks.filter(
          (t) =>
            t.status === "completed" &&
            format(new Date(t.updatedAt || now), "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
        ).length
      ),
      overdue: weekDays.map((day) =>
        tasks.filter(
          (t) =>
            (t.status === "stuck" || 
             (t.status !== "completed" &&
              t.dueDate &&
              new Date(t.dueDate) < day))
        ).length
      ),
    };

    // Get calendar tasks for current month
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const calendarTasks = monthDays
      .map((day) => {
        const dayTasks = tasks.filter(
          (t) =>
            t.dueDate &&
            format(new Date(t.dueDate), "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
        );
        return {
          date: day.getDate(),
          taskCount: dayTasks.length,
          tasks: dayTasks.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status || "todo",
            priority: t.priority || "medium",
          })),
        };
      })
      .filter((item) => item.taskCount > 0);

    // Generate AI Insight
    let aiInsight = "";
    if (overdue > 0) {
      aiInsight = `With ${overdue} overdue task${overdue !== 1 ? "s" : ""}, the user/team might be dealing with missed deadlines. Consider revisiting task deadlines if dependencies are blocking progress, or if anyone needs help.`;
    } else if (inProgress > 5) {
      aiInsight = `You have ${inProgress} tasks in progress. Consider prioritizing to avoid context switching and improve focus on high-impact items.`;
    } else if (pending > 0) {
      aiInsight = `${pending} task${pending !== 1 ? "s" : ""} are pending. Review them to identify quick wins or blocking tasks.`;
    } else {
      aiInsight = "Great progress! Keep maintaining this momentum with your task completion.";
    }

    return NextResponse.json({
      pending,
      inProgress,
      completed,
      overdue,
      pendingTasks: tasks
        .filter((t) => t.status === "todo")
        .slice(0, 10) // Limit to 10 pending tasks to prevent memory issues
        .map((t) => ({
          id: t.id,
          title: t.title,
          priority: t.priority || "medium",
          dueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString() : undefined,
        })),
      weeklyData,
      calendarTasks,
      aiInsight,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
