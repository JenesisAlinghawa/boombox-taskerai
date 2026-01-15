import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, canAssignTask } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tasks where user is either the creator or assignee
    const tasks = await prisma.task.findMany({
      where: {
        OR: [
          { createdById: user.id },
          { assigneeId: user.id }
        ]
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        assignee: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('Get tasks error:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, description, priority, dueDate, assigneeId, status } = await request.json();
    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });

    // Task creation rules:
    // EMPLOYEE: Can only assign to themselves
    // Higher roles: Can assign to anyone
    const finalAssigneeId = assigneeId || null;

    if (finalAssigneeId) {
      if (!canAssignTask(user.role, finalAssigneeId, user.id)) {
        return NextResponse.json({
          error: 'EMPLOYEE role can only assign tasks to themselves',
          status: 403
        }, { status: 403 });
      }

      // Verify assignee exists
      const assignee = await prisma.user.findUnique({
        where: { id: finalAssigneeId }
      });

      if (!assignee) {
        return NextResponse.json({ error: 'Assignee not found' }, { status: 404 });
      }
    }

    const task = await prisma.task.create({
      data: {
        title,
        description: description || null,
        status: status || 'todo',
        priority: priority || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        assigneeId: finalAssigneeId,
        createdById: user.id,
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        assignee: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });

    // Create log entry
    await prisma.log.create({
      data: {
        userId: user.id,
        action: 'Task Created',
        data: {
          taskId: task.id,
          title: task.title,
          assigneeId: finalAssigneeId
        }
      }
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId, ...updateData } = await request.json();
    if (!taskId) return NextResponse.json({ error: 'Task ID required' }, { status: 400 });

    // Find the task
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Only creator or MANAGER+ can update task
    if (task.createdById !== user.id && !['MANAGER', 'CO_OWNER', 'OWNER'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized to update this task' }, { status: 403 });
    }

    // If updating assignee, enforce role-based rules
    if (updateData.assigneeId) {
      if (!canAssignTask(user.role, updateData.assigneeId, user.id)) {
        return NextResponse.json({
          error: 'EMPLOYEE role can only assign tasks to themselves',
          status: 403
        }, { status: 403 });
      }

      const assignee = await prisma.user.findUnique({
        where: { id: updateData.assigneeId }
      });

      if (!assignee) {
        return NextResponse.json({ error: 'Assignee not found' }, { status: 404 });
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        assignee: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });

    // Create log entry for status changes
    if (updateData.status) {
      await prisma.log.create({
        data: {
          taskId,
          userId: user.id,
          action: 'Status Updated',
          data: {
            oldStatus: task.status,
            newStatus: updateData.status
          }
        }
      });
    }

    return NextResponse.json({ task: updatedTask });
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}
