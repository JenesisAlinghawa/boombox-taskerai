import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { startOfMonth, endOfMonth, format, eachDayOfInterval } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 401 }
      );
    }

    // Get user role to determine filtering
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Build query filter based on role
    let taskFilter: any;
    
    if (user.role === "ADMIN" || user.role === "OWNER") {
      // Admins and Owners see all tasks
      taskFilter = {};
    } else {
      // Employees only see tasks they created or are assigned to
      taskFilter = {
        OR: [
          { createdById: userId },
          { assignees: { some: { assigneeId: userId } } },
        ],
      };
    }

    // Get tasks for the current user with role-based filtering
    const tasks = await prisma.task.findMany({
      where: taskFilter,
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
      },
    });

    // Get calendar tasks for specified month
    const now = new Date();
    const calendarMonth = month ? parseInt(month) : now.getMonth();
    const calendarYear = year ? parseInt(year) : now.getFullYear();
    const monthStart = startOfMonth(new Date(calendarYear, calendarMonth));
    const monthEnd = endOfMonth(new Date(calendarYear, calendarMonth));
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

    return NextResponse.json({
      calendarTasks,
    });
  } catch (error) {
    console.error("Error fetching calendar data:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar data" },
      { status: 500 }
    );
  }
}
