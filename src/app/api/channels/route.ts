import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { uploadToBlob, generateBlobKey } from '@/lib/blob'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const userId = parseInt(url.searchParams.get('userId') || '0')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const channels = await prisma.channel.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        members: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    return NextResponse.json({ channels })
  } catch (error: any) {
    console.error('Get channels error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse FormData if content-type is multipart/form-data
    const contentType = req.headers.get('content-type') || ''
    let name: string
    let description: string | null
    let isPrivate: boolean
    let memberIds: number[] = []
    let profilePictureUrl: string | null = null

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      name = formData.get('name') as string
      description = formData.get('description') as string || null
      isPrivate = formData.get('isPrivate') === 'true'
      memberIds = formData.get('memberIds')
        ? JSON.parse(formData.get('memberIds') as string)
        : []

      // Handle profile picture upload
      const profilePictureFile = formData.get('profilePicture') as File | null
      if (profilePictureFile && profilePictureFile.size > 0) {
        try {
          const buffer = await profilePictureFile.arrayBuffer()
          const filename = generateBlobKey('channels/profile-pictures', profilePictureFile.name)
          profilePictureUrl = await uploadToBlob({
            filename,
            contentType: profilePictureFile.type || 'image/jpeg',
            body: Buffer.from(buffer),
          })
        } catch (uploadError) {
          console.error('Profile picture upload failed:', uploadError)
          // Continue without profile picture if upload fails
        }
      }
    } else {
      // Handle JSON request
      const body = await req.json()
      name = body.name
      description = body.description || null
      isPrivate = Boolean(body.isPrivate)
      memberIds = body.memberIds || []
      profilePictureUrl = body.profilePictureUrl || null
    }

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Channel name is required' }, { status: 400 })
    }

    // Create channel with creator and selected members
    const channel = await prisma.channel.create({
      data: {
        name: name.trim(),
        description: description,
        isPrivate: Boolean(isPrivate),
        profilePicture: profilePictureUrl,
        creatorId: user.id,
        members: {
          create: [
            // Always add creator
            { userId: user.id },
            // Add other selected members (excluding creator if they selected themselves)
            ...memberIds
              .filter((id: number) => id !== user.id)
              .map((id: number) => ({ userId: id })),
          ],
        },
      },
      include: {
        members: {
          include: { user: true },
        },
      },
    })

    return NextResponse.json({ channel }, { status: 201 })
  } catch (error: any) {
    console.error('Create channel error:', error)
    return NextResponse.json({ error: 'Failed to create channel' }, { status: 500 })
  }
}
