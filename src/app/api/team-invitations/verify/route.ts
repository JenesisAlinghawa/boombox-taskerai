/**
 * Verify Invite Token API
 * 
 * Verifies that an invite token is valid and returns pre-filled data
 * 
 * GET /api/invite/verify?token=xxx
 */

import { NextRequest, NextResponse } from "next/server";
import { getEmailFromToken } from "@/lib/inviteTokenStore";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Verify token and get email
    const email = getEmailFromToken(token);
    
    if (!email) {
      return NextResponse.json(
        { error: "Invalid or expired invite link" },
        { status: 400 }
      );
    }

    // Return email and pre-filled data
    return NextResponse.json({
      email,
      firstName: "",
      lastName: "",
    });
  } catch (error) {
    console.error("Error verifying invite:", error);
    return NextResponse.json(
      { error: "Invalid or expired invite link" },
      { status: 400 }
    );
  }
}
