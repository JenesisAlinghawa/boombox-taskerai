"use client";

import React from "react";

interface PageContainerProps {
  children: React.ReactNode;
  title?: string;
}

export const PageContainer = ({ children, title }: PageContainerProps) => {
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        background: "rgba(0, 68, 255, 0.20)",
        backdropFilter: "blur(50px)",
        WebkitBackdropFilter: "blur(50px)",
        border: "1px solid rgba(255, 255, 255, 0.10)",
        borderRadius: 12,
        boxShadow: "1px 1px 2px rgba(255, 255, 255, 0.10)",
        padding: "24px",
        overflow: "hidden",
      }}
    >
      {title && (
        <div className="mb-6">
          <h1
            style={{
              color: "#ffffff",
              fontSize: "var(--font-size-title)",
              fontWeight: "400",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              fontFamily: "var(--font-inria-sans)",
              margin: 0,
            }}
          >
            {title}
          </h1>
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar">{children}</div>
    </div>
  );
};
