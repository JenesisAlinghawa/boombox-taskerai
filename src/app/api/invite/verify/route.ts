/**
 * Verify Invite Token API
 * 
 * Verifies that an invite token is valid and returns pre-filled data
 * 
 * GET /api/invite/verify?token=xxx
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // TODO: Verify token from database or cache
    // For now, extract email from token if needed
    // In production, store invites in database with expiry

    // Placeholder: return empty data to be filled by user
    return NextResponse.json({
      email: "",
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
