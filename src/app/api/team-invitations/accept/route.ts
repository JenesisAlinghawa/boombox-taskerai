/**
 * Accept Invite API
 * 
 * Completes signup for invited user
 * Creates new user account and automatically approves them (isVerified: true, active: true)
 * since they were invited by the owner
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
import bcrypt from "bcrypt";
import { getEmailFromToken, deleteInviteToken } from "@/lib/inviteTokenStore";

export async function POST(request: NextRequest) {
  try {
    const { token, email, password, firstName, lastName } = await request.json();

    if (!token || !email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Verify token is valid and matches email
    const tokenEmail = getEmailFromToken(token);
    
    if (!tokenEmail) {
      return NextResponse.json(
        { error: "Invalid or expired invite link" },
        { status: 400 }
      );
    }

    if (tokenEmail !== email.toLowerCase()) {
      return NextResponse.json(
        { error: "Token does not match email" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser && existingUser.isVerified) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    let newUser;

    if (existingUser) {
      // Update existing user (from previous invite attempt)
      newUser = await prisma.user.update({
        where: { email: email.toLowerCase() },
        data: {
          password: hashedPassword,
          firstName,
          lastName,
          // AUTO-APPROVE: Set as verified and active since they were invited by owner
          isVerified: true,
          active: true,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isVerified: true,
          active: true,
        },
      });
    } else {
      // Create new user
      newUser = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          firstName,
          lastName,
          role: "EMPLOYEE",
          // AUTO-APPROVE: Set as verified and active since they were invited by owner
          isVerified: true,
          active: true,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isVerified: true,
          active: true,
        },
      });
    }

    // Delete the used token
    deleteInviteToken(token);

    return NextResponse.json(
      {
        message: "Account created successfully and approved!",
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
