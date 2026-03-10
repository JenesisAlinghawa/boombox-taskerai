/**
 * Approve User API
 * 
 * Endpoint to approve a pending user (set active=true)
 * Only OWNER can access this endpoint
 * 
 * POST /api/users/[id]/approve
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, canPromoteUsers } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canPromoteUsers(user.role)) {
      return NextResponse.json(
        { error: "Only OWNER can approve users" },
        { status: 403 }
      );
    }

    const userId = parseInt(id, 10);

    // Find and verify the user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if already approved
    if (targetUser.active) {
      return NextResponse.json(
        { error: "User is already approved" },
        { status: 400 }
      );
    }

    // Approve the user
    const approvedUser = await prisma.user.update({
      where: { id: userId },
      data: { 
        active: true, // Activate the account
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isVerified: true,
        active: true,
      },
    });

    return NextResponse.json({
      message: "User approved successfully",
      user: approvedUser,
    });
  } catch (error) {
    console.error("Error approving user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
