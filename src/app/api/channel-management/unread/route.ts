import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Cache unread counts for 10 seconds per user to reduce database hits
const unreadCache = new Map<string, { data: any; timestamp: number }>();
// Track first calls to warm up connection pool
const warmupCalls = new Set<string>();

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing user ID" },
        { status: 400 }
      );
    }

    // Check cache first
    const cached = unreadCache.get(userId);
    if (cached && Date.now() - cached.timestamp < 10000) {
      console.log("[Unread] Cache hit for userId:", userId);
      return NextResponse.json(cached.data);
    }

    // On first call, return empty and let connection warm up in background
    if (!warmupCalls.has(userId)) {
      warmupCalls.add(userId);
      console.log("[Unread] First call - warming up connection pool");
      // Return cached empty, warmup will run async
      const emptyResponse = { unreadCounts: {} };
      unreadCache.set(userId, { data: emptyResponse, timestamp: Date.now() });
      
      // Warm up Prisma connection in background
      prisma.channelMember.count({ where: { userId } }).catch(e => 
        console.error("[Unread] Warmup error:", e)
      );
      
      return NextResponse.json(emptyResponse);
    }

    console.log("[Unread] Query start for userId:", userId);
    const startTime = Date.now();

    // Get user's channels IDs only with indexed query
    const userChannels = await prisma.channelMember.findMany({
      where: {
        userId: userId,
      },
      select: {
        channelId: true,
      },
    });

    console.log("[Unread] Query completed in", Date.now() - startTime, "ms");

    // Return unread counts - all zero for now (no read tracking yet)
    const unreadCounts: Record<number, number> = {};
    userChannels.forEach((cm) => {
      unreadCounts[cm.channelId] = 0;
    });

    const response = { unreadCounts };
    
    // Cache the result
    unreadCache.set(userId, { data: response, timestamp: Date.now() });

    console.log("[Unread] Returning", userChannels.length, "channels with 0 unread");
    return NextResponse.json(response);
  } catch (error) {
    console.error("[Unread] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch unread counts" },
      { status: 500 }
    );
  }
}
