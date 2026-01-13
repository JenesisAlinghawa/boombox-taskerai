import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const notificationId = parseInt(id)
    const { isRead } = await req.json()

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 })
    }

    const notification = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: isRead ?? true },
    })

    return NextResponse.json({ notification })
  } catch (error: any) {
    console.error('Update notification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const notificationId = parseInt(id)

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 })
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete notification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
