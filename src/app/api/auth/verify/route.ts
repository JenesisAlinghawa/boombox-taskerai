import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { sendEvent } from '@/lib/sse'
import { createNotification } from '@/lib/notificationService'

const prisma = new PrismaClient()
const secret = process.env.JWT_SECRET || 'your-secret-key'

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token is required' },
        { status: 400 }
      )
    }

    // Verify the token
    let decoded: any
    try {
      decoded = jwt.verify(token, secret)
    } catch (e) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired verification token' },
        { status: 400 }
      )
    }

    // Get user by ID from token
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    // Mark user as verified
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true },
    })

    // Create welcome notification (respects preferences)
    try {
      await createNotification({
        receiverId: updatedUser.id,
        type: 'welcome',
        data: {
          title: 'Welcome to TaskerAI',
          message: 'Welcome to TaskerAI — your email has been successfully verified!',
        },
      });
    } catch (e) {
      console.error('Failed to create welcome notification:', e)
    }

    // Return user data without password
    const { password: _, ...userWithoutPassword } = updatedUser
    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      user: userWithoutPassword,
    })
  } catch (error: any) {
    console.error('Verification error:', error)
    return NextResponse.json(
      { success: false, message: 'An error occurred during verification' },
      { status: 500 }
    )
  }
}
