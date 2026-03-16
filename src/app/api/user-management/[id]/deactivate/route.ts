/**
 * Deactivate User API
 * 
 * Endpoint to deactivate a user (set active=false, restrict access)
 * Only OWNER can access this endpoint
 * Account data remains in database for reactivation if needed
 * Sends deactivation email to the user
 * 
 * PATCH /api/user-management/[id]/deactivate
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, canPromoteUsers } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export async function PATCH(
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
        { error: "Only OWNER can deactivate users" },
        { status: 403 }
      );
    }

    const userId = id;

    // Find and verify the user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if already deactivated
    if (!targetUser.active) {
      return NextResponse.json(
        { error: "User is already deactivated" },
        { status: 400 }
      );
    }

    // Deactivate the user
    const deactivatedUser = await prisma.user.update({
      where: { id: userId },
      data: { 
        active: false, // Deactivate the account
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        active: true,
      },
    });

    // Send deactivation email
    try {
      await sendEmail({
        to: deactivatedUser.email,
        subject: "Your TaskerAI Account Has Been Deactivated",
        template: "deactivated",
        data: {
          firstName: deactivatedUser.firstName,
        },
      });
    } catch (emailError) {
      console.error("Failed to send deactivation email:", emailError);
      // Don't fail the entire request if email fails
    }

    return NextResponse.json({
      message: "User deactivated successfully",
      user: deactivatedUser,
    });
  } catch (error) {
    console.error("Deactivate user error:", error);
    return NextResponse.json(
      { error: "Failed to deactivate user" },
      { status: 500 }
    );
  }
}
