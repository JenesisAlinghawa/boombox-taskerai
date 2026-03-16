import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { uploadToBlob, formatFileSize } from "@/lib/blob";
import { FILE_UPLOAD_CONFIG } from "@/app/constants/ui.constants";

interface Params {
  params: Promise<{ id: string }>;
}

// Helper to extract user from headers
function getUserIdFromRequest(request: NextRequest): string | null {
  return request.headers.get('x-user-id');
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const taskId = id;
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to this task
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        createdById: true,
        assignees: { select: { assigneeId: true } },
        attachments: true
      }
    });

    if (!task) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const assigneeIds = task.assignees.map(a => a.assigneeId);
    if (task.createdById !== userId && !assigneeIds.includes(userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if task already has max attachments
    if (task.attachments.length >= FILE_UPLOAD_CONFIG.TASK_ATTACHMENT.maxFiles) {
      return NextResponse.json(
        { error: `Maximum ${FILE_UPLOAD_CONFIG.TASK_ATTACHMENT.maxFiles} attachments per task allowed` },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const filename = formData.get("filename") as string;

    if (!file) return NextResponse.json({ error: "File required" }, { status: 400 });

    // Validate file size
    const maxSize = FILE_UPLOAD_CONFIG.TASK_ATTACHMENT.maxSize;
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: `File size exceeds maximum allowed size. Maximum: ${formatFileSize(maxSize)}, Your file: ${formatFileSize(file.size)}`,
        },
        { status: 413 }
      );
    }

    // Convert file to buffer and upload to Cloudinary
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const nodeBuffer = Buffer.from(bytes);

    const url = await uploadToBlob({
      filename: `${Date.now()}-${file.name}`,
      contentType: file.type,
      body: nodeBuffer,
      maxSize,
    });

    const attachment = await prisma.attachment.create({
      data: {
        taskId,
        url, // Store Cloudinary URL instead of base64
        filename: filename || file.name,
      },
    });

    // Also log to activity log for the logs page
    try {
      await prisma.log.create({
        data: {
          userId: userId,
          taskId: taskId,
          action: 'Added attachment',
          data: {
            attachmentId: attachment.id,
            filename: attachment.filename,
            fileSize: file.size,
          },
        },
      });
    } catch (logError) {
      console.error('Failed to create activity log:', logError);
    }

    return NextResponse.json({ attachment });
  } catch (error: any) {
    console.error("Upload attachment error:", error);
    // Check if it's a size validation error
    if (error.message?.includes("exceeds maximum")) {
      return NextResponse.json({ error: error.message }, { status: 413 });
    }
    return NextResponse.json({ error: "Failed to upload attachment" }, { status: 500 });
  }
}
