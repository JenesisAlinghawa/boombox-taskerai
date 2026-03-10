import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logCommentEvent, getIpAddress } from "@/lib/auditLog";

interface Params {
  params: Promise<{ id: string; commentId: string }>;
}

// Helper to extract user from headers
function getUserIdFromRequest(request: NextRequest): number | null {
  const userHeader = request.headers.get('x-user-id');
  if (userHeader) {
    return parseInt(userHeader, 10);
  }
  return null;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id, commentId } = await params;
    const taskId = Number(id);
    const cId = Number(commentId);
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content } = await request.json();
    if (!content) return NextResponse.json({ error: 'Content required' }, { status: 400 });

    // Verify task exists and get creator
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { createdById: true }
    });

    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Ensure comment exists and belongs to the task
    const existingComment = await prisma.comment.findUnique({ where: { id: cId }, select: { id: true, userId: true, taskId: true } });
    if (!existingComment || existingComment.taskId !== taskId) {
      return NextResponse.json({ error: 'Comment not found for this task' }, { status: 404 });
    }

    // Allow update only if user is the comment author or task creator
    if (existingComment.userId !== userId && task.createdById !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const comment = await prisma.comment.update({
      where: { id: cId },
      data: { content },
      include: { user: { select: { id: true, firstName: true, lastName: true } } }
    });

    // Audit log
    await logCommentEvent({
      userId: userId,
      action: "COMMENT_UPDATED",
      commentId: comment.id,
      taskId: taskId,
      ipAddress: getIpAddress(request as any),
    });

    return NextResponse.json({ comment });
  } catch (error) {
    console.error('Update comment error:', error);
    return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id, commentId } = await params;
    const taskId = Number(id);
    const cId = Number(commentId);
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify task exists and get creator
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { createdById: true }
    });

    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Ensure comment exists and belongs to the task
    const existingComment = await prisma.comment.findUnique({ where: { id: cId }, select: { id: true, userId: true, taskId: true } });
    if (!existingComment || existingComment.taskId !== taskId) {
      return NextResponse.json({ error: 'Comment not found for this task' }, { status: 404 });
    }

    // Allow delete only if user is the comment author or task creator
    if (existingComment.userId !== userId && task.createdById !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.comment.delete({ where: { id: cId } });

    // Audit log
    await logCommentEvent({
      userId: userId,
      action: "COMMENT_DELETED",
      commentId: cId,
      taskId: taskId,
      ipAddress: getIpAddress(request as any),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete comment error:', error);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}
