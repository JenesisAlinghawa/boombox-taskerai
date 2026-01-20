/**
 * Assignable Users API
 * 
 * Endpoint to get users available for task assignment
 * Available to all authenticated users (including EMPLOYEE)
 * Used by task management UI to show assignee dropdown
 * 
 * Role-based filtering:
 * - EMPLOYEE can only assign themselves
 * - TEAM_LEAD can assign EMPLOYEE and TEAM_LEAD
 * - MANAGER can assign EMPLOYEE, TEAM_LEAD, and MANAGER
 * - CO_OWNER can assign anyone except OWNER
 * - OWNER can assign anyone
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, getRoleHierarchyLevel } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Define role hierarchy to filter assignable users
    const userHierarchyLevel = getRoleHierarchyLevel(user.role);

    // Get all active, verified users for task assignment
    const allUsers = await prisma.user.findMany({
      where: {
        active: true,
        isVerified: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
      orderBy: { firstName: "asc" },
    });

    // Filter users based on role hierarchy
    // A user can only assign other users at their own level or below
    const assignableUsers = allUsers.filter((u) => {
      const assigneeHierarchyLevel = getRoleHierarchyLevel(u.role as any);
      return assigneeHierarchyLevel <= userHierarchyLevel;
    });

    return NextResponse.json({ users: assignableUsers });
  } catch (error) {
    console.error("Error fetching assignable users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
