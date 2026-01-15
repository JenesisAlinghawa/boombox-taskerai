/**
 * Direct Messages API
 * 
 * Get DM conversations and send DMs
 * 
 * GET /api/direct-messages?userId=xxx - Get DM history with user
 * GET /api/direct-messages - Get list of DM conversations
 * POST /api/direct-messages - Send DM
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

    const userId = request.nextUrl.searchParams.get("userId");

    if (userId) {
      // Get DM history with specific user
      const messages = await prisma.directMessage.findMany({
        where: {
          OR: [
            { senderId: user.id, recipientId: parseInt(userId) },
            { senderId: parseInt(userId), recipientId: user.id },
          ],
        },
        select: {
          id: true,
          content: true,
          isRead: true,
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
        orderBy: { createdAt: "asc" },
        take: 100,
      });

      return NextResponse.json({ messages });
    } else {
      // Get list of DM conversations
      const conversations = await prisma.directMessage.findMany({
        where: {
          OR: [
            { senderId: user.id },
            { recipientId: user.id },
          ],
        },
        select: {
          senderId: true,
          recipientId: true,
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profilePicture: true,
              active: true,
              lastActive: true,
            },
          },
          recipient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profilePicture: true,
              active: true,
              lastActive: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        distinct: ["senderId", "recipientId"],
      });

      // Deduplicate and map conversations
      const uniqueConversations = new Map();
      conversations.forEach((conv) => {
        const otherUserId = conv.senderId === user.id ? conv.recipientId : conv.senderId;
        const otherUser = conv.senderId === user.id ? conv.recipient : conv.sender;

        if (!uniqueConversations.has(otherUserId)) {
          uniqueConversations.set(otherUserId, otherUser);
        }
      });

      return NextResponse.json({
        conversations: Array.from(uniqueConversations.values()),
      });
    }
  } catch (error) {
    console.error("Error fetching DMs:", error);
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

    const { recipientId, content } = await request.json();

    if (!recipientId || !content) {
      return NextResponse.json(
        { error: "Recipient ID and content are required" },
        { status: 400 }
      );
    }

    // Verify recipient exists
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
    });

    if (!recipient) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }

    const message = await prisma.directMessage.create({
      data: {
        senderId: user.id,
        recipientId,
        content,
      },
      select: {
        id: true,
        content: true,
        isRead: true,
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
    });

    return NextResponse.json(
      { message, status: "sent" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error sending DM:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
