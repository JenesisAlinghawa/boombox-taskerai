import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";

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
    const now = new Date();

    // Get all tasks for the user
    const tasks = await prisma.task.findMany({
      where: {
        OR: [
          { createdById: numUserId },
          { assigneeId: numUserId },
        ],
      },
      select: {
        id: true,
        status: true,
        dueDate: true,
        createdAt: true,
        updatedAt: true,
        title: true,
      },
    });

    // Calculate stats
    const pending = tasks.filter((t) => t.status === "todo" || t.status === "pending").length;
    const inProgress = tasks.filter((t) => t.status === "inprogress" || t.status === "in-progress").length;
    const completed = tasks.filter((t) => t.status === "completed" || t.status === "done").length;
    const overdue = tasks.filter(
      (t) =>
        (t.status !== "completed" && t.status !== "done") &&
        t.dueDate &&
        new Date(t.dueDate) < now
    ).length;

    // Calculate completion rate
    const total = tasks.length;
    const taskCompletionRate = total > 0 ? (completed / total) * 100 : 0;

    // Calculate average task duration
    let totalDuration = 0;
    let completedTasksCount = 0;
    tasks.forEach((task) => {
      if (task.updatedAt && task.createdAt) {
        const duration =
          (new Date(task.updatedAt).getTime() -
            new Date(task.createdAt).getTime()) /
          (1000 * 60 * 60 * 24); // Convert to days
        totalDuration += duration;
        completedTasksCount++;
      }
    });
    const averageTaskDuration =
      completedTasksCount > 0 ? totalDuration / completedTasksCount : 0;

    // Get monthly trends for the last 6 months
    const sixMonthsAgo = subMonths(now, 5);
    const months = eachMonthOfInterval({
      start: startOfMonth(sixMonthsAgo),
      end: endOfMonth(now),
    });

    const monthlyTrends = months.map((month) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      return {
        month: format(month, "MMM"),
        completed: tasks.filter(
          (t) =>
            (t.status === "completed" || t.status === "done") &&
            t.updatedAt &&
            new Date(t.updatedAt) >= monthStart &&
            new Date(t.updatedAt) <= monthEnd
        ).length,
        inProgress: tasks.filter(
          (t) =>
            (t.status === "inprogress" || t.status === "in-progress") &&
            new Date(t.createdAt) >= monthStart &&
            new Date(t.createdAt) <= monthEnd
        ).length,
        pending: tasks.filter(
          (t) =>
            (t.status === "todo" || t.status === "pending") &&
            new Date(t.createdAt) >= monthStart &&
            new Date(t.createdAt) <= monthEnd
        ).length,
      };
    });

    // Get weekly data
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const weeklyData = {
      labels: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      inProgress: weekDays.map((day) =>
        tasks.filter(
          (t) =>
            (t.status === "inprogress" || t.status === "in-progress") &&
            format(new Date(t.createdAt), "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
        ).length
      ),
      completed: weekDays.map((day) =>
        tasks.filter(
          (t) =>
            (t.status === "completed" || t.status === "done") &&
            t.updatedAt &&
            format(new Date(t.updatedAt), "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
        ).length
      ),
      overdue: weekDays.map((day) =>
        tasks.filter(
          (t) =>
            (t.status !== "completed" && t.status !== "done") &&
            t.dueDate &&
            new Date(t.dueDate) < day
        ).length
      ),
    };

    return NextResponse.json({
      stats: {
        pending,
        inProgress,
        completed,
        overdue,
      },
      monthlyTrends,
      taskCompletionRate,
      averageTaskDuration,
      weeklyData,
    });
  } catch (error) {
    console.error("Error fetching analytics data:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 }
    );
  }
}
