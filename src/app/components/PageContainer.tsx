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
        background: "rgba(0, 68, 220, 0.2)",
        backdropFilter: "blur(1px)",
        WebkitBackdropFilter: "blur(2px)",
        borderRadius: 12,
        padding: "10px 20px",
        overflow: "hidden",
      }}
    >
      {title && (
        <div className="mb-2">
          <h1
            style={{
              color: "#ffffff",
              fontSize: "var(--font-size-description-small)",
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
