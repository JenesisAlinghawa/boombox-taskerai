import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = parseInt(new URL(req.url).searchParams.get('userId') || '0')
    const otherUserId = parseInt(id)

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: userId, recipientId: otherUserId },
          { senderId: otherUserId, recipientId: userId },
        ],
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Mark messages as read
    await prisma.directMessage.updateMany({
      where: {
        senderId: otherUserId,
        recipientId: userId,
        isRead: false,
      },
      data: { isRead: true },
    })

    const otherUser = await prisma.user.findUnique({
      where: { id: otherUserId },
      select: { firstName: true, lastName: true },
    })

    return NextResponse.json({
      messages,
      userName: `${otherUser?.firstName} ${otherUser?.lastName}`,
    })
  } catch (error: any) {
    console.error('Get DM messages error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { senderId, recipientId, content } = await req.json()

    if (!senderId || !recipientId || !content) {
      return NextResponse.json(
        { error: 'Sender ID, recipient ID, and content required' },
        { status: 400 }
      )
    }

    const message = await prisma.directMessage.create({
      data: {
        senderId,
        recipientId,
        content,
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    })

    // Create notification for recipient
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { firstName: true, lastName: true },
    })

    await prisma.notification.create({
      data: {
        receiverId: recipientId,
        type: 'direct_message',
        data: {
          title: `New message from ${sender?.firstName} ${sender?.lastName}`,
          message: content,
          senderId,
        },
      },
    })

    return NextResponse.json({ success: true, message })
  } catch (error: any) {
    console.error('Send DM error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
