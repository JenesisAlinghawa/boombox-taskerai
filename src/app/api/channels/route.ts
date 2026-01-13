import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const userId = parseInt(url.searchParams.get('userId') || '0')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const channels = await prisma.channel.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        members: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    return NextResponse.json({ channels })
  } catch (error: any) {
    console.error('Get channels error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
