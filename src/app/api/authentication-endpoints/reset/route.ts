import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()
    if (!token || !password) return NextResponse.json({ error: 'Token and password required' }, { status: 400 })

    const secret = process.env.JWT_SECRET || 'change-me'
    let payload: any
    try {
      payload = jwt.verify(token, secret) as any
    } catch (e) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
    }

    const userId = payload.id
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Validate password strength (reuse same rules as register)
    const rules = [
      { test: (p: string) => p.length >= 8, label: 'At least 8 characters' },
      { test: (p: string) => /[A-Z]/.test(p), label: 'One uppercase letter' },
      { test: (p: string) => /[a-z]/.test(p), label: 'One lowercase letter' },
      { test: (p: string) => /[0-9]/.test(p), label: 'One number' },
      { test: (p: string) => /[!@#$%^&*(),.?"{}|<>]/.test(p), label: 'One special character' },
    ]

    const failed = rules.filter(r => !r.test(password)).map(r => r.label)
    if (failed.length) {
      return NextResponse.json({ error: `Password does not meet requirements: ${failed.join(', ')}` }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 10)
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
