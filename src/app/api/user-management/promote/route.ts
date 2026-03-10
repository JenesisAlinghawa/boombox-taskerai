/**
 * User Promotion API
 * 
 * Allows OWNER to promote users to higher roles
 * 
 * How Co-Owner Delegation Works:
 * - Only OWNER can call this endpoint
 * - Can promote users to MANAGER or CO_OWNER
 * - CO_OWNER cannot promote other users (prevents privilege escalation)
 * - This ensures a clear chain of command with single authority (OWNER)
 * 
 * POST /api/users/promote
 * Body: {
 *   userId: number,
 *   newRole: "MANAGER" | "CO_OWNER"
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, canPromoteUsers, isValidRole, canPromoteTo } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only OWNER can promote users
    if (!canPromoteUsers(user.role)) {
      return NextResponse.json(
        { error: "Only OWNER can promote users" },
        { status: 403 }
      );
    }

    const { userId, newRole } = await request.json();

    if (!userId || !newRole) {
      return NextResponse.json(
        { error: "userId and newRole are required" },
        { status: 400 }
      );
    }

    // Validate role
    if (!isValidRole(newRole)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: EMPLOYEE, TEAM_LEAD, MANAGER, CO_OWNER, OWNER` },
        { status: 400 }
      );
    }

    // Check if promotion is allowed
    if (!canPromoteTo(user.role, newRole)) {
      return NextResponse.json(
        { error: "Cannot promote to OWNER role" },
        { status: 403 }
      );
    }

    // Find the user to promote
    const userToPromote = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userToPromote) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Cannot promote OWNER
    if (userToPromote.role === "OWNER") {
      return NextResponse.json(
        { error: "Cannot change OWNER role" },
        { status: 403 }
      );
    }

    // Cannot promote self
    if (userId === user.id) {
      return NextResponse.json(
        { error: "Cannot promote yourself" },
        { status: 400 }
      );
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    return NextResponse.json({
      user: updatedUser,
      message: `User promoted to ${newRole}`,
    });
  } catch (error) {
    console.error("Error promoting user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
