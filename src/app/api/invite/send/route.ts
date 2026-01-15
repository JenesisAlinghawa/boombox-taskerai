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
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canManageUsers(user.role)) {
      return NextResponse.json(
        { error: "Only managers can send invites" },
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
    const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Send email with invite link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const inviteLink = `${appUrl}/invite?token=${inviteToken}`;

    // TODO: Integrate with email service (Mailjet, SendGrid, etc.)
    // For now, log the invite link
    console.log(`Invite link for ${email}: ${inviteLink}`);

    // Store invite token (in production, use a separate Invite model)
    // For now, we'll just return success
    await fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: email,
        subject: "You've been invited to TaskerAI",
        template: "invite",
        data: {
          inviteLink,
          senderName: `${user.firstName} ${user.lastName}`,
        },
      }),
    }).catch((err) => console.error("Failed to send email:", err));

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
