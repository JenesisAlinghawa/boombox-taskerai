/**
 * Protected Users Management API
 * 
 * Role-Based Access Control:
 * - GET (list users): Only OWNER, CO_OWNER, MANAGER
 * - POST (create user): Only OWNER, CO_OWNER, MANAGER
 * - Other POST operations: Restricted to authorized roles
 * 
 * Returns 403 Forbidden with clear message for unauthorized users
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, canManageUsers } from "@/lib/auth";
import bcrypt from "bcryptjs";

/**
 * GET /api/users
 * List all users (admin only - OWNER, CO_OWNER, MANAGER)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to view user list
    if (!canManageUsers(user.role)) {
      return NextResponse.json(
        {
          error: "Only Manager, Co-Owner, or Owner can manage users",
          code: "INSUFFICIENT_ROLE",
        },
        { status: 403 }
      );
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isVerified: true,
        active: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users
 * Create new user with specified role (admin only)
 * 
 * Body: {
 *   email: string,
 *   password: string,
 *   name: string,
 *   role?: "EMPLOYEE" | "TEAM_LEAD" | "MANAGER" | "CO_OWNER"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to create users
    if (!canManageUsers(user.role)) {
      return NextResponse.json(
        {
          error: "Only Manager, Co-Owner, or Owner can manage users",
          code: "INSUFFICIENT_ROLE",
        },
        { status: 403 }
      );
    }

    const { email, password, firstName, lastName, role } = await request.json();

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Email, password, first name, and last name are required" },
        { status: 400 }
      );
    }

    // Validate role if provided
    const userRole = role || "EMPLOYEE";
    const validRoles = ["EMPLOYEE", "TEAM_LEAD", "MANAGER", "CO_OWNER"];

    if (!validRoles.includes(userRole)) {
      return NextResponse.json(
        { error: "Invalid role. Only managers can assign EMPLOYEE, TEAM_LEAD, or MANAGER roles" },
        { status: 400 }
      );
    }

    // Prevent non-OWNER from creating CO_OWNER or OWNER users
    if ((userRole === "CO_OWNER" || userRole === "OWNER") && user.role !== "OWNER") {
      return NextResponse.json(
        { error: "Only Owner can create Co-Owner or Owner users" },
        { status: 403 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        role: userRole,
        isVerified: true, // Admin-created users are auto-verified
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { user: newUser, message: "User created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
