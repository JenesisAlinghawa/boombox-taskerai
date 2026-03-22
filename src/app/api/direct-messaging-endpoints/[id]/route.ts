import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createNotification } from '@/lib/notificationService'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = new URL(req.url).searchParams.get('userId')
    const otherUserId = id

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
          select: { id: true, firstName: true, lastName: true, email: true, profilePicture: true },
        },
        parentMessage: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            sender: {
              select: { id: true, firstName: true, lastName: true, profilePicture: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
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

    await createNotification({
      receiverId: recipientId,
      type: 'direct_message',
      data: {
        title: `New message from ${sender?.firstName} ${sender?.lastName}`,
        message: content,
        senderId,
      },
    });

    return NextResponse.json({ success: true, message })
  } catch (error: any) {
    console.error('Send DM error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const messageId = parseInt(id)
    const userId = req.headers.get('x-user-id')

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID required' }, { status: 400 })
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 })
    }

    const { content } = await req.json()

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Content required' }, { status: 400 })
    }

    // Verify user owns the message
    const message = await prisma.directMessage.findUnique({
      where: { id: messageId },
    })

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    if (message.senderId !== userId) {
      return NextResponse.json({ error: 'Unauthorized to edit this message' }, { status: 403 })
    }

    const updatedMessage = await prisma.directMessage.update({
      where: { id: messageId },
      data: { content },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    })

    return NextResponse.json({ success: true, message: updatedMessage })
  } catch (error: any) {
    console.error('Patch DM error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const messageId = parseInt(id)

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID required' }, { status: 400 })
    }

    await prisma.directMessage.delete({
      where: { id: messageId },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete DM error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
