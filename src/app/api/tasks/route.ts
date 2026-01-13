import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// Helper to extract user from cookies or headers
function getUserIdFromRequest(request: NextRequest): number | null {
  const userHeader = request.headers.get('x-user-id');
  if (userHeader) {
    return parseInt(userHeader, 10);
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tasks where user is either the creator or assignee
    const tasks = await prisma.task.findMany({
      where: {
        OR: [
          { createdById: userId },
          { assigneeId: userId }
        ]
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        assignee: {
          select: { id: true, name: true, email: true }
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
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, description, priority, dueDate, assigneeId, status } = await request.json();
    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });

    const task = await prisma.task.create({
      data: {
        title,
        description: description || null,
        status: status || 'todo',
        priority: priority || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        assigneeId: assigneeId || null,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        assignee: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
