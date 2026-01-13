// components/ui/LoadingSpinner.tsx
import React from "react";
import { COLORS } from "../../constants";

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
}

export function LoadingSpinner({
  size = 24,
  color = COLORS.accent,
}: LoadingSpinnerProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        border: `2px solid ${COLORS.border}`,
        borderTop: `2px solid ${color}`,
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
      }}
    />
  );
}
