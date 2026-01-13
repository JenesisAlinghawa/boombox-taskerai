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
  }
} as const;