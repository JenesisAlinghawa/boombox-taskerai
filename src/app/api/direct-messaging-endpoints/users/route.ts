import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const userId = url.searchParams.get('userId')

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
    let teamMembers = team?.members?.map((m) => m.user).filter((u) => u.id !== userId) || []

    // If no team members, get all users who have sent unread messages to this user
    if (teamMembers.length === 0) {
      const sendersWithUnread = await prisma.directMessage.findMany({
        where: {
          recipientId: userId,
          isRead: false,
          senderId: { not: userId }, // Exclude the current user
        },
        distinct: ['senderId'],
        select: {
          senderId: true,
        },
      })

      const senderIds = [...new Set(sendersWithUnread.map(m => m.senderId))]
      
      if (senderIds.length > 0) {
        const senders = await prisma.user.findMany({
          where: { id: { in: senderIds } },
          select: { id: true, firstName: true, lastName: true, email: true },
        })
        teamMembers = senders
      }
    }

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
