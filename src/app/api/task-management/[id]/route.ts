import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logTaskEvent, getIpAddress } from "@/lib/auditLog";
import { updateOverdueTasks } from "@/lib/overdueTasks";

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

    // Ensure overdue tasks are updated
    await updateOverdueTasks([taskId]);

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true, profilePicture: true } },
        assignees: {
          include: {
            assignee: { select: { id: true, firstName: true, lastName: true, email: true, profilePicture: true } }
          }
        },
        comments: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true, profilePicture: true } } } },
        attachments: true,
      },
    });
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
    
    // Check if user is authorized to view this task
    const isCreator = task.createdBy?.id === userId;
    const isAssignee = task.assignees?.some((a) => a.assignee?.id === userId);
    
    if (!isCreator && !isAssignee) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    return NextResponse.json({ task });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    console.error("Get task error - DETAILED:", {
      message: errorMessage,
      stack: errorStack,
      name: error instanceof Error ? error.name : 'Unknown',
      error: String(error)
    });
    return NextResponse.json(
      { error: "Failed to fetch task", details: errorMessage },
      { status: 500 }
    );
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

    // Log the start of the operation
    console.log(`PATCH /api/task-management/${taskId} started for userId ${userId}`);

    // Get user role
    console.log('Fetching user role...');
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user) {
      console.error(`User not found in database: userId=${userId}`);
      return NextResponse.json(
        { error: 'Unauthorized', details: `User ${userId} not found` },
        { status: 401 }
      );
    }

    const userRole = user.role || 'EMPLOYEE';

    // Check if user is authorized to modify this task
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        createdById: true,
        status: true,
        assignees: { select: { assigneeId: true } }
      }
    });

    if (!task) {
      console.error(`Task not found: taskId=${taskId}`);
      return NextResponse.json(
        { error: "Not found", details: `Task ${taskId} not found` },
        { status: 404 }
      );
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {
      // No body or invalid JSON — treat as empty update
      const parseErrorMsg = e instanceof Error ? e.message : String(e);
      console.warn('PATCH request had no JSON body or failed to parse:', parseErrorMsg);
      body = {};
    }

    // Validate status if provided
    if (body.status !== undefined) {
      const validStatuses = ['todo', 'inprogress', 'stuck', 'done', 'completed'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: `Invalid status: ${body.status}. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Fetch previous values for change tracking
    const prev = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        title: true,
        description: true,
        priority: true,
        dueDate: true,
        status: true,
        createdBy: { select: { role: true, firstName: true, lastName: true } },
        assignees: { select: { assigneeId: true } }
      },
    });

    // Unified role-based permission check
    const isTaskCreator = task.createdById === userId;
    const isTaskAssignee = task.assignees?.some((a) => a.assigneeId === userId);
    const isAdminOrOwner = userRole === 'ADMIN' || userRole === 'OWNER';
    const taskCreatorRole = prev?.createdBy?.role || 'EMPLOYEE';
    
    // Only task creator or admin/owner can edit tasks
    if (!isTaskCreator && !isAdminOrOwner) {
      return NextResponse.json({ 
        error: 'Forbidden',
        warning: '⛔ Only the task creator or admins can edit this task.' 
      }, { status: 403 });
    }

    // Determine what changes are allowed based on role and relationship to task
    const data: any = {};
    const changes: any[] = [];
    let needsAssigneeUpdate = false;
    let newAssigneeIds: string[] = [];

    // Users can edit core fields if they are creator or admin/owner
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
    
    // Assignee changes - role-based validation
    if (body.assigneeIds !== undefined || body.assigneeId !== undefined) {
      // Support both assigneeIds (array) and legacy assigneeId (string)
      const incomingIds = body.assigneeIds ? (Array.isArray(body.assigneeIds) ? body.assigneeIds : [body.assigneeIds]) : (body.assigneeId ? [body.assigneeId] : []);
      
      // Permission check for changing assignees
      if (userRole === 'EMPLOYEE') {
        // EMPLOYEE can only assign tasks to themselves
        if (incomingIds.length !== 1 || incomingIds[0] !== userId) {
          return NextResponse.json({ 
            error: 'Forbidden',
            warning: '⛔ Employees can only assign tasks to themselves.' 
          }, { status: 403 });
        }
      } else if (userRole === 'ADMIN') {
        // ADMIN can only assign to ADMIN or EMPLOYEE (not OWNER)
        for (const assigneeId of incomingIds) {
          const assignee = await prisma.user.findUnique({
            where: { id: assigneeId },
            select: { role: true }
          });
          if (!assignee || !(assignee.role === 'ADMIN' || assignee.role === 'EMPLOYEE')) {
            return NextResponse.json({ 
              error: 'Forbidden',
              warning: `⛔ Admins can only assign tasks to Admin or Employee users.` 
            }, { status: 403 });
          }
        }
      }
      // OWNER can assign to anyone
      
      newAssigneeIds = incomingIds;
      needsAssigneeUpdate = true;
      
      const oldIds = prev?.assignees?.map((a) => a.assigneeId) || [];
      changes.push({ field: 'assigneeIds', oldValue: oldIds, newValue: incomingIds });
    }
    
    // Only assignees or admin/owner can change status
    if (body.status !== undefined) {
      if (!isTaskAssignee && !isAdminOrOwner) {
        return NextResponse.json({ 
          error: 'Forbidden',
          warning: '⛔ Only assigned users or admins can change task status.' 
        }, { status: 403 });
      }
      data.status = body.status;
      changes.push({ field: 'status', oldValue: prev?.status, newValue: body.status });
    }

    // If no changes to apply, return current task state
    if (Object.keys(data).length === 0 && !needsAssigneeUpdate) {
      const currentTask = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          assignees: {
            include: {
              assignee: { select: { id: true, firstName: true, lastName: true, email: true } }
            }
          },
          comments: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
          attachments: true,
        },
      });
      return NextResponse.json({ task: currentTask, isAdminOrOwner });
    }

    // Apply the update
    console.log(`Updating task ${taskId} with data:`, JSON.stringify(data));
    let updatedTask;
    try {
      // Handle assignees update separately if needed
      if (needsAssigneeUpdate) {
        // Delete old assignees
        await prisma.taskAssignee.deleteMany({
          where: { taskId: taskId }
        });

        // Create new assignees
        if (newAssigneeIds.length > 0) {
          await prisma.taskAssignee.createMany({
            data: newAssigneeIds.map((id) => ({
              taskId: taskId,
              assigneeId: id
            }))
          });
        }
      }

      // Update task fields
      updatedTask = await prisma.task.update({
        where: { id: taskId },
        data,
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          assignees: {
            include: {
              assignee: { select: { id: true, firstName: true, lastName: true, email: true } }
            }
          },
          comments: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
          attachments: true,
        },
      });
      console.log(`Task ${taskId} updated successfully`);
    } catch (updateError) {
      const updateErrorMsg = updateError instanceof Error ? updateError.message : String(updateError);
      console.error(`Failed to update task ${taskId}:`, updateErrorMsg, updateError);
      throw updateError;
    }

    // If status changed and autoComment is provided, add the system comment
    const statusChanged = body.status !== undefined && prev?.status !== body.status;
    if (statusChanged && body.autoComment) {
      console.log(`Creating auto-comment for task ${taskId}`);
      try {
        await prisma.comment.create({
          data: {
            taskId: taskId,
            userId: userId,
            content: body.autoComment,
          },
        });
        console.log(`Auto-comment created for task ${taskId}`);
        // Refresh task to include the new comment
        const finalTask = await prisma.task.findUnique({
          where: { id: taskId },
          include: {
            createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
            assignees: {
              include: {
                assignee: { select: { id: true, firstName: true, lastName: true, email: true } }
              }
            },
            comments: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
            attachments: true,
          },
        });
        if (finalTask) {
          // Audit log if there were changes
          if (changes.length > 0) {
            await logTaskEvent({
              userId: userId,
              action: 'TASK_UPDATED',
              taskId: taskId,
              changes,
              ipAddress: getIpAddress(request as any),
            });
          }
          return NextResponse.json({ task: finalTask, isAdminOrOwner });
        }
      } catch (commentError) {
        const commentErrorMsg = commentError instanceof Error ? commentError.message : String(commentError);
        console.error(`Failed to create auto-comment for task ${taskId}:`, commentErrorMsg, commentError);
        // Don't throw - comment creation failure shouldn't block status update, just return updated task
        return NextResponse.json({ task: updatedTask, isAdminOrOwner });
      }
    }

    // Audit log if there were changes
    if (changes.length > 0) {
      await logTaskEvent({
        userId: userId,
        action: 'TASK_UPDATED',
        taskId: taskId,
        changes,
        ipAddress: getIpAddress(request as any),
      });

      // Also log to activity log for the logs page
      try {
        await prisma.log.create({
          data: {
            userId: userId,
            taskId: taskId,
            action: `Updated task: ${changes.map((c) => c.field).join(', ')}`,
            data: {
              changes,
              taskTitle: updatedTask.title,
            },
          },
        });
      } catch (logError) {
        console.error('Failed to create activity log:', logError);
      }
    }

    return NextResponse.json({ task: updatedTask, isAdminOrOwner });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    console.error("Update task error - DETAILED:", {
      message: errorMessage,
      stack: errorStack,
      name: error instanceof Error ? error.name : 'Unknown',
      error: String(error)
    });
    return NextResponse.json(
      { error: "Failed to update task", details: errorMessage },
      { status: 500 }
    );
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

    // Get user role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is authorized to delete this task
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { 
        createdById: true,
        createdBy: { select: { firstName: true, lastName: true } }
      }
    });

    if (!task) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Only task creator can delete, or ADMIN/OWNER can delete any task
    const isTaskCreator = task.createdById === userId;
    const isAdmin = user.role === 'ADMIN' || user.role === 'OWNER';
    
    if (!isTaskCreator && !isAdmin) {
      const creatorName = task.createdBy?.firstName 
        ? `${task.createdBy.firstName}${task.createdBy.lastName ? ' ' + task.createdBy.lastName : ''}`
        : 'the task creator';
      return NextResponse.json({ 
        error: 'Forbidden',
        warning: `⛔ Only ${creatorName} or an administrator can delete this task.` 
      }, { status: 403 });
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

    try {
      await prisma.taskAssignee.deleteMany({ where: { taskId } });
    } catch (e) {
      console.warn("Could not delete task assignees:", e);
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

    // Also log to activity log for the logs page
    try {
      await prisma.log.create({
        data: {
          userId: userId,
          taskId: taskId,
          action: 'Deleted task',
          data: {
            taskTitle: result.title,
          },
        },
      });
    } catch (logError) {
      console.error('Failed to create activity log:', logError);
    }
    
    return NextResponse.json({ success: true, task: result });
  } catch (error: any) {
    console.error("Delete task error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete task" },
      { status: 500 }
    );
  }
}