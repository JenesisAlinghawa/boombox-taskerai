import { NextRequest, NextResponse } from 'next/server'
import { resolveMx } from 'dns/promises'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required', valid: false },
        { status: 400 }
      )
    }

    // Extract domain from email
    const domain = email.split('@')[1]
    
    if (!domain) {
      return NextResponse.json(
        { valid: false },
        { status: 200 }
      )
    }

    try {
      // Check if domain has MX records (can receive emails)
      const mxRecords = await resolveMx(domain)
      
      if (!mxRecords || mxRecords.length === 0) {
        return NextResponse.json(
          { valid: false },
          { status: 200 }
        )
      }

      return NextResponse.json(
        { valid: true },
        { status: 200 }
      )
    } catch (error) {
      // Domain doesn't exist or has no MX records
      return NextResponse.json(
        { valid: false },
        { status: 200 }
      )
    }
  } catch (error) {
    console.error('Email validation error:', error)
    return NextResponse.json(
      { error: 'An error occurred', valid: false },
      { status: 500 }
    )
  }
}
