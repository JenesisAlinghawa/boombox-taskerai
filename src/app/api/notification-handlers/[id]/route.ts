import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const notificationId = parseInt(id)

    if (!notificationId || isNaN(notificationId)) {
      return NextResponse.json({ error: 'Valid Notification ID required' }, { status: 400 })
    }

    let body = { isRead: true };
    try {
      body = await req.json();
    } catch (parseError) {
      console.warn('PATCH body parse error, using defaults:', parseError)
    }

    const { isRead } = body;

    const notification = await prisma.notification.update({
      where: { id: notificationId },
      data: { read: isRead ?? true },
    })

    return NextResponse.json({ notification })
  } catch (error: any) {
    console.error('Update notification error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const notificationId = parseInt(id)

    if (!notificationId || isNaN(notificationId)) {
      return NextResponse.json({ error: 'Valid Notification ID required' }, { status: 400 })
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete notification error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
