import { NextRequest, NextResponse } from "next/server";
import { uploadToBlob, formatFileSize } from "@/lib/blob";
import { FILE_UPLOAD_CONFIG } from "@/app/constants/ui.constants";

/**
 * Determine file type and get maximum allowed size
 */
function getMaxSizeForFile(filename: string, contentType: string): number {
  // Check image types
  if (contentType.startsWith("image/")) {
    return FILE_UPLOAD_CONFIG.ATTACHMENT.IMAGE.maxSize;
  }
  // Check video types
  if (contentType.startsWith("video/")) {
    return FILE_UPLOAD_CONFIG.ATTACHMENT.VIDEO.maxSize;
  }
  // Check audio types
  if (contentType.startsWith("audio/")) {
    return FILE_UPLOAD_CONFIG.ATTACHMENT.AUDIO.maxSize;
  }
  // Check document types
  if (
    contentType === "application/pdf" ||
    contentType.includes("wordprocessingml") ||
    contentType.includes("spreadsheetml") ||
    contentType.includes("presentationml") ||
    contentType === "text/plain" ||
    contentType === "text/csv"
  ) {
    return FILE_UPLOAD_CONFIG.ATTACHMENT.DOCUMENT.maxSize;
  }
  // Default
  return FILE_UPLOAD_CONFIG.ATTACHMENT.DEFAULT.maxSize;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Get maximum size for this file type
    const maxSize = getMaxSizeForFile(file.name, file.type);

    // Validate file size
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: `File size exceeds maximum allowed size. Maximum: ${formatFileSize(maxSize)}, Your file: ${formatFileSize(file.size)}`,
        },
        { status: 413 } // Payload Too Large
      );
    }

    // Convert file to buffer
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const nodeBuffer = Buffer.from(bytes);

    // Upload using blob utility (now using Cloudinary)
    const url = await uploadToBlob({
      filename: `${Date.now()}-${file.name}`,
      contentType: file.type,
      body: nodeBuffer,
      maxSize,
    });

    return NextResponse.json({ url, success: true });
  } catch (error: any) {
    console.error("[Upload] Error:", error);
    // Check if it's a size validation error from uploadToBlob
    if (error.message?.includes("exceeds maximum")) {
      return NextResponse.json(
        { error: error.message },
        { status: 413 }
      );
    }
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
