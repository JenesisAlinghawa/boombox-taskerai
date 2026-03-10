import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logTaskEvent, getIpAddress } from "@/lib/auditLog";
import { updateOverdueTasks, isTaskOverdue } from "@/lib/overdueTasks";

interface Params {
  params: Promise<{ id: string }>;
}

// Helper to extract user from headers
function getUserIdFromRequest(request: NextRequest): number | null {
  const userHeader = request.headers.get('x-user-id');
  if (userHeader) {
    return parseInt(userHeader, 10);
  }
  return null;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const taskId = id;
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure overdue tasks are updated
    await updateOverdueTasks([taskId]);

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        comments: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        attachments: true,
      },
    });
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
    
    // Check if user is authorized to view this task
    if (task.createdBy?.id !== userId && task.assignee?.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    return NextResponse.json({ task });
  } catch (error) {
    console.error("Get task error:", error);
    return NextResponse.json({ error: "Failed to fetch task" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const taskId = id;
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is authorized to modify this task
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { createdById: true, assigneeId: true }
    });

    if (!task) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {
      // No body or invalid JSON — treat as empty update
      console.warn('PATCH request had no JSON body or failed to parse:', e);
      body = {};
    }

    // Fetch previous values for change tracking
    const prev = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        title: true,
        description: true,
        priority: true,
        dueDate: true,
        assigneeId: true,
        status: true,
      },
    });

    // If user is the creator, allow all updates
    if (task.createdById === userId) {
      const data: any = {};
      const changes: any[] = [];
      if (body.title !== undefined) {
        data.title = body.title;
        changes.push({ field: 'title', oldValue: prev?.title, newValue: body.title });
      }
      if (body.description !== undefined) {
        data.description = body.description;
        changes.push({ field: 'description', oldValue: prev?.description, newValue: body.description });
      }
      if (body.priority !== undefined) {
        data.priority = body.priority;
        changes.push({ field: 'priority', oldValue: prev?.priority, newValue: body.priority });
      }
      if (body.dueDate !== undefined) {
        data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
        changes.push({ field: 'dueDate', oldValue: prev?.dueDate, newValue: body.dueDate || null });
      }
      if (body.assigneeId !== undefined) {
        data.assigneeId = body.assigneeId || null;
        changes.push({ field: 'assigneeId', oldValue: prev?.assigneeId, newValue: body.assigneeId || null });
      }
      if (body.status !== undefined) {
        // Prevent invalid transition: In Progress -> To do
        if (prev?.status === 'inprogress' && body.status === 'todo') {
          return NextResponse.json({ error: 'Invalid status transition: cannot revert In Progress to To Do' }, { status: 400 });
        }
        changes.push({ field: 'status', oldValue: prev?.status, newValue: body.status });
      }

      const updatedTask = await prisma.task.update({ 
        where: { id: taskId }, 
        data, 
        include: { 
          createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          assignee: { select: { id: true, firstName: true, lastName: true, email: true } } 
        } 
      });

      // Audit log
      if (changes.length > 0) {
        await logTaskEvent({
          userId: userId,
          action: 'TASK_UPDATED',
          taskId: taskId,
          changes,
          ipAddress: getIpAddress(request as any),
        });
      }

      return NextResponse.json({ task: updatedTask });
    }

    // If user is the assignee, allow status changes only
    if (task.assigneeId === userId) {
      if (body.status === undefined) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const oldStatus = prev?.status;

      // Server-side guard: Prevent In Progress -> To Do transition by assignee
      if (oldStatus === 'inprogress' && body.status === 'todo') {
        return NextResponse.json({ error: 'Invalid status transition: cannot revert In Progress to To Do' }, { status: 400 });
      }

      const updatedTask = await prisma.task.update({ 
        where: { id: taskId }, 
        data: { status: body.status }, 
        include: { 
          createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          assignee: { select: { id: true, firstName: true, lastName: true, email: true } } 
        } 
      });

      // Audit log for status change
      if (oldStatus !== body.status) {
        await logTaskEvent({
          userId: userId,
          action: 'TASK_UPDATED',
          taskId: taskId,
          changes: [{ field: 'status', oldValue: oldStatus, newValue: body.status }],
          ipAddress: getIpAddress(request as any),
        });
      }

      return NextResponse.json({ task: updatedTask });
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } catch (error) {
    console.error("Update task error:", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const taskId = id;
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!taskId) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

    // Check if user is authorized to delete this task (only creator can delete)
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { createdById: true }
    });

    if (!task) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (task.createdById !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Delete related records first (cascade delete)
    try {
      await prisma.comment.deleteMany({ where: { taskId } });
    } catch (e) {
      console.warn("Could not delete comments:", e);
    }
    
    try {
      await prisma.attachment.deleteMany({ where: { taskId } });
    } catch (e) {
      console.warn("Could not delete attachments:", e);
    }
    
    // Then delete the task
    const result = await prisma.task.delete({ where: { id: taskId } });

    // Audit log
    await logTaskEvent({
      userId: userId,
      action: 'TASK_DELETED',
      taskId: taskId,
      changes: [],
      ipAddress: getIpAddress(request as any),
    });
    
    return NextResponse.json({ success: true, task: result });
  } catch (error: any) {
    console.error("Delete task error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete task" },
      { status: 500 }
    );
  }
}