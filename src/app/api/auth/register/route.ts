import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { sendEmail } from '@/lib/mailjet'

const secret = process.env.JWT_SECRET || 'your-secret-key'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, name, and password required' },
        { status: 400 }
      )
    }

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase()

    // Validate password strength server-side
    const rules = [
      { test: (p: string) => p.length >= 8, label: 'At least 8 characters' },
      { test: (p: string) => /[A-Z]/.test(p), label: 'One uppercase letter' },
      { test: (p: string) => /[a-z]/.test(p), label: 'One lowercase letter' },
      { test: (p: string) => /[0-9]/.test(p), label: 'One number' },
      { test: (p: string) => /[!@#$%^&*(),.?"{}|<>]/.test(p), label: 'One special character' },
    ];

    const failed = rules.filter(r => !r.test(password)).map(r => r.label)
    if (failed.length) {
      return NextResponse.json(
        { error: `Password does not meet requirements: ${failed.join(', ')}` },
        { status: 400 }
      )
    }

    // Check if user already exists by email
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      )
    }

    // Check if name already exists
    const existingName = await prisma.user.findFirst({
      where: { name: name },
    })

    if (existingName) {
      return NextResponse.json(
        { error: 'Name already taken' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user with default EMPLOYEE role
    // EMPLOYEE role means:
    // - Cannot manage users or access team settings
    // - Can only participate in channels and view assigned tasks
    // - Can be promoted to TEAM_LEAD, MANAGER, or CO_OWNER by OWNER
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: name,
        role: "EMPLOYEE", // Default role for all new users
      },
    })

    const { password: _, ...userWithoutPassword } = user
    // Send verification email with link
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
      const verificationToken = jwt.sign({ id: user.id }, secret, { expiresIn: '24h' })
      const verificationLink = `${baseUrl}/auth/verify?token=${encodeURIComponent(verificationToken)}`
      const html = `<p>Hi ${user.name || ''},</p><p>Welcome to TaskerAI! Click the link below to verify your email address.</p><p><a href="${verificationLink}">Verify Email</a></p><p>This link expires in 24 hours.</p>`
      await sendEmail(user.email, 'Verify your TaskerAI account', html)
    } catch (e) {
      console.warn('Failed to send verification email', e)
    }

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
