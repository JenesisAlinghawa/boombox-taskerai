"use client";

import React from "react";

export const PageContentCon = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={className}
      style={{
        background: "rgba(0, 0, 0, 0.40)", // Fill: 000000 @ 40%
        backdropFilter: "blur(5px)", // Background blur: 5
        WebkitBackdropFilter: "blur(5px)",
        border: "1px solid rgba(255, 255, 255, 0.10)", // Stroke: FFFFFF @ 10%
        borderRadius: 12, // Corner radius: 12
        boxShadow: "1px 1px 2px rgba(255, 255, 255, 0.10)",
        padding: "20px",
      }}
    >
      {children}
    </div>
  );
};
