import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logCommentEvent, getIpAddress } from "@/lib/auditLog";

interface Params {
  params: Promise<{ id: string }>;
}

// Helper to extract user from headers
function getUserIdFromRequest(request: NextRequest): string | null {
  return request.headers.get('x-user-id');
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const taskId = id;
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

    const comments = await prisma.comment.findMany({ 
      where: { taskId }, 
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, profilePicture: true } } }, 
      orderBy: { createdAt: 'asc' } 
    });
    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Get comments error:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const taskId = id;
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, parentCommentId } = await request.json();
    if (!content) return NextResponse.json({ error: 'Content required' }, { status: 400 });

    // If parentCommentId is provided, verify it exists and belongs to the same task
    if (parentCommentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: Number(parentCommentId) },
        select: { taskId: true }
      });
      if (!parentComment || parentComment.taskId !== taskId) {
        return NextResponse.json({ error: 'Invalid parent comment' }, { status: 400 });
      }
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

    const comment = await prisma.comment.create({ 
      data: { taskId, userId, content, parentCommentId: parentCommentId ? Number(parentCommentId) : null } 
    });
    const full = await prisma.comment.findUnique({ 
      where: { id: comment.id }, 
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, profilePicture: true } } } 
    });
    // Audit log
    await logCommentEvent({
      userId: userId,
      action: "COMMENT_CREATED",
      commentId: full?.id || comment.id,
      taskId: taskId,
      ipAddress: getIpAddress(request as any),
    });

    // Also log to activity log for the logs page
    try {
      await prisma.log.create({
        data: {
          userId: userId,
          taskId: taskId,
          action: 'Added comment',
          data: {
            commentId: full?.id || comment.id,
            commentContent: content.substring(0, 100), // First 100 chars
          },
        },
      });
    } catch (logError) {
      console.error('Failed to create activity log:', logError);
    }

    return NextResponse.json({ comment: full });
  } catch (error) {
    console.error('Create comment error:', error);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}
