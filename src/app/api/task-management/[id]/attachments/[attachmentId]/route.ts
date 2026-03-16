import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface Params {
  params: Promise<{ id: string; attachmentId: string }>;
}

// Helper to extract user from headers
function getUserIdFromRequest(request: NextRequest): string | null {
  return request.headers.get('x-user-id');
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id, attachmentId } = await params;
    const taskId = id as string;
    const aId = Number(attachmentId);
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to this task
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        createdById: true,
        assignees: { select: { assigneeId: true } }
      }
    });

    if (!task) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const assigneeIds = task.assignees.map(a => a.assigneeId);
    if (task.createdById !== userId && !assigneeIds.includes(userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get attachment info before deleting
    const attachment = await prisma.attachment.findUnique({
      where: { id: aId },
      select: { filename: true }
    });

    await prisma.attachment.delete({ where: { id: aId } });

    // Also log to activity log for the logs page
    try {
      await prisma.log.create({
        data: {
          userId: userId,
          taskId: taskId,
          action: 'Deleted attachment',
          data: {
            attachmentId: aId,
            filename: attachment?.filename,
          },
        },
      });
    } catch (logError) {
      console.error('Failed to create activity log:', logError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete attachment error:", error);
    return NextResponse.json({ error: "Failed to delete attachment" }, { status: 500 });
  }
}
