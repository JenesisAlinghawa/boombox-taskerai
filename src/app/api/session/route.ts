import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

function getUserIdFromRequest(request: NextRequest): number | null {
  const userHeader = request.headers.get('x-user-id')
  if (userHeader) {
    return parseInt(userHeader, 10)
  }
  return null
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user session data including role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, email: true, isVerified: true, role: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Get session error:', error)
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 })
  }
}
