/**
 * Messages API
 * 
 * Get and create messages
 * 
 * GET /api/messages?channelId=xxx&limit=50 - Get messages from channel
 * POST /api/messages - Create new message
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const channelId = request.nextUrl.searchParams.get("channelId");
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50");
    const search = request.nextUrl.searchParams.get("search") || "";

    if (!channelId) {
      return NextResponse.json(
        { error: "Channel ID is required" },
        { status: 400 }
      );
    }

    // Verify user is member of channel
    const membership = await prisma.channelMember.findUnique({
      where: {
        userId_channelId: {
          userId: user.id,
          channelId: parseInt(channelId),
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of this channel" },
        { status: 403 }
      );
    }

    const messages = await prisma.message.findMany({
      where: {
        channelId: parseInt(channelId),
        isDeleted: false,
        ...(search && {
          content: {
            contains: search,
            mode: "insensitive",
          },
        }),
      },
      select: {
        id: true,
        content: true,
        attachments: true,
        reactions: true,
        isEdited: true,
        editedAt: true,
        parentMessageId: true,
        createdAt: true,
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profilePicture: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ messages: messages.reverse(), total: messages.length });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { channelId, content, attachments, parentMessageId } = await request.json();

    if (!channelId || !content) {
      return NextResponse.json(
        { error: "Channel ID and content are required" },
        { status: 400 }
      );
    }

    // Verify user is member of channel
    const membership = await prisma.channelMember.findUnique({
      where: {
        userId_channelId: {
          userId: user.id,
          channelId: parseInt(channelId),
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of this channel" },
        { status: 403 }
      );
    }

    const message = await prisma.message.create({
      data: {
        channelId: parseInt(channelId),
        senderId: user.id,
        content,
        attachments: attachments || [],
        reactions: [],
        parentMessageId: parentMessageId ? parseInt(parentMessageId) : null,
      },
      select: {
        id: true,
        content: true,
        attachments: true,
        reactions: true,
        isEdited: true,
        parentMessageId: true,
        createdAt: true,
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profilePicture: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json(
      { message, status: "sent" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating message:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
