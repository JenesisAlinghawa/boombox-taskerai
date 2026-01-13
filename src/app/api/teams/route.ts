import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function getUserIdFromRequest(request: NextRequest): number | null {
  const userHeader = request.headers.get("x-user-id");
  if (userHeader) {
    return parseInt(userHeader, 10);
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First, try to get user's own team (where they're the owner)
    let team = await prisma.team.findFirst({
      where: { ownerId: userId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
            inviter: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    // If no team as owner, check if they're a member of any team
    if (!team) {
      const memberRecord = await prisma.teamMember.findFirst({
        where: { userId },
        include: {
          team: {
            include: {
              members: {
                include: {
                  user: {
                    select: { id: true, name: true, email: true },
                  },
                  inviter: {
                    select: { id: true, name: true, email: true },
                  },
                },
              },
            },
          },
        },
      });

      if (memberRecord) {
        team = memberRecord.team;
      }
    }

    // If still no team, create one for this user
    if (!team) {
      team = await prisma.team.create({
        data: {
          name: `${(await prisma.user.findUnique({ where: { id: userId }, select: { name: true } }))?.name || "My"} Team`,
          ownerId: userId,
          members: {
            create: {
              userId: userId, // Add the owner as a team member too
            },
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
              inviter: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      });
    }

    return NextResponse.json({ team });
  } catch (error) {
    console.error("Get team error:", error);
    return NextResponse.json({ error: "Failed to fetch team" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    // Find user by email (normalize to lowercase)
    const normalizedEmail = email.toLowerCase();
    const userToAdd = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, name: true, email: true },
    });

    if (!userToAdd) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user's team
    let team = await prisma.team.findFirst({
      where: { ownerId: userId },
    });

    if (!team) {
      team = await prisma.team.create({
        data: {
          name: `Team`,
          ownerId: userId,
          members: {
            create: {
              userId: userId, // Add the owner as a team member
            },
          },
        },
      });
    }

    // Check if user is already in team
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: team.id,
          userId: userToAdd.id,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json({ error: "User already in team" }, { status: 400 });
    }

    // Add user to team with inviter
    const member = await prisma.teamMember.create({
      data: {
        teamId: team.id,
        userId: userToAdd.id,
        inviterId: userId, // Store who added this member
      },
    });

    // Create notification for the added user
    const inviterName = (await prisma.user.findUnique({ where: { id: userId }, select: { name: true } }))?.name || "A user";
    await prisma.notification.create({
      data: {
        userId: userToAdd.id,
        type: "team_added",
        title: "Added to Team",
        message: `${inviterName} added you to their team`,
        relatedId: team.id,
      },
    });

    return NextResponse.json({ member, user: userToAdd });
  } catch (error) {
    console.error("Add team member error:", error);
    return NextResponse.json({ error: "Failed to add user" }, { status: 500 });
  }
}
