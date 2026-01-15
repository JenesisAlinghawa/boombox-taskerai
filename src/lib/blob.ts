/**
 * Vercel Blob Upload Utility
 * Handles uploading files to Vercel Blob storage
 */

import { put } from "@vercel/blob";

interface UploadOptions {
  filename: string;
  contentType: string;
  body: Buffer;
}

/**
 * Upload a file to Vercel Blob
 * @param options Upload options (filename, contentType, body)
 * @returns Public URL of the uploaded file
 */
export async function uploadToBlob(options: UploadOptions): Promise<string> {
  const { filename, contentType, body } = options;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set");
  }

  try {
    const blob = await put(filename, body, {
      access: "public",
      contentType: contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return blob.url;
  } catch (error) {
    console.error("Error uploading to Vercel Blob:", error);
    throw new Error(`Failed to upload file to Vercel Blob: ${error}`);
  }
}

/**
 * Generate a unique filename for Blob storage
 * @param prefix Optional prefix (e.g., 'channels/profile-pictures')
 * @param filename Original filename
 * @returns Unique filename
 */
export function generateBlobKey(prefix: string, filename: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  const extension = filename.split(".").pop() || "jpg";
  return `${prefix}/${timestamp}-${random}.${extension}`;
}
