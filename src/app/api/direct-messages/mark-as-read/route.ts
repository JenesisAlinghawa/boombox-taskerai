import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { senderId } = await req.json()

    if (!senderId) {
      return NextResponse.json(
        { error: 'Sender ID required' },
        { status: 400 }
      )
    }

    // Mark all unread messages from senderId as read for current user
    const result = await prisma.directMessage.updateMany({
      where: {
        senderId: senderId,
        recipientId: user.id,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    })

    return NextResponse.json({ updated: result.count })
  } catch (error: any) {
    console.error('Mark as read error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
