import { NextRequest, NextResponse } from "next/server";
import { deletePendingUsers } from "@/lib/cleanup";

let cleanupInterval: NodeJS.Timeout | null = null;
const CLEANUP_INTERVAL = 5 * 60 * 1000; // Run every 5 minutes
const PENDING_USER_TTL = 60; // 60 minutes (1 hour) - can be configured

/**
 * POST /api/system/cleanup-init
 * Initialize the cleanup routine (called on server startup)
 * This sets up a periodic task to delete pending users
 */
export async function POST(request: NextRequest) {
  try {
    // Clear existing interval if any
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
    }

    // Start new cleanup interval
    cleanupInterval = setInterval(async () => {
      console.log("[Cleanup] Running periodic cleanup task...");
      await deletePendingUsers(PENDING_USER_TTL);
    }, CLEANUP_INTERVAL);

    console.log(
      `[Cleanup] Initialized cleanup routine - runs every ${CLEANUP_INTERVAL / 1000}s, removes users older than ${PENDING_USER_TTL}m`
    );

    return NextResponse.json({
      success: true,
      message: "Cleanup routine initialized",
      intervalMs: CLEANUP_INTERVAL,
      pendingUserTTLMinutes: PENDING_USER_TTL,
    });
  } catch (error) {
    console.error("[System] Cleanup init error:", error);
    return NextResponse.json(
      { error: "Failed to initialize cleanup" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/system/cleanup-status
 * Get status of cleanup routine
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    cleanupInitialized: cleanupInterval !== null,
    intervalMs: CLEANUP_INTERVAL,
    pendingUserTTLMinutes: PENDING_USER_TTL,
  });
}
