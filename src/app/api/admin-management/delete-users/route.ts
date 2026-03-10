import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserIdFromRequest, canPromoteUsers } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    // Check if user is authenticated and is owner
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify user is OWNER
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.role !== "OWNER") {
      return NextResponse.json(
        { error: "Unauthorized - Owner access required" },
        { status: 403 }
      );
    }

    // Delete all users except the owner (user with OWNER role)
    const result = await prisma.user.deleteMany({
      where: {
        role: {
          not: "OWNER",
        },
      },
    });

    return NextResponse.json(
      {
        message: `Deleted ${result.count} users (kept owner)`,
        deletedCount: result.count,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting users:", error);
    return NextResponse.json(
      { error: "Failed to delete users" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Check if user is authenticated and is owner
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify user is OWNER
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.role !== "OWNER") {
      return NextResponse.json(
        { error: "Unauthorized - Owner access required" },
        { status: 403 }
      );
    }

    // Count users that would be deleted
    const nonOwnerUsers = await prisma.user.findMany({
      where: {
        role: {
          not: "OWNER",
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    return NextResponse.json(
      {
        message: "Non-owner users that would be deleted",
        count: nonOwnerUsers.length,
        users: nonOwnerUsers,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
