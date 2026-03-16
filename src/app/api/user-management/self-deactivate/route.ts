import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";

/**
 * Self-Deactivate Account API
 * PUT /api/user-management/self-deactivate
 *
 * Allows users to deactivate their own account with password verification
 * Account data is preserved and can be reactivated by logging back in
 */
export async function PUT(request: NextRequest) {
  try {
    const userIdHeader = request.headers.get("x-user-id");
    if (!userIdHeader) {
      return NextResponse.json(
        { error: "Missing x-user-id header" },
        { status: 401 }
      );
    }

    const userId = userIdHeader;
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password || "");
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    // Check if already deactivated
    if (!user.active) {
      return NextResponse.json(
        { error: "Account is already deactivated" },
        { status: 400 }
      );
    }

    // Deactivate account
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { active: false },
      select: {
        id: true,
        email: true,
        firstName: true,
        active: true,
      },
    });

    return NextResponse.json({
      message: "Account deactivated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Self-deactivate error:", error);
    return NextResponse.json(
      { error: "Failed to deactivate account" },
      { status: 500 }
    );
  }
}
