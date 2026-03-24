import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/utils/sessionManager";
import TeamPerformancePDF from "@/app/components/reports/TeamPerformancePDF";

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

    // Get team members
    const teamResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/team-management`, {
      headers: {
        "x-user-id": String(user.id),
      },
    });

    if (!teamResponse.ok) {
      return NextResponse.json({ error: "Failed to fetch team data" }, { status: 500 });
    }

    const teamData = await teamResponse.json();
    const teamMembers = teamData.members || [];

    // Get tasks for the month
    const tasks = await prisma.task.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      include: {
        assignees: {
          include: {
            assignee: true,
          },
        },
      },
    });

    // Calculate stats for each team member
    const memberStats = teamMembers.map((member: any) => {
      const memberId = member.user.id;

      // Get tasks assigned to this member
      const memberTasks = tasks.filter((task) =>
        task.assignees?.some((a: any) => String(a.assignee?.id) === memberId)
      );

      const totalTasks = memberTasks.length;
      const completedTasks = memberTasks.filter(
        (t) => t.status === "completed" || t.status === "done"
      ).length;
      const overdueTasks = memberTasks.filter((t) => {
        if (t.status === "completed" || t.status === "done") return false;
        if (!t.dueDate) return false;
        return new Date(t.dueDate) < new Date();
      }).length;

      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        name: `${member.user.firstName} ${member.user.lastName}`.trim(),
        totalTasks,
        completedTasks,
        completionRate,
        overdueTasks,
      };
    });

    const monthName = new Date(Number(year), Number(month) - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      TeamPerformancePDF({
        monthName,
        memberStats,
      }) as any
    );

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="team-performance-${monthName.replace(' ', '-').toLowerCase()}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating team performance report:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}