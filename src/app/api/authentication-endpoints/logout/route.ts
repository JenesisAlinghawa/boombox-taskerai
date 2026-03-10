import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Create response with cleared cookies
    const response = NextResponse.json(
      { success: true, message: "Logged out successfully" },
      { status: 200 }
    );

    // Clear authentication cookies
    response.cookies.set("auth_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
    });

    response.cookies.set("user_session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
    });

    console.log("User logged out successfully");
    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Logout failed" },
      { status: 500 }
    );
  }
}
