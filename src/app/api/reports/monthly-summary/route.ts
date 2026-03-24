import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/utils/sessionManager";
import MonthlySummaryPDF from "@/app/components/reports/MonthlySummaryPDF";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || new Date().getMonth() + 1;
    const year = searchParams.get("year") || new Date().getFullYear();

    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 1);

    // Fetch tasks created in the month
    const tasks = await prisma.task.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
        // For employees, only show their tasks
        ...(user.role === "EMPLOYEE" && {
          assignees: {
            some: {
              assigneeId: user.id,
            },
          },
        }),
      },
      include: {
        assignees: {
          include: {
            assignee: true,
          },
        },
      },
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(
      (t) => t.status === "completed" || t.status === "done"
    ).length;
    const overdueTasks = tasks.filter((t) => {
      if (t.status === "completed" || t.status === "done") return false;
      if (!t.dueDate) return false;
      return new Date(t.dueDate) < new Date();
    }).length;

    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Count by status
    const statusCounts = {
      todo: tasks.filter((t) => t.status === "todo" || t.status === "pending").length,
      inProgress: tasks.filter((t) => t.status === "inprogress" || t.status === "in_progress").length,
      done: completedTasks,
      overdue: overdueTasks,
    };

    // Count by priority
    const priorityCounts = {
      low: tasks.filter((t) => t.priority === "low").length,
      medium: tasks.filter((t) => t.priority === "medium").length,
      high: tasks.filter((t) => t.priority === "high").length,
    };

    const monthName = new Date(Number(year), Number(month) - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

    const pdfBuffer = await renderToBuffer(
      MonthlySummaryPDF({
        monthName,
        totalTasks,
        completedTasks,
        overdueTasks,
        completionRate,
        statusCounts,
        priorityCounts,
      }) as any
    );

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="monthly-summary-${monthName.replace(' ', '-').toLowerCase()}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating monthly summary:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}