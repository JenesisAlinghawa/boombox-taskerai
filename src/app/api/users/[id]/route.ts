import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * PUT /api/users/[id]
 * Update user profile (first name, last name, profile picture)
 * Users can only update their own profile
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = parseInt(id, 10);

    // Get user from request headers
    const userIdHeader = request.headers.get("x-user-id");
    if (!userIdHeader) {
      return NextResponse.json(
        { error: "Missing x-user-id header" },
        { status: 401 }
      );
    }

    const currentUserId = parseInt(userIdHeader, 10);

    // Users can only update their own profile
    if (currentUserId !== userId) {
      return NextResponse.json(
        { error: "You can only update your own profile" },
        { status: 403 }
      );
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { firstName, lastName, profilePicture } = await request.json();

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      );
    }

    const updateData: any = {
      firstName,
      lastName,
    };

    // Only update profile picture if provided
    if (profilePicture) {
      updateData.profilePicture = profilePicture;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isVerified: true,
        profilePicture: true,
        active: true,
        lastActive: true,
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("Update user profile error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
