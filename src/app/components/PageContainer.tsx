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
        background: "transparent",
        padding: 0,
        margin: 0,
        overflow: "hidden",
      }}
    >
      {title && (
        <div className="m-2">
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
