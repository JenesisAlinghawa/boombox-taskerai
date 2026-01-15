/**
 * Accept Invite API
 * 
 * Completes signup for invited user
 * Creates new user account and sets isVerified to false (pending approval)
 * 
 * POST /api/invite/accept
 * Body: {
 *   token: string,
 *   email: string,
 *   password: string,
 *   firstName: string,
 *   lastName: string
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { token, email, password, firstName, lastName } = await request.json();

    if (!token || !email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // TODO: Verify token validity and expiry

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        role: "EMPLOYEE",
        isVerified: false,
        active: false,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isVerified: true,
      },
    });

    // Find OWNER and create notification
    const owner = await prisma.user.findFirst({
      where: { role: "OWNER" },
      select: { id: true },
    });

    if (owner) {
      await prisma.notification.create({
        data: {
          receiverId: owner.id,
          type: "NEW_USER_REQUEST",
          data: {
            newUserId: newUser.id,
            firstName,
            lastName,
            email: newUser.email,
          },
          read: false,
        },
      });
    }

    return NextResponse.json(
      {
        message: "Account created successfully. Awaiting admin approval.",
        user: newUser,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error accepting invite:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
