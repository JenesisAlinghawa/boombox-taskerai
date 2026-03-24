import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createNotification } from "@/lib/notificationService";

function getUserIdFromRequest(request: NextRequest): string | null {
  return request.headers.get('x-user-id');
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
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
            inviter: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    });

    console.log("DEBUG team-management: Initial team query result:", team ? { id: team.id, ownerId: team.ownerId, membersCount: team.members?.length || 0 } : "No team found");

    // If no team as owner, check if they're a member of any team
    if (!team) {
      const memberRecord = await prisma.teamMember.findFirst({
        where: { userId },
        include: {
          team: {
            include: {
              owner: {
                select: { id: true, firstName: true, lastName: true, email: true },
              },
              members: {
                include: {
                  user: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                  },
                  inviter: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                  },
                },
              },
            },
          },
        },
      });

      if (memberRecord) {
        team = memberRecord.team;
        console.log("DEBUG team-management: Found team as member:", team ? { id: team.id, ownerId: team.ownerId, membersCount: team.members?.length || 0 } : "No team");
      }
    }

    // If still no team, create one for this user
    if (!team) {
      const userNameData = (await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } }));
      const displayName = `${userNameData?.firstName || ""} ${userNameData?.lastName || ""}`.trim() || "My";
      team = await prisma.team.create({
        data: {
          name: `${displayName} Team`,
          ownerId: userId,
          members: {
            create: {
              userId: userId, // Add the owner as a team member too
            },
          },
        },
        include: {
          owner: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          members: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, email: true },
              },
              inviter: {
                select: { id: true, firstName: true, lastName: true, email: true },
              },
            },
          },
        },
      });
      console.log("DEBUG team-management: Created new team:", team ? { id: team.id, ownerId: team.ownerId, membersCount: team.members?.length || 0 } : "Failed to create");
    }

    console.log("DEBUG team-management: Final team data:", {
      teamId: team.id,
      ownerId: team.ownerId,
      members: team.members?.map(m => ({ userId: m.userId, user: m.user })) || []
    });

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
      select: { id: true, firstName: true, lastName: true, email: true },
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
    const inviterData = (await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } }));
    const inviterName = `${inviterData?.firstName || ""} ${inviterData?.lastName || ""}`.trim() || "A user";
    await createNotification({
      receiverId: userToAdd.id,
      type: "team_added",
      data: {
        title: "Added to Team",
        message: `${inviterName} added you to their team`,
      },
    });

    return NextResponse.json({ member, user: userToAdd });
  } catch (error) {
    console.error("Add team member error:", error);
    return NextResponse.json({ error: "Failed to add user" }, { status: 500 });
  }
}
