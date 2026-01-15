import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sendEvent } from '@/lib/sse'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const channelId = parseInt(id)

    const messages = await prisma.message.findMany({
      where: { channelId },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      select: { name: true },
    })

    return NextResponse.json({
      messages,
      channelName: channel?.name,
    })
  } catch (error: any) {
    console.error('Get channel messages error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { channelId, content, userId } = await req.json()

    if (!channelId || !content || !userId) {
      return NextResponse.json(
        { error: 'Channel ID, content, and user ID required' },
        { status: 400 }
      )
    }

    const message = await prisma.message.create({
      data: {
        channelId,
        senderId: userId,
        content,
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    })

    // Create notification for channel members
    const channelMembers = await prisma.channelMember.findMany({
      where: {
        channelId,
        userId: { not: userId },
      },
      select: { userId: true },
    })

    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      select: { name: true },
    })

    for (const member of channelMembers) {
      await prisma.notification.create({
        data: {
          receiverId: member.userId,
          type: 'channel_message',
          data: {
            title: `New message in #${channel?.name}`,
            message: content,
            channelId,
          },
        },
      })
      try {
        sendEvent(member.userId, 'notification', {
          type: 'channel_message',
          title: `New message in #${channel?.name}`,
          message: content,
          relatedId: channelId,
        })
      } catch (e) {
        console.error('SSE push error:', e)
      }
    }

    return NextResponse.json({ success: true, message })
  } catch (error: any) {
    console.error('Post message error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
