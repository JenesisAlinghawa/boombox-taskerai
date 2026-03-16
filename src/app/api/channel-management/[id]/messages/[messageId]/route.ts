import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const { id, messageId } = await params
    const msgId = parseInt(messageId)
    const userId = req.headers.get('x-user-id')

    if (!msgId) {
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
    const message = await prisma.message.findUnique({
      where: { id: msgId },
    })

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    if (message.senderId !== userId) {
      return NextResponse.json({ error: 'Unauthorized to edit this message' }, { status: 403 })
    }

    const updatedMessage = await prisma.message.update({
      where: { id: msgId },
      data: { content },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, profilePicture: true }
        }
      }
    })

    return NextResponse.json({ message: updatedMessage })
  } catch (error: any) {
    console.error('Patch message error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const { id, messageId } = await params
    const msgId = parseInt(messageId)

    if (!msgId) {
      return NextResponse.json({ error: 'Message ID required' }, { status: 400 })
    }

    await prisma.message.update({
      where: { id: msgId },
      data: { isDeleted: true },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete message error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
