import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, canAssignTask, canAssignRoleHierarchy } from '@/lib/auth'
import { updateOverdueTasks, notifyTaskAssignment, notifyApproachingDeadlines } from '@/lib/overdueTasks'

const db = prisma as any; // Type assertion - use db.user instead of db.employee

// Helper for auth
function getUserIdFromRequest(request: NextRequest): string | null {
  return request.headers.get('x-user-id');
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      console.error('[Task API] Authentication failed - user not found or header missing');
      const userId = request.headers.get('x-user-id');
      console.error('[Task API] x-user-id header value:', userId);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Automatically update overdue tasks first
    await updateOverdueTasks();

    // Check for approaching deadlines and send notifications
    await notifyApproachingDeadlines();

    // Build query filter based on role
    let taskFilter: any = {};
    
    if (user.role === "ADMIN" || user.role === "OWNER") {
      // Admins and Owners see all tasks
      taskFilter = {};
    } else {
      // Employees only see tasks they created or are assigned to
      taskFilter = {
        OR: [
          { createdById: user.id },
          { assignees: { some: { assigneeId: user.id } } },
        ],
      };
    }

    // Get tasks with role-based filtering
    const tasks = await db.task.findMany({
      where: taskFilter,
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true, profilePicture: true }
        },
        assignees: {
          include: {
            assignee: {
              select: { id: true, firstName: true, lastName: true, email: true, profilePicture: true }
            }
          }
        },
        _count: {
          select: { comments: true, attachments: true }
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

    const { title, description, priority, dueDate, assigneeIds, status } = await request.json();
    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });

    // Validate deadline is required and not in the past
    if (!dueDate) {
      return NextResponse.json({ error: 'Due date is required' }, { status: 400 });
    }
    
    const dueDateObj = new Date(dueDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    dueDateObj.setHours(0, 0, 0, 0);
    
    if (dueDateObj < now) {
      return NextResponse.json({ error: 'Due date cannot be in the past' }, { status: 400 });
    }

    // Support both assigneeIds (array) and legacy assigneeId (string)
    const assigneeIdList = Array.isArray(assigneeIds) ? assigneeIds : (assigneeIds ? [assigneeIds] : []);

    // Validate at least one assignee is required
    if (assigneeIdList.length === 0) {
      return NextResponse.json({ error: 'At least one assignee is required' }, { status: 400 });
    }

    // Validate and verify assignees exist and check role-based permissions
    for (const assigneeId of assigneeIdList) {
      if (!(await canAssignTask(user.role, assigneeId, user.id))) {
        return NextResponse.json({
          error: '⛔ Employees can only assign tasks to themselves',
          status: 403
        }, { status: 403 });
      }

      // Verify assignee exists
      const assignee = await db.user.findUnique({
        where: { id: assigneeId }
      });

      if (!assignee) {
        return NextResponse.json({ error: `Assignee ${assigneeId} not found` }, { status: 404 });
      }

      // Check role hierarchy - users can only assign to same level or lower
      if (!canAssignRoleHierarchy(user.role, assignee.role)) {
        const roleMsg = user.role === 'ADMIN' 
          ? 'Admins can only assign to Admin or Employee users'
          : 'You do not have permission to assign to this role';
        return NextResponse.json({
          error: `⛔ ${roleMsg}`,
          status: 403
        }, { status: 403 });
      }
    }

    const task = await db.task.create({
      data: {
        title,
        description: description || null,
        status: status || 'todo',
        priority: priority || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        createdById: user.id,
        ...(assigneeIdList.length > 0 && {
          assignees: {
            create: assigneeIdList.map((assigneeId) => ({
              assigneeId,
            })),
          },
        }),
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        assignees: {
          include: {
            assignee: {
              select: { id: true, firstName: true, lastName: true, email: true }
            }
          }
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
          assigneeIds: assigneeIdList
        }
      }
    });

    // Send notifications to all assignees
    if (assigneeIdList.length > 0) {
      for (const assigneeId of assigneeIdList) {
        await notifyTaskAssignment(task.id, assigneeId, task.title);
      }

      // Also check if this task's deadline is approaching
      if (dueDate) {
        await notifyApproachingDeadlines([task.id]);
      }
    }

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
    const task = await db.task.findUnique({
      where: { id: taskId },
      include: {
        assignees: { select: { assigneeId: true } }
      }
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check permissions: user must be creator or assignee
    const isCreator = task.createdById === user.id;
    const isAssignee = task.assignees?.some((a: { assigneeId: string }) => a.assigneeId === user.id);

    if (!isCreator && !isAssignee) {
      return NextResponse.json({ 
        error: 'Unauthorized to update this task',
        warning: 'You can only edit tasks you created or are assigned to.' 
      }, { status: 403 });
    }

    // Only creator can change assignees
    if (updateData.assigneeId && !isCreator) {
      return NextResponse.json({
        error: 'Only the task creator can change assignees',
        warning: 'Only the task creator can change assignees.'
      }, { status: 403 });
    }

    // If updating assignee, enforce role-based rules
    if (updateData.assigneeId) {
      if (!(await canAssignTask(user.role, updateData.assigneeId, user.id))) {
        return NextResponse.json({
          error: 'EMPLOYEE role can only assign tasks to themselves'
        }, { status: 403 });
      }

      const assignee = await db.user.findUnique({
        where: { id: updateData.assigneeId }
      });

      if (!assignee) {
        return NextResponse.json({ error: 'Assignee not found' }, { status: 404 });
      }

      // Check role hierarchy - users can only assign to same level or lower
      if (!canAssignRoleHierarchy(user.role, assignee.role)) {
        return NextResponse.json({
          error: `Users with ${user.role} role can only assign to users with ${user.role} role or lower`
        }, { status: 403 });
      }
    }

    // If due date is being changed, reset the deadline notification so user gets notified again
    if (updateData.dueDate) {
      updateData.deadlineNotificationSentAt = null;
    }

    const updatedTask = await db.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        assignees: {
          include: {
            assignee: {
              select: { id: true, firstName: true, lastName: true, email: true }
            }
          }
        }
      }
    });

    // Create log entry for status changes
    if (updateData.status) {
      await db.log.create({
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

    // Send notifications for assignment changes
    if (updateData.assigneeId && updateData.assigneeId !== task.assigneeId) {
      // Notify the new assignee
      await notifyTaskAssignment(taskId, updateData.assigneeId, updatedTask.title);

      // Check if the task deadline is approaching
      if (updatedTask.dueDate) {
        await notifyApproachingDeadlines([taskId]);
      }
    }

    return NextResponse.json({ task: updatedTask });
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}
