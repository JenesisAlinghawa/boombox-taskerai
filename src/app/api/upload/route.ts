import { NextRequest, NextResponse } from "next/server";
import { uploadToBlob } from "@/lib/blob";

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

    // Convert file to buffer
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const nodeBuffer = Buffer.from(bytes);

    // Upload using blob utility (now using Cloudinary)
    const url = await uploadToBlob({
      filename: `${Date.now()}-${file.name}`,
      contentType: file.type,
      body: nodeBuffer,
    });

    return NextResponse.json({ url, success: true });
  } catch (error) {
    console.error("[Upload] Error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
