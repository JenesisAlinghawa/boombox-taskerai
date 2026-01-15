import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const userId = parseInt(url.searchParams.get('userId') || '0')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
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
