/**
 * User Signup API
 * 
 * Endpoint for new users to register with email and password
 * Default role: EMPLOYEE (unverified, requires admin approval)
 * Creates a NEW_USER_REQUEST notification for the OWNER
 * 
 * POST /api/auth/signup
 * Body: {
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
    const { email, password, firstName, lastName } = await request.json();

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Email, password, firstName, and lastName are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password with bcryptjs
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new user with EMPLOYEE role and unverified status
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
        createdAt: true,
      },
    });

    // Find OWNER to notify
    const owner = await prisma.user.findFirst({
      where: { role: "OWNER" },
      select: { id: true },
    });

    // Create NEW_USER_REQUEST notification for OWNER
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
        message: "Signup successful. Awaiting admin approval to activate your account.",
        user: newUser,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
