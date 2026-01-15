import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const userId = parseInt(url.searchParams.get('userId') || '0')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // First try to get user's own team (where they're the owner)
    let team = await prisma.team.findFirst({
      where: { ownerId: userId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    })

    // If not a team owner, check if they're a member of any team
    if (!team) {
      const memberRecord = await prisma.teamMember.findFirst({
        where: { userId },
        include: {
          team: {
            include: {
              members: {
                include: {
                  user: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                  },
                },
              },
            },
          },
        },
      })

      if (memberRecord) {
        team = memberRecord.team
      }
    }

    // Extract team members (exclude the current user)
    const teamMembers = team?.members?.map((m) => m.user).filter((u) => u.id !== userId) || []

    // Get unread count for each user
    const usersWithUnread = await Promise.all(
      teamMembers.map(async (user) => {
        const unreadCount = await prisma.directMessage.count({
          where: {
            senderId: user.id,
            recipientId: userId,
            isRead: false,
          },
        })
        return { ...user, unreadCount }
      })
    )

    return NextResponse.json({ users: usersWithUnread })
  } catch (error: any) {
    console.error('Get DM users error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
