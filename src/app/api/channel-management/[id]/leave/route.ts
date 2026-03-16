// POST /api/channel-management/[id]/leave - Leave channel
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const channelId = parseInt(id);

  if (!channelId) {
    return NextResponse.json(
      { error: "Invalid channel ID" },
      { status: 400 }
    );
  }

  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if channel exists
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        members: true,
      },
    });

    if (!channel) {
      return NextResponse.json(
        { error: "Channel not found" },
        { status: 404 }
      );
    }

    // Check if user is a member
    const membership = await prisma.channelMember.findUnique({
      where: {
        userId_channelId: {
          userId: user.id,
          channelId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of this channel" },
        { status: 400 }
      );
    }

    // Prevent creator from leaving if they're the only admin (optional - can be removed)
    // For now, allow creator to leave
    
    // Remove user from channel
    await prisma.channelMember.delete({
      where: {
        userId_channelId: {
          userId: user.id,
          channelId,
        },
      },
    });

    return NextResponse.json({
      message: "Successfully left the channel",
    });
  } catch (err) {
    console.error("Error leaving channel:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
