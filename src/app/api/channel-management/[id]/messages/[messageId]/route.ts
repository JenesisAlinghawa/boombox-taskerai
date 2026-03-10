import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

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
