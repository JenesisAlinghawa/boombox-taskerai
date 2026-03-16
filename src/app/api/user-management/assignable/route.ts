/**
 * Assignable Users API
 * 
 * Endpoint to get users available for task assignment
 * Available to all authenticated users (including EMPLOYEE)
 * Used by task management UI to show assignee dropdown
 * 
 * Returns ALL active, verified team members. Client-side filtering
 * will restrict based on user roles. This ensures TaskerBot can show
 * all available team members for task assignment.
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

    // Get all active, verified users for task assignment (no role-based server filtering)
    // Client will handle role-based filtering to prevent assignment to higher roles
    const assignableUsers = await prisma.user.findMany({
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

    return NextResponse.json({ users: assignableUsers });
  } catch (error) {
    console.error("Error fetching assignable users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
