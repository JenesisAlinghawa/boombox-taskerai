import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function getUserIdFromRequest(request: NextRequest): string | null {
  return request.headers.get('x-user-id');
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);

    // Log user logout if we have userId
    if (userId) {
      try {
        await prisma.log.create({
          data: {
            userId: userId,
            action: 'User logged out',
            data: {
              logoutTime: new Date().toISOString(),
            },
          },
        });
      } catch (logError) {
        console.error('Failed to log logout event:', logError);
        // Don't throw - logging failure shouldn't prevent logout
      }
    }

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
