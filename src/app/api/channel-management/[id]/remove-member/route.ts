// DELETE /api/channel-management/[id]/remove-member - Remove a member from channel (admin only)
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function DELETE(
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

    // Get memberId from request body
    const { memberId } = await request.json();
    if (!memberId) {
      return NextResponse.json(
        { error: "Member ID is required" },
        { status: 400 }
      );
    }

    // Check if channel exists and user is creator
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      return NextResponse.json(
        { error: "Channel not found" },
        { status: 404 }
      );
    }

    // Only creator can remove members
    if (channel.creatorId !== user.id) {
      return NextResponse.json(
        { error: "Only channel creator can remove members" },
        { status: 403 }
      );
    }

    // Check if member exists in channel
    const membership = await prisma.channelMember.findUnique({
      where: {
        userId_channelId: {
          userId: memberId,
          channelId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Member not found in this channel" },
        { status: 404 }
      );
    }

    // Remove the member
    await prisma.channelMember.delete({
      where: {
        userId_channelId: {
          userId: memberId,
          channelId,
        },
      },
    });

    return NextResponse.json({
      message: "Member removed successfully",
    });
  } catch (err) {
    console.error("Error removing member:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
