// DELETE /api/messages/[id]
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const messageId = parseInt(id);

  if (!messageId) {
    return NextResponse.json(
      { error: "Invalid message ID" },
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

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { channel: true },
    });

    if (!message) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    // Check if user is the sender or channel creator
    const isChannelCreator =
      message.channel && message.channel.creatorId === user.id;

    if (message.senderId !== user.id && !isChannelCreator) {
      return NextResponse.json(
        { error: "Can only delete your own messages or channel admin can delete" },
        { status: 403 }
      );
    }

    // Soft delete: mark as deleted instead of hard delete to preserve thread integrity
    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        content: "[Message deleted]",
        editedAt: new Date(),
      },
      include: {
        sender: true,
        replies: true,
      },
    });

    return NextResponse.json({
      message: "Message deleted successfully",
      data: updated,
    });
  } catch (err) {
    console.error("Error deleting message:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
