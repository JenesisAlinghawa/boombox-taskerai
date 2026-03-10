import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { sendEmail } from '@/lib/email'
import { resolveMx, resolve } from 'dns/promises'

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

    // Validate email domain exists
    const domain = normalizedEmail.split('@')[1]
    if (!domain || !domain.includes('.')) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Check domain validity with DNS (non-blocking - just log if it fails)
    let isValidDomain = false
    try {
      console.log(`[Register] Validating domain: ${domain}`)
      const mxRecords = await resolveMx(domain)
      console.log(`[Register] MX Records for ${domain}:`, mxRecords)
      if (mxRecords && mxRecords.length > 0) {
        isValidDomain = true
        console.log(`[Register] Domain ${domain} has valid MX records`)
      }
    } catch (mxError) {
      console.log(`[Register] MX lookup failed for ${domain}, trying A records`)
      try {
        const aRecords = await resolve(domain, 'A')
        console.log(`[Register] A Records for ${domain}:`, aRecords)
        if (aRecords && aRecords.length > 0) {
          isValidDomain = true
          console.log(`[Register] Domain ${domain} has valid A records`)
        }
      } catch (aError) {
        console.log(`[Register] A record lookup also failed for ${domain}:`, aError)
        // Don't reject - allow registration even if DNS validation fails
        // Some valid domains may not resolve in all environments
        isValidDomain = true
        console.log(`[Register] Allowing registration anyway for ${domain}`)
      }
    }

    if (!isValidDomain) {
      console.log(`[Register] Domain ${domain} DNS validation inconclusive, allowing registration`)
    }
    console.log(`[Register] Domain ${domain} validation complete - proceeding with registration`)

    // NOTE: Removed SMTP email verification as it's unreliable with modern email providers
    // The email verification link sent later will confirm the email is accessible

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
      
      await sendEmail({
        to: normalizedEmail,
        subject: 'Verify your TaskerAI account',
        template: 'verification',
        data: {
          firstName,
          verificationLink,
        },
      })
      console.log(`[Register] Verification email sent to ${normalizedEmail}`)
    } catch (e) {
      console.error('[Register] Failed to send verification email:', e)
      // Non-blocking: email failure won't stop registration completion
      // User will see success message but should be notified email is being retried
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
