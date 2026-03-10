import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = req.headers.get("x-user-id");
    const { id } = await params;
    const channelId = parseInt(id);

    if (!userId) {
      return NextResponse.json(
        { error: "Missing user ID" },
        { status: 400 }
      );
    }

    // For now, channels don't track unread status
    // Just return success
    return NextResponse.json({
      success: true,
      message: "Channel messages acknowledged",
    });
  } catch (error) {
    console.error("[Channel Mark Read] Error:", error);
    return NextResponse.json(
      { error: "Failed to mark messages as read" },
      { status: 500 }
    );
  }
}
