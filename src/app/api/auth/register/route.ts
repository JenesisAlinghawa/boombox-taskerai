import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { sendEmail } from '@/lib/mailjet'

const secret = process.env.JWT_SECRET || 'your-secret-key'

export async function POST(request: NextRequest) {
  try {
    const { email, password, firstName, lastName } = await request.json()

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Email, firstName, lastName, and password required' },
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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create JWT token with registration data (NOT creating user in DB yet)
    // Token will be valid for 24 hours
    const registrationToken = jwt.sign({
      email: normalizedEmail,
      password: hashedPassword,
      firstName,
      lastName,
    }, secret, { expiresIn: '24h' })

    // Send verification email with link
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
      const verificationLink = `${baseUrl}/auth/verify?token=${encodeURIComponent(registrationToken)}`
      const html = `<p>Hi ${firstName || ''},</p><p>Welcome to TaskerAI! Click the link below to verify your email address and create your account.</p><p><a href="${verificationLink}">Verify Email & Create Account</a></p><p>This link expires in 24 hours.</p>`
      await sendEmail(normalizedEmail, 'Verify your TaskerAI account', html)
    } catch (e) {
      console.warn('Failed to send verification email', e)
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Please check your email to verify your account and complete registration.',
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
