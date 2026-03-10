import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { profilePicture } = await request.json();

    if (!profilePicture) {
      return NextResponse.json(
        { error: "Profile picture URL is required" },
        { status: 400 }
      );
    }

    // Update user's profile picture
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { profilePicture },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        profilePicture: true,
        role: true,
      },
    });

    return NextResponse.json({
      message: "Profile picture updated successfully",
      user: updated,
    });
  } catch (err) {
    console.error("Error updating profile picture:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
