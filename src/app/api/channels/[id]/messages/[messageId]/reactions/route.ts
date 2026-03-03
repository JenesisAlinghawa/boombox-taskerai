import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const { id, messageId } = await params;
    const channelId = parseInt(id);
    const msgId = parseInt(messageId);
    const { emoji, userId } = await req.json();

    if (!emoji || !userId) {
      return NextResponse.json(
        { error: "Emoji and user ID required" },
        { status: 400 }
      );
    }

    // Get the message
    const message = await prisma.message.findUnique({
      where: { id: msgId },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePicture: true,
          },
        },
      },
    });

    if (!message) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    // Get reactions from the database directly  
    const messageWithReactions = await prisma.message.findUnique({
      where: { id: msgId },
    }) as any;

    // Check if user already reacted with this emoji
    const currentReactions = (messageWithReactions?.reactions || []) as any[];
    const existingReaction = currentReactions.find(
      (r: any) => r.emoji === emoji && r.userId === userId
    );

    // start with current set and only add when not present
    let reactions: any[] = [...currentReactions];

    if (!existingReaction) {
      reactions.push({ emoji, userId });
    }

    // dedupe just in case
    reactions = Array.from(
      new Map(reactions.map((r) => [`${r.emoji}-${r.userId}`, r])).values(),
    );

    // Update message with new reactions
    const updatedMessage = await prisma.message.update({
      where: { id: msgId },
      data: { reactions: reactions as any } as any,
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePicture: true,
          },
        },
        parentMessage: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePicture: true,
              },
            },
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });

    return NextResponse.json({ message: updatedMessage }, { status: 200 });
  } catch (error) {
    console.error("[Channel Reactions] Error:", error);
    return NextResponse.json(
      { error: "Failed to add reaction" },
      { status: 500 }
    );
  }
}
