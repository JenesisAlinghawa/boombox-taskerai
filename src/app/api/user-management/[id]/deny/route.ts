/**
 * Deny User API
 * 
 * Endpoint to deny a pending user (delete the user)
 * Only OWNER can access this endpoint
 * 
 * POST /api/users/[id]/deny
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
        { error: "Only OWNER can deny users" },
        { status: 403 }
      );
    }

    const userId = parseInt(id, 10);

    // Prevent denying the OWNER
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (targetUser.role === "OWNER") {
      return NextResponse.json(
        { error: "Cannot deny OWNER account" },
        { status: 403 }
      );
    }

    // Delete the user
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({
      message: "User denied and removed successfully",
    });
  } catch (error) {
    console.error("Error denying user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
