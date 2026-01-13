// components/ui/ActionButton.tsx
import React from "react";
import { ActionButtonProps } from "../../types";
import { COLORS } from "../../constants";

export function ActionButton({
  onClick,
  variant,
  collapsed,
  icon,
  text,
}: ActionButtonProps) {
  const isPrimary = variant === "primary";

  return (
    <button
      onClick={onClick}
      style={{
        background: isPrimary ? COLORS.accent : COLORS.card,
        color: COLORS.text,
        border: isPrimary ? "none" : `1px solid ${COLORS.border}`,
        borderRadius: 8,
        padding: collapsed ? 8 : "8px 0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        fontWeight: 600,
        fontSize: 14,
        cursor: "pointer",
        width: "100%",
        minWidth: collapsed ? 48 : undefined,
        minHeight: 40,
      }}
      aria-label={collapsed ? text : undefined}
    >
      {collapsed ? icon : text}
    </button>
  );
}
