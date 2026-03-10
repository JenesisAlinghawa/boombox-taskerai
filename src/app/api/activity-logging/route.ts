/**
 * Logs API
 * 
 * Endpoint to fetch activity logs
 * All users can view logs, but detailed data is filtered based on role
 * 
 * GET /api/logs
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch logs with user information
    const logs = await prisma.log.findMany({
      select: {
        id: true,
        taskId: true,
        userId: true,
        action: true,
        data: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100, // Limit to last 100 logs for performance
    });

    // Filter sensitive data based on role
    const filteredLogs = logs.map((log) => {
      // MANAGER and above can see all data
      if (["MANAGER", "CO_OWNER", "OWNER"].includes(user.role)) {
        return log;
      }

      // Other users can only see logs about their own tasks
      // or logs they created
      if (log.userId === user.id) {
        return log;
      }

      // Hide sensitive data for users who shouldn't see it
      return {
        ...log,
        data: null,
      };
    });

    return NextResponse.json({ logs: filteredLogs });
  } catch (error) {
    console.error("Error fetching logs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
