import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface Params {
  params: Promise<{ id: string }>;
}

// Helper to extract user from headers
function getUserIdFromRequest(request: NextRequest): number | null {
  const userHeader = request.headers.get('x-user-id');
  if (userHeader) {
    return parseInt(userHeader, 10);
  }
  return null;
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const taskId = Number(id);
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to this task
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { createdById: true, assigneeId: true }
    });

    if (!task) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (task.createdById !== userId && task.assigneeId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const filename = formData.get("filename") as string;

    if (!file) return NextResponse.json({ error: "File required" }, { status: 400 });

    // Convert file to base64 for storage
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    const attachment = await prisma.attachment.create({
      data: {
        taskId,
        url: dataUrl,
        filename: filename || file.name,
      },
    });

    return NextResponse.json({ attachment });
  } catch (error) {
    console.error("Upload attachment error:", error);
    return NextResponse.json({ error: "Failed to upload attachment" }, { status: 500 });
  }
}
