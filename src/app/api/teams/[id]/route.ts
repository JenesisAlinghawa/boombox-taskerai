import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function getUserIdFromRequest(request: NextRequest): number | null {
  const userHeader = request.headers.get("x-user-id");
  if (userHeader) {
    return parseInt(userHeader, 10);
  }
  return null;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const memberId = parseInt(id);
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { status } = await request.json();
    if (!status) {
      return NextResponse.json({ error: "Status required" }, { status: 400 });
    }

    // Verify user owns the team or is the member
    const member = await prisma.teamMember.findUnique({
      where: { id: memberId },
      include: { team: true },
    });

    if (!member || (member.team.ownerId !== userId && member.userId !== userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update member status
    const updated = await prisma.teamMember.update({
      where: { id: memberId },
      data: { status },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ member: updated });
  } catch (error) {
    console.error("Update team member error:", error);
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const memberId = parseInt(id);
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user owns the team or is the member
    const member = await prisma.teamMember.findUnique({
      where: { id: memberId },
      include: { team: true },
    });

    if (!member || (member.team.ownerId !== userId && member.userId !== userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete member
    await prisma.teamMember.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete team member error:", error);
    return NextResponse.json({ error: "Failed to delete member" }, { status: 500 });
  }
}
