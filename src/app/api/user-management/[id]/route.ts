import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

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
    const userId = id; // id is now a UUID string

    // Get user from request headers
    const userIdHeader = request.headers.get("x-user-id");
    if (!userIdHeader) {
      return NextResponse.json(
        { error: "Missing x-user-id header" },
        { status: 401 }
      );
    }

    const currentUserId = userIdHeader; // Direct string UUID

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

    const { firstName, lastName, profilePicture, phoneNumber, country, city, zipCode, dateOfBirth, province, barangay, emailNotifications, messageNotifications } = await request.json();

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

    // Update address fields if provided
    if (phoneNumber !== undefined) {
      updateData.phoneNumber = phoneNumber || null;
    }
    if (country !== undefined) {
      updateData.country = country || null;
    }
    if (city !== undefined) {
      updateData.city = city || null;
    }
    if (province !== undefined) {
      updateData.province = province || null;
    }
    if (barangay !== undefined) {
      updateData.barangay = barangay || null;
    }
    if (zipCode !== undefined) {
      updateData.zipCode = zipCode || null;
    }
    if (dateOfBirth !== undefined) {
      updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    }

    // update notification settings if provided
    if (typeof emailNotifications === "boolean") {
      updateData.emailNotifications = emailNotifications;
    }
    if (typeof messageNotifications === "boolean") {
      updateData.messageNotifications = messageNotifications;
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
        phoneNumber: true,
        country: true,
        city: true,
        province: true,
        barangay: true,
        zipCode: true,
        dateOfBirth: true,
        active: true,
        lastActive: true,
        emailNotifications: true,
        messageNotifications: true,
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

/**
 * DELETE /api/user-management/[id]
 * Delete a user completely from the database
 * Only OWNER can delete users
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = id; // id is now a UUID string

    // Get user from request headers
    const userIdHeader = request.headers.get("x-user-id");
    if (!userIdHeader) {
      return NextResponse.json(
        { error: "Missing x-user-id header" },
        { status: 401 }
      );
    }

    const currentUserId = userIdHeader; // Direct string UUID
    
    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only OWNER can delete users
    if (currentUser.role !== "OWNER") {
      return NextResponse.json(
        { error: "Only OWNER can delete users" },
        { status: 403 }
      );
    }

    // Cannot delete OWNER account through team management
    if (userId === currentUserId) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    // Verify user exists
    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userToDelete) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Send deletion email before deleting
    try {
      await sendEmail({
        to: userToDelete.email,
        subject: "Your TaskerAI Account Has Been Deleted",
        template: "deleted",
        data: {
          firstName: userToDelete.firstName,
        },
      });
    } catch (emailError) {
      console.error("Failed to send deletion email:", emailError);
      // Don't fail the entire request if email fails
    }

    // Delete the user
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ 
      message: "User deleted successfully",
      success: true 
    });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
