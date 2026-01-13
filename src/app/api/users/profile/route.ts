import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function getUserIdFromRequest(request: NextRequest): number | null {
  const userHeader = request.headers.get("x-user-id");
  if (userHeader) {
    return parseInt(userHeader, 10);
  }
  return null;
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await request.json();
    if (!name) {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { name },
      select: { id: true, name: true, email: true },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
