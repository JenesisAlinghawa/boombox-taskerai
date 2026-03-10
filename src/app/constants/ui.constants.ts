// constants/ui.constants.ts
export const UI_CONFIG = {
  SIDEBAR_WIDTH: {
    EXPANDED: 260,
    COLLAPSED: 72
  },
  MODAL_MAX_WIDTH: '85em',
  FORM_GAP: 24,
  TRANSITION_DURATION: '0.2s',
  BORDER_RADIUS: {
    SMALL: 6,
    MEDIUM: 8,
    LARGE: 18
  },
  SPACING: {
    XS: 4,
    SM: 8,
    MD: 12,
    LG: 16,
    XL: 20,
    XXL: 24
  }
} as const;

export const FILE_UPLOAD_CONFIG = {
  LOGO: {
    accept: "image/*",
    maxSize: 5 * 1024 * 1024, // 5MB
  },
  BRAND_GUIDE: {
    accept: "image/*,application/pdf",
    maxSize: 10 * 1024 * 1024, // 10MB
  },
  BRAND_COLORS: {
    accept: "image/*,application/pdf",
    maxSize: 10 * 1024 * 1024, // 10MB
  },
  // General attachment limits by category
  ATTACHMENT: {
    IMAGE: {
      maxSize: 10 * 1024 * 1024, // 10MB
      accept: "image/*",
    },
    VIDEO: {
      maxSize: 100 * 1024 * 1024, // 100MB
      accept: "video/*",
    },
    DOCUMENT: {
      maxSize: 20 * 1024 * 1024, // 20MB
      accept: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv",
    },
    AUDIO: {
      maxSize: 50 * 1024 * 1024, // 50MB
      accept: "audio/*",
    },
    DEFAULT: {
      maxSize: 25 * 1024 * 1024, // 25MB for general files
      accept: "*",
    },
  },
  // Message attachment limits
  MESSAGE_ATTACHMENT: {
    maxSize: 25 * 1024 * 1024, // 25MB per file
    maxTotal: 100 * 1024 * 1024, // 100MB total per message
  },
  // Task attachment limits
  TASK_ATTACHMENT: {
    maxSize: 30 * 1024 * 1024, // 30MB per file
    maxFiles: 10, // Max 10 files per task
  },
} as const;