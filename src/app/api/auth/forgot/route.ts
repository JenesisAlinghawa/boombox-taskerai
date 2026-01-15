import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { sendEmail } from '@/lib/mailjet'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    console.log('Forgot password request for:', email)
    
    if (!email) {
      console.warn('❌ No email provided')
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase()
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (!user) {
      console.warn('⚠️  User not found:', email)
      // Do not reveal whether email exists
      return NextResponse.json({ success: true })
    }

    console.log('✓ User found:', user.email)
    const secret = process.env.JWT_SECRET || 'change-me'
    const token = jwt.sign({ id: user.id }, secret, { expiresIn: '1h' })
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const resetLink = `${baseUrl}/auth/reset?token=${encodeURIComponent(token)}`

    const html = `<p>Hi ${user.firstName || ''},</p><p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="${resetLink}">Reset password</a></p>`

    try {
      console.log('📧 Attempting to send reset email to:', user.email)
      await sendEmail(user.email, 'Reset your TaskerAI password', html)
      console.log('✓ Reset email sent successfully')
    } catch (e) {
      console.error('❌ Failed to send reset email:', e)
      // Still return success even if email fails
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
