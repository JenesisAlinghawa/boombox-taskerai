import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing user ID" },
        { status: 400 }
      );
    }

    // Get user's channels
    const userChannels = await prisma.channelMember.findMany({
      where: {
        userId: parseInt(userId),
      },
      include: {
        channel: {
          include: {
            messages: true,
          },
        },
      },
    });

    // Calculate unread counts based on message timestamps
    // For now, since we don't have read tracking, return 0
    // In the future, implement read_receipts or lastReadAt tracking
    const unreadCounts: Record<number, number> = {};
    
    userChannels.forEach((cm) => {
      // TODO: Implement proper unread tracking
      // For now, all messages are considered read
      unreadCounts[cm.channelId] = 0;
    });

    return NextResponse.json({ unreadCounts });
  } catch (error) {
    console.error("[Channels Unread] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch unread counts" },
      { status: 500 }
    );
  }
}
