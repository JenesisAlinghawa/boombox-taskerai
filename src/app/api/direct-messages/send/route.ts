import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sendEvent } from '@/lib/sse'

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

    // Push SSE event to recipient for real-time delivery
    try {
      sendEvent(recipientId, 'direct_message', { message })
    } catch (e) {
      console.error('SSE push error:', e)
    }

    return NextResponse.json({ success: true, message })
  } catch (error: any) {
    console.error('Send DM error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
