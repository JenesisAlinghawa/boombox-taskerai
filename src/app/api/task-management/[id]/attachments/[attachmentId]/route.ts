import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface Params {
  params: Promise<{ id: string; attachmentId: string }>;
}

// Helper to extract user from headers
function getUserIdFromRequest(request: NextRequest): number | null {
  const userHeader = request.headers.get('x-user-id');
  if (userHeader) {
    return parseInt(userHeader, 10);
  }
  return null;
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id, attachmentId } = await params;
    const taskId = Number(id);
    const aId = Number(attachmentId);
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to this task
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { createdById: true, assigneeId: true }
    });

    if (!task) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (task.createdById !== userId && task.assigneeId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.attachment.delete({ where: { id: aId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete attachment error:", error);
    return NextResponse.json({ error: "Failed to delete attachment" }, { status: 500 });
  }
}
