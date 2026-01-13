import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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
    const taskId = Number(id);
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        comments: { include: { user: { select: { id: true, name: true } } } },
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
    const taskId = Number(id);
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

    if (task.createdById !== userId && task.assigneeId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const data: any = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.priority !== undefined) data.priority = body.priority;
    if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.assigneeId !== undefined) data.assigneeId = body.assigneeId || null;
    if (body.status !== undefined) data.status = body.status;

    const updatedTask = await prisma.task.update({ 
      where: { id: taskId }, 
      data, 
      include: { 
        createdBy: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } } 
      } 
    });
    return NextResponse.json({ task: updatedTask });
  } catch (error) {
    console.error("Update task error:", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const taskId = Number(id);
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!taskId || isNaN(taskId)) {
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
    
    return NextResponse.json({ success: true, task: result });
  } catch (error: any) {
    console.error("Delete task error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete task" },
      { status: 500 }
    );
  }
}