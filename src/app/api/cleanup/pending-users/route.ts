import { NextRequest, NextResponse } from "next/server";
import { deletePendingUsers } from "@/lib/cleanup";

/**
 * POST /api/cleanup/pending-users
 * Delete pending users who haven't been approved within the specified duration
 * 
 * Query params:
 * - duration: Duration in minutes (default: 60)
 * 
 * This endpoint should be called periodically (e.g., via cron job or scheduled task)
 */
export async function POST(request: NextRequest) {
  try {
    // Get duration from query params (default 60 minutes = 1 hour)
    const searchParams = request.nextUrl.searchParams;
    const duration = Math.max(1, parseInt(searchParams.get("duration") || "60"));

    const deletedCount = await deletePendingUsers(duration);

    return NextResponse.json(
      {
        success: true,
        message: `Deleted ${deletedCount} pending users`,
        deletedCount,
        durationMinutes: duration,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API] Cleanup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cleanup/pending-users
 * Get info about pending users (for debugging)
 */
export async function GET(request: NextRequest) {
  try {
    const prisma = (await import("@/lib/prisma")).default;

    const pendingUsers = await prisma.user.findMany({
      where: { active: false },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      pendingCount: pendingUsers.length,
      pendingUsers,
    });
  } catch (error) {
    console.error("[API] Error fetching pending users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
