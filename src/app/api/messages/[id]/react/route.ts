// POST /api/messages/[id]/react
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
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

  const { reaction } = await request.json();

  if (!reaction) {
    return NextResponse.json(
      { error: "Reaction emoji required" },
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

    // Verify user has access to this message's channel
    if (message.channel) {
      const isMember = await prisma.channelMember.findUnique({
        where: {
          userId_channelId: {
            userId: user.id,
            channelId: message.channel.id,
          },
        },
      });

      if (!isMember) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }
    }

    // Add or update reaction
    const reactions = (message.reactions as any[]) || [];
    const existingReaction = reactions.find(
      (r: any) => r.userId === user.id && r.emoji === reaction
    );

    if (existingReaction) {
      // Remove reaction if it already exists (toggle)
      const updatedReactions = reactions.filter(
        (r: any) => !(r.userId === user.id && r.emoji === reaction)
      );
      const updated = await prisma.message.update({
        where: { id: messageId },
        data: {
          reactions: updatedReactions as any,
        },
        include: {
          sender: true,
          replies: true,
        },
      });

      return NextResponse.json(updated);
    } else {
      // Add new reaction
      const newReactions = [
        ...reactions,
        {
          userId: user.id,
          emoji: reaction,
          createdAt: new Date().toISOString(),
        },
      ];
      const updated = await prisma.message.update({
        where: { id: messageId },
        data: {
          reactions: newReactions as any,
        },
        include: {
          sender: true,
          replies: true,
        },
      });

      return NextResponse.json(updated);
    }
  } catch (err) {
    console.error("Error adding reaction:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
