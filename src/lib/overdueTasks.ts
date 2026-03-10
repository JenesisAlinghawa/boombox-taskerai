import prisma from '@/lib/prisma';
import { createNotification } from '@/lib/notificationService';

/**
 * Automatically updates tasks to "stuck" status if they are overdue
 * (have a dueDate in the past and are not completed)
 * Also sends notifications to assignees about overdue tasks
 */
export async function updateOverdueTasks(taskIds?: string[], sendNotifications: boolean = true) {
  try {
    const now = new Date();

    // Build the query condition
    const whereCondition: any = {
      AND: [
        {
          OR: [
            { status: 'todo' },
            { status: 'inprogress' }
          ]
        },
        {
          dueDate: {
            lt: now // Due date is before now
          }
        }
      ]
    };

    // If specific task IDs provided, filter to those
    if (taskIds && taskIds.length > 0) {
      whereCondition.id = { in: taskIds };
    }

    // First, fetch tasks that will be updated (to get assignee info for notifications)
    if (sendNotifications) {
      const overdueTasks = await prisma.task.findMany({
        where: whereCondition,
        select: { id: true, title: true, assigneeId: true }
      });

      // Send notifications for tasks that have assignees
      for (const task of overdueTasks) {
        if (task.assigneeId) {
          await createNotification({
            receiverId: task.assigneeId,
            type: 'task_overdue',
            data: {
              title: 'Task Overdue',
              message: `Your task "${task.title}" is now overdue.`,
              relatedId: task.id,
              relatedType: 'task'
            }
          });
        }
      }
    }

    // Update all overdue, non-completed tasks to "stuck" status
    const updated = await prisma.task.updateMany({
      where: whereCondition,
      data: {
        status: 'stuck'
      }
    });

    return updated;
  } catch (error) {
    console.error('Error updating overdue tasks:', error);
    return { count: 0 };
  }
}

/**
 * Checks if a task is approaching its deadline (within 24 hours and not already notified)
 */
export function isTaskDeadlineApproaching(task: {
  dueDate: Date | null;
  status: string;
  createdAt: Date;
}): boolean {
  if (!task.dueDate || task.status === 'completed') {
    return false;
  }

  const now = new Date();
  const dueDate = new Date(task.dueDate);
  const hoursUntilDeadline = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  // True if deadline is within 24 hours AND not yet overdue
  return hoursUntilDeadline > 0 && hoursUntilDeadline <= 24;
}

/**
 * Sends notifications for tasks approaching their deadline (within 24 hours)
 * Only sends notifications if the task hasn't already triggered one
 */
export async function notifyApproachingDeadlines(taskIds?: string[]) {
  try {
    const now = new Date();
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Build query for tasks with deadline approaching
    const whereCondition: any = {
      AND: [
        {
          OR: [
            { status: 'todo' },
            { status: 'inprogress' }
          ]
        },
        {
          dueDate: {
            gt: now,
            lte: oneDayFromNow
          }
        },
        {
          assigneeId: {
            not: null
          }
        }
      ]
    };

    if (taskIds && taskIds.length > 0) {
      whereCondition.id = { in: taskIds };
    }

    const approachingTasks = await prisma.task.findMany({
      where: whereCondition,
      select: {
        id: true,
        title: true,
        dueDate: true,
        assigneeId: true,
        createdAt: true
      }
    });

    // Send notifications for each task
    for (const task of approachingTasks) {
      if (task.assigneeId && task.dueDate) {
        const dueDate = new Date(task.dueDate);
        const timeLeft = dueDate.getTime() - now.getTime();
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

        let timeString = '';
        if (hours > 0) {
          timeString = `in ${hours} hour${hours !== 1 ? 's' : ''}`;
        } else if (minutes > 0) {
          timeString = `in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
        } else {
          timeString = 'very soon';
        }

        await createNotification({
          receiverId: task.assigneeId,
          type: 'task_deadline_approaching',
          data: {
            title: 'Task Deadline Approaching',
            message: `Your task "${task.title}" is due ${timeString}.`,
            relatedId: task.id,
            relatedType: 'task'
          }
        });
      }
    }

    return approachingTasks.length;
  } catch (error) {
    console.error('Error notifying approaching deadlines:', error);
    return 0;
  }
}

/**
 * Sends a notification when a task is assigned to a user
 */
export async function notifyTaskAssignment(taskId: string, assigneeId: number, taskTitle: string) {
  try {
    await createNotification({
      receiverId: assigneeId,
      type: 'task_assigned',
      data: {
        title: 'Task Assigned to You',
        message: `You have been assigned a new task: "${taskTitle}"`,
        relatedId: taskId,
        relatedType: 'task'
      }
    });
  } catch (error) {
    console.error('Error notifying task assignment:', error);
  }
}
