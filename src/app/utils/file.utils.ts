// utils/file.utils.ts
import { FILE_UPLOAD_CONFIG } from "@/app/constants/ui.constants";

export const validateFileSize = (file: File, maxSizeInMB: number): boolean => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
};

export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      return file.type.startsWith(type.replace('/*', '/'));
    }
    return file.type === type;
  });
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileExtension = (filename: string): string => {
  return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);
};

/**
 * Get file type category (image, video, audio, document, file)
 */
export const getFileType = (filename: string, contentType?: string): 'image' | 'video' | 'audio' | 'document' | 'file' => {
  const lowerName = filename.toLowerCase();
  const lowerType = contentType?.toLowerCase() || '';
  
  if (/\.(jpg|jpeg|png|gif|webp)$/i.test(lowerName) || lowerType.startsWith('image/')) {
    return 'image';
  }
  if (/\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(lowerName) || lowerType.startsWith('video/')) {
    return 'video';
  }
  if (/\.(mp3|wav|ogg|m4a|flac)$/i.test(lowerName) || lowerType.startsWith('audio/')) {
    return 'audio';
  }
  if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv)$/i.test(lowerName)) {
    return 'document';
  }
  return 'file';
};

/**
 * Get max file size for a given file type
 */
export const getMaxFileSizeForType = (fileType: 'image' | 'video' | 'audio' | 'document' | 'file', context: 'message' | 'task' = 'message'): number => {
  if (context === 'task') {
    return FILE_UPLOAD_CONFIG.TASK_ATTACHMENT.maxSize;
  }
  
  switch (fileType) {
    case 'image':
      return FILE_UPLOAD_CONFIG.ATTACHMENT.IMAGE.maxSize;
    case 'video':
      return FILE_UPLOAD_CONFIG.ATTACHMENT.VIDEO.maxSize;
    case 'audio':
      return FILE_UPLOAD_CONFIG.ATTACHMENT.AUDIO.maxSize;
    case 'document':
      return FILE_UPLOAD_CONFIG.ATTACHMENT.DOCUMENT.maxSize;
    default:
      return FILE_UPLOAD_CONFIG.ATTACHMENT.DEFAULT.maxSize;
  }
};

/**
 * Validate file for upload with context-specific rules
 */
export const validateFileForUpload = (
  file: File,
  context: 'message' | 'task' = 'message'
): { valid: boolean; error?: string } => {
  const fileType = getFileType(file.name, file.type);
  const maxSize = getMaxFileSizeForType(fileType, context);
  
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed (${formatFileSize(maxSize)}). Your file is ${formatFileSize(file.size)}.`,
    };
  }
  
  return { valid: true };
};

/**
 * Get user-friendly file type icon/emoji
 */
export const getFileTypeIcon = (filename: string): string => {
  const ext = getFileExtension(filename).toLowerCase();
  
  const iconMap: Record<string, string> = {
    // Documents
    'pdf': '📄',
    'doc': '📝',
    'docx': '📝',
    'txt': '📄',
    'csv': '📊',
    'xls': '📊',
    'xlsx': '📊',
    'ppt': '🎯',
    'pptx': '🎯',
    // Archives
    'zip': '📦',
    'rar': '📦',
    '7z': '📦',
    // Code
    'js': '💻',
    'ts': '💻',
    'py': '💻',
    'jsx': '💻',
    'tsx': '💻',
    'json': '💻',
    // Media (handled by components anyway)
    'jpg': '🖼️',
    'jpeg': '🖼️',
    'png': '🖼️',
    'gif': '🎬',
    'mp4': '🎥',
    'mp3': '🎵',
  };
  
  return iconMap[ext] || '📎';
};