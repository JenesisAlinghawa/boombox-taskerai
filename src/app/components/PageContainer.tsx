import React from "react";

interface PageContainerProps {
  title: string;
  children?: React.ReactNode;
}

export function PageContainer({ title, children }: PageContainerProps) {
  return (
    <div
      style={{
        background: "rgba(0, 68, 255, 0.20)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: 12,
        boxShadow: "1px 1px 2px 0px rgba(255, 255, 255, 0.1)",
        backdropFilter: "blur(50px)",
        padding: "24px",
        minHeight: "calc(100vh - 40px)",
        height: "calc(100vh - 40px)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        color: "#fff",
      }}
    >
      <h1
        style={{
          margin: "0 0 24px 0",
          fontSize: 16,
          fontWeight: 500,
          opacity: 0.9,
        }}
      >
        {title}
      </h1>
      <div style={{ flex: 1, overflow: "auto" }}>
        {children}
      </div>
    </div>
  );
}