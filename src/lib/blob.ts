/**
 * Cloudinary Upload Utility
 * Handles uploading files to Cloudinary storage with size validation
 */

import { v2 as cloudinary } from "cloudinary";

interface UploadOptions {
  filename: string;
  contentType: string;
  body: Buffer;
  maxSize?: number; // Max file size in bytes (optional)
}

/**
 * Format bytes to human-readable size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Upload a file to Cloudinary with size validation
 * @param options Upload options (filename, contentType, body, maxSize)
 * @returns Public URL of the uploaded file
 * @throws Error if file exceeds maxSize
 */
export async function uploadToBlob(options: UploadOptions): Promise<string> {
  const { filename, contentType, body, maxSize } = options;

  // Validate file size if maxSize is specified
  if (maxSize && body.length > maxSize) {
    const maxSizeStr = formatFileSize(maxSize);
    const actualSizeStr = formatFileSize(body.length);
    throw new Error(
      `File size (${actualSizeStr}) exceeds maximum allowed size (${maxSizeStr})`
    );
  }

  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error("Cloudinary credentials are not set");
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  try {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "auto",
          public_id: filename.split(".")[0],
          folder: "taskertai",
        },
        (error: any, result: any) => {
          if (error) {
            reject(error);
          } else {
            resolve(result.secure_url);
          }
        }
      );

      uploadStream.end(body);
    });
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    throw new Error(`Failed to upload file to Cloudinary: ${error}`);
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
