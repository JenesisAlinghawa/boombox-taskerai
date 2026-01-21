import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, eachDayOfInterval } from "date-fns";

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

    // Get tasks for the current user
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
      },
    });

    // Calculate stats
    const now = new Date();
    const pending = tasks.filter((t) => t.status === "todo" || t.status === "pending").length;
    const inProgress = tasks.filter((t) => t.status === "inprogress" || t.status === "in-progress").length;
    const completed = tasks.filter((t) => t.status === "completed" || t.status === "done").length;
    const overdue = tasks.filter(
      (t) =>
        (t.status !== "completed" && t.status !== "done") &&
        t.dueDate &&
        new Date(t.dueDate) < now
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
            (t.status === "inprogress" || t.status === "in-progress") &&
            format(new Date(t.createdAt), "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
        ).length
      ),
      completed: weekDays.map((day) =>
        tasks.filter(
          (t) =>
            (t.status === "completed" || t.status === "done") &&
            format(new Date(t.updatedAt || now), "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
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

    // Get calendar tasks for current month
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const calendarTasks = monthDays
      .map((day) => ({
        date: day.getDate(),
        taskCount: tasks.filter(
          (t) =>
            t.dueDate &&
            format(new Date(t.dueDate), "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
        ).length,
      }))
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
