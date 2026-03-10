// PUT /api/channels/[id] - Update channel
// DELETE /api/channels/[id] - Delete channel
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function PUT(
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

  const { name, description, profilePicture } = await request.json();

  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      return NextResponse.json(
        { error: "Channel not found" },
        { status: 404 }
      );
    }

    // Only channel creator can update channel
    if (channel.creatorId !== user.id) {
      return NextResponse.json(
        { error: "Only channel creator can update channel" },
        { status: 403 }
      );
    }

    const updated = await prisma.channel.update({
      where: { id: channelId },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(profilePicture && { profilePicture }),
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Error updating channel:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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

    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      return NextResponse.json(
        { error: "Channel not found" },
        { status: 404 }
      );
    }

    // Only channel creator can delete channel
    if (channel.creatorId !== user.id) {
      return NextResponse.json(
        { error: "Only channel creator can delete channel" },
        { status: 403 }
      );
    }

    await prisma.channel.delete({
      where: { id: channelId },
    });

    return NextResponse.json({
      message: "Channel deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting channel:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
