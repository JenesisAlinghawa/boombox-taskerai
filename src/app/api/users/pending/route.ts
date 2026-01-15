/**
 * Get Pending Users API
 * 
 * Endpoint to fetch users with isVerified=false
 * Only OWNER can access this endpoint
 * 
 * GET /api/users/pending
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, canPromoteUsers } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canPromoteUsers(user.role)) {
      return NextResponse.json(
        { error: "Only OWNER can view pending requests" },
        { status: 403 }
      );
    }

    const pendingUsers = await prisma.user.findMany({
      where: { isVerified: false },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ users: pendingUsers });
  } catch (error) {
    console.error("Error fetching pending users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
