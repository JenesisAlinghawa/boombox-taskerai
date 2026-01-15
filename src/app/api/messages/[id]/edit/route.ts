// PUT /api/messages/[id]/edit
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function PUT(
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

  const { content } = await request.json();

  if (!content || content.trim().length === 0) {
    return NextResponse.json(
      { error: "Content cannot be empty" },
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
    });

    if (!message) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    // Only the sender can edit the message
    if (message.senderId !== user.id) {
      return NextResponse.json(
        { error: "Can only edit your own messages" },
        { status: 403 }
      );
    }

    // Message cannot be edited if older than 15 minutes
    const ageInMinutes =
      (new Date().getTime() - message.createdAt.getTime()) / (1000 * 60);
    if (ageInMinutes > 15) {
      return NextResponse.json(
        { error: "Message cannot be edited after 15 minutes" },
        { status: 400 }
      );
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        content,
        isEdited: true,
        editedAt: new Date(),
      },
      include: {
        sender: true,
        replies: true,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Error editing message:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
