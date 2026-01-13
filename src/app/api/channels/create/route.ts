import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { name, description, userIds } = await req.json()

    if (!name) {
      return NextResponse.json({ error: 'Channel name required' }, { status: 400 })
    }

    const channel = await prisma.channel.create({
      data: {
        name,
        description,
        members: {
          create: (userIds || []).map((userId: number) => ({
            userId,
          })),
        },
      },
      include: { members: true },
    })

    return NextResponse.json({ success: true, channel })
  } catch (error: any) {
    console.error('Create channel error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
