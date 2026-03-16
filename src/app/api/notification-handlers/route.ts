import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createNotification } from '@/lib/notificationService'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const userId = url.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // check user preferences
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { messageNotifications: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.messageNotifications) {
      // user has disabled in‑app notifications; return empty list
      return NextResponse.json({ notifications: [] })
    }

    const notifications = await prisma.notification.findMany({
      where: { receiverId: userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // Transform notifications to include title and message from data
    const transformedNotifications = notifications.map((notif: any) => ({
      id: notif.id,
      userId: notif.receiverId,
      type: notif.type,
      title: (notif.data as any)?.title || 'Notification',
      message: (notif.data as any)?.message || '',
      relatedId: (notif.data as any)?.relatedId,
      relatedType: (notif.data as any)?.relatedType,
      isRead: notif.read,
      createdAt: notif.createdAt,
    }))

    return NextResponse.json({ notifications: transformedNotifications })
  } catch (error: any) {
    console.error('Get notifications error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { sendEvent } from '@/lib/sse'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { receiverId, type, data } = body;

    if (!receiverId || !type) {
      return NextResponse.json({ error: 'receiverId and type required' }, { status: 400 })
    }

    const notif = await createNotification({
      receiverId: receiverId,
      type,
      data: data || {},
    });

    return NextResponse.json({ notification: notif })
  } catch (error: any) {
    console.error('Create notification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { notificationId } = await req.json()

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 })
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Mark notification read error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
