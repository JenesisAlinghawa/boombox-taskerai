// GET /api/channels/[id]/members
// POST /api/channels/[id]/members/add
// DELETE /api/channels/[id]/members/remove
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, canManageUsers } from "@/lib/auth";

export async function GET(
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

    // Check if user is channel member
    const isMember = await prisma.channelMember.findUnique({
      where: {
        userId_channelId: {
          userId: user.id,
          channelId,
        },
      },
    });

    if (!isMember) {
      return NextResponse.json(
        { error: "Not a member of this channel" },
        { status: 403 }
      );
    }

    const members = await prisma.channelMember.findMany({
      where: { channelId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            profilePicture: true,
          },
        },
      },
    });

    return NextResponse.json(members);
  } catch (err) {
    console.error("Error fetching channel members:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const channelId = parseInt(id);
  const { action, userId, emails } = await request.json();

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

    // Only channel creator can manage members
    if (channel.creatorId !== user.id) {
      return NextResponse.json(
        { error: "Only channel creator can manage members" },
        { status: 403 }
      );
    }

    if (action === "add") {
      if (!userId && !emails) {
        return NextResponse.json(
          { error: "Either userId or emails must be provided" },
          { status: 400 }
        );
      }

      // Add single user by ID
      if (userId) {
        const existingMember = await prisma.channelMember.findUnique({
          where: {
            userId_channelId: {
              userId,
              channelId,
            },
          },
        });

        if (existingMember) {
          return NextResponse.json(
            { error: "User is already a member" },
            { status: 400 }
          );
        }

        const newMember = await prisma.channelMember.create({
          data: {
            channelId,
            userId,
          },
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
        });

        return NextResponse.json(newMember);
      }

      // Add multiple users by email
      if (emails && Array.isArray(emails)) {
        const users = await prisma.user.findMany({
          where: {
            email: {
              in: emails,
            },
          },
          select: { id: true, email: true },
        });

        const addedMembers = [];
        for (const u of users) {
          const exists = await prisma.channelMember.findUnique({
            where: {
              userId_channelId: {
                userId: u.id,
                channelId,
              },
            },
          });

          if (!exists) {
            const member = await prisma.channelMember.create({
              data: {
                channelId,
                userId: u.id,
              },
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
            });
            addedMembers.push(member);
          }
        }

        return NextResponse.json({
          added: addedMembers,
          count: addedMembers.length,
        });
      }
    }

    if (action === "remove") {
      if (!userId) {
        return NextResponse.json(
          { error: "userId required to remove member" },
          { status: 400 }
        );
      }

      await prisma.channelMember.delete({
        where: {
          userId_channelId: {
            userId,
            channelId,
          },
        },
      });

      return NextResponse.json({
        message: "Member removed successfully",
      });
    }

    if (action === "promote_editor") {
      if (!userId) {
        return NextResponse.json(
          { error: "userId required" },
          { status: 400 }
        );
      }

      const existingEditor = await prisma.channelEditor.findUnique({
        where: {
          userId_channelId: {
            userId,
            channelId,
          },
        },
      });

      if (existingEditor) {
        return NextResponse.json(
          { error: "User is already an editor" },
          { status: 400 }
        );
      }

      const editor = await prisma.channelEditor.create({
        data: {
          channelId,
          userId,
        },
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
      });

      return NextResponse.json(editor);
    }

    if (action === "demote_editor") {
      if (!userId) {
        return NextResponse.json(
          { error: "userId required" },
          { status: 400 }
        );
      }

      await prisma.channelEditor.delete({
        where: {
          userId_channelId: {
            userId,
            channelId,
          },
        },
      });

      return NextResponse.json({
        message: "Editor permissions removed successfully",
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (err) {
    console.error("Error managing channel members:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
