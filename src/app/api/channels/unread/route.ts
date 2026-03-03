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

    // For now, channels don't track unread status
    // Return empty unread counts
    return NextResponse.json({ unreadCounts: {} });
  } catch (error) {
    console.error("[Channels Unread] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch unread counts" },
      { status: 500 }
    );
  }
}
