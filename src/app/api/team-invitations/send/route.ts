/**
 * Send Invite API
 * 
 * Generates secure invite link and sends email to user
 * If email exists: Send invite link to create account
 * If email doesn't exist: Generate new user and send invite
 * 
 * POST /api/invite/send
 * Body: {
 *   email: string
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, canManageUsers } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { storeInviteToken } from "@/lib/inviteTokenStore";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canManageUsers(user.role)) {
      return NextResponse.json(
        { error: "Only admins and owners can send invites" },
        { status: 403 }
      );
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser && existingUser.isVerified) {
      return NextResponse.json(
        { error: "User already exists and is verified" },
        { status: 409 }
      );
    }

    // Generate secure token
    const inviteToken = uuidv4();
    
    // Store token mapping for verification
    storeInviteToken(inviteToken, email);

    // Create or update user with pending status
    let inviteUser;
    if (existingUser) {
      // User already exists (possibly unverified)
      if (existingUser.isVerified) {
        return NextResponse.json(
          { error: "User already exists and is verified" },
          { status: 409 }
        );
      }
      // Unverified user - no need to update, just send invite to existing
    } else {
      // Create new unverified user
      inviteUser = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          firstName: "",
          lastName: "",
          password: "", // Will set on invite acceptance
          isVerified: false,
          active: false,
          role: "EMPLOYEE",
        },
      });
    }

    // Send email with invite link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const inviteLink = `${appUrl}/invite?token=${inviteToken}`;

    // Try to send email directly
    try {
      await sendEmail({
        to: email.toLowerCase(),
        subject: "You've been invited to TaskerAI",
        template: "invite",
        data: {
          inviteLink,
          senderName: `${user.firstName} ${user.lastName}`,
        },
      });
    } catch (emailErr) {
      console.error("Error sending email:", emailErr);
      // Continue even if email fails - user can still accept with the token
    }

    return NextResponse.json({
      message: "Invite sent successfully",
      inviteLink: process.env.NODE_ENV === "development" ? inviteLink : undefined,
    });
  } catch (error) {
    console.error("Error sending invite:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
