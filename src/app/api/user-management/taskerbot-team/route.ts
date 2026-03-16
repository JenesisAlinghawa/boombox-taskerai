/**
 * TaskerBot Team Members API
 *
 * Returns all team members with their roles for the TaskerBot AI assistant
 * Available to all authenticated users so the AI can provide proper guidance
 * on task assignment permissions and team member information
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

    // Get all active, verified users in the same team
    // First, find the user's team
    let teamMembers: any[] = [];

    // Check if user is a team owner
    const ownedTeam = await prisma.team.findFirst({
      where: { ownerId: user.id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (ownedTeam) {
      // User is owner, get all team members
      teamMembers = ownedTeam.members.map((member: any) => ({
        id: member.user.id,
        name: `${member.user.firstName} ${member.user.lastName}`.trim(),
        email: member.user.email,
        role: member.user.role,
      }));
    } else {
      // Check if user is a team member
      const memberRecord = await prisma.teamMember.findFirst({
        where: { userId: user.id },
        include: {
          team: {
            include: {
              members: {
                include: {
                  user: {
                    select: {
                      id: true,
                      email: true,
                      firstName: true,
                      lastName: true,
                      role: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (memberRecord) {
        // User is a team member, get all team members
        teamMembers = memberRecord.team.members.map((member: any) => ({
          id: member.user.id,
          name: `${member.user.firstName} ${member.user.lastName}`.trim(),
          email: member.user.email,
          role: member.user.role,
        }));
      } else {
        // User has no team, just return themselves
        teamMembers = [{
          id: user.id,
          name: `${user.firstName} ${user.lastName}`.trim(),
          email: user.email,
          role: user.role,
        }];
      }
    }

    return NextResponse.json({ users: teamMembers });
  } catch (error) {
    console.error("Error fetching team members for TaskerBot:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}