"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Download, Eye, Trash2 } from "lucide-react";

interface MediaAttachmentProps {
  url: string;
  filename?: string;
  createdAt?: string;
  onDelete?: (url: string) => void;
  isTaskAttachment?: boolean;
  maxWidth?: string;
  maxHeight?: string;
  showDownloadButton?: boolean;
  showViewButton?: boolean;
  showDeleteButton?: boolean;
}

// Helper function to determine file type
const getFileType = (
  url: string,
): "image" | "video" | "audio" | "document" | "file" => {
  const urlLower = url.toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp)$/i.test(urlLower)) return "image";
  if (/\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(urlLower)) return "video";
  if (/\.(mp3|wav|ogg|m4a|flac)$/i.test(urlLower)) return "audio";
  if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv)$/i.test(urlLower))
    return "document";
  return "file";
};

/**
 * Component for displaying media attachments with proper rendering
 * - Images: Inline display with preview
 * - Videos: Inline video player with controls
 * - Documents/Files: Downloadable links
 * - Audio: Audio player with controls
 */
export function MediaAttachment({
  url,
  filename,
  createdAt,
  onDelete,
  isTaskAttachment = false,
  maxWidth = "300px",
  maxHeight = "300px",
  showDownloadButton = true,
  showViewButton = true,
  showDeleteButton = false,
}: MediaAttachmentProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const fileType = useMemo(() => getFileType(url), [url]);

  const displayName = useMemo(() => {
    if (!filename) return "Download File";
    return filename.length > 40 ? filename.substring(0, 37) + "..." : filename;
  }, [filename]);

  const handleDownload = useCallback(() => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || "download";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [url, filename]);

  const handlePreviewClose = useCallback(() => {
    setIsPreviewOpen(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setIsPreviewOpen(false);
    };
  }, []);

  // Handle escape key to close preview
  useEffect(() => {
    if (!isPreviewOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handlePreviewClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isPreviewOpen, handlePreviewClose]);

  return (
    <div className="flex flex-col gap-2">
      {fileType === "image" && (
        <div className="relative group">
          <img
            src={url}
            alt={filename || "Attachment"}
            style={{
              maxWidth,
              maxHeight,
              borderRadius: "8px",
              cursor: "pointer",
              display: "block",
              transition: "opacity 0.2s",
            }}
            onClick={() => setIsPreviewOpen(true)}
            title="Click to view full size"
            className="hover:opacity-90"
          />
          {showViewButton && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-[8px]">
              <Eye size={24} className="text-white" />
            </div>
          )}
        </div>
      )}

      {fileType === "video" && (
        <video
          src={url}
          controls
          style={{
            maxWidth,
            maxHeight,
            borderRadius: "8px",
            display: "block",
            backgroundColor: "#000",
          }}
          title={filename || "Video attachment"}
        />
      )}

      {fileType === "audio" && (
        <div className="bg-gray-100 rounded-[8px] p-3">
          <audio
            src={url}
            controls
            style={{
              width: "100%",
              maxWidth: "300px",
            }}
            title={filename || "Audio attachment"}
          />
        </div>
      )}

      {(fileType === "document" || fileType === "file") && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-[8px] w-fit">
          <span className="text-lg">📎</span>
          <span className="text-sm text-gray-700 flex-1 break-all">
            {displayName}
          </span>
          {createdAt && (
            <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
              {new Date(createdAt).toLocaleString()}
            </span>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {(showDownloadButton || showDeleteButton) && (
        <div className="flex gap-2 items-center flex-wrap">
          {(fileType === "document" ||
            fileType === "file" ||
            fileType === "audio") &&
            showDownloadButton && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-3 py-2 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                title="Download file"
              >
                <Download size={14} />
                Download
              </button>
            )}

          {(fileType === "image" || fileType === "video") &&
            showDownloadButton && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-3 py-2 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                title="Download file"
              >
                <Download size={14} />
                Download
              </button>
            )}

          {showDeleteButton && onDelete && (
            <button
              onClick={() => onDelete(url)}
              className="flex items-center gap-2 px-3 py-2 text-xs bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              title="Delete attachment"
            >
              <Trash2 size={14} />
              Delete
            </button>
          )}
        </div>
      )}

      {/* Image Preview Modal */}
      {fileType === "image" && isPreviewOpen && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[1001] p-4 cursor-pointer"
          onClick={handlePreviewClose}
        >
          <div className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center">
            <img
              src={url}
              alt={filename || "Preview"}
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={handlePreviewClose}
              className="absolute top-4 right-4 text-white hover:text-gray-300 text-2xl"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
