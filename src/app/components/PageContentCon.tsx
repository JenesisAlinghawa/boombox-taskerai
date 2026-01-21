"use client";

import React from "react";

export const PageContentCon = ({
  children,
  className = "",
  style = {},
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) => {
  return (
    <div
      className={className}
      style={{
        background: "rgba(255, 255, 255, 0.22)",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(5px)",
        border: "1px solid rgba(255, 255, 255, 0.10)",
        borderRadius: 6,
        boxShadow: "1px 1px 12px rgba(0, 0, 0, 0.20)",
        padding: "20px",
        fontFamily: "var(--font-inria-sans)",
        fontWeight: "400",
        ...style,
      }}
    >
      {children}
    </div>
  );
};
