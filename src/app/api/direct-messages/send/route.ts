import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { sendEvent } from '@/lib/sse'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { recipientId, content } = await req.json()

    if (!recipientId || !content) {
      return NextResponse.json(
        { error: 'Recipient ID and content required' },
        { status: 400 }
      )
    }

    // Verify recipient exists and is active
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId }
    })

    if (!recipient) {
      return NextResponse.json(
        { error: 'Recipient not found' },
        { status: 404 }
      )
    }

    const message = await prisma.directMessage.create({
      data: {
        senderId: user.id,
        recipientId,
        content,
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, profilePicture: true },
        },
      },
    })

    // Push SSE event to recipient for real-time delivery
    try {
      sendEvent(recipientId, 'direct_message', { message })
    } catch (e) {
      console.error('SSE push error:', e)
    }

    return NextResponse.json({ success: true, message }, { status: 201 })
  } catch (error: any) {
    console.error('Send DM error:', error.message || error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message || error.toString()
      }, 
      { status: 500 }
    )
  }
}
