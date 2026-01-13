// components/ui/Modal.tsx
import React from "react";
import { COLORS, UI_CONFIG } from "../../constants";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export function Modal({ isOpen, onClose, children, title }: ModalProps) {
  if (!isOpen) return null;

  // Modal component that displays content in a centered dialog with a backdrop
  // It includes a close button and an optional title
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(24,26,32,0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflowY: "auto",
        padding: "4vw 2vw",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          background: COLORS.card,
          color: COLORS.text,
          borderRadius: UI_CONFIG.BORDER_RADIUS.LARGE,
          border: `1.5px solid ${COLORS.border}`,
          padding: "clamp(18px, 4vw, 36px)",
          width: "100%",
          maxWidth: UI_CONFIG.MODAL_MAX_WIDTH,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 8px 40px 0 rgba(0,0,0,0.30)",
          display: "flex",
          flexDirection: "column",
          gap: UI_CONFIG.FORM_GAP,
        }}
      >
        {title && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: UI_CONFIG.SPACING.SM,
            }}
          >
            <h2
              style={{
                fontWeight: 700,
                fontSize: 22,
                margin: 0,
                letterSpacing: "-0.5px",
              }}
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: COLORS.muted,
                fontSize: 24,
                cursor: "pointer",
                padding: 4,
              }}
              aria-label="Close modal"
            >
              ×
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
