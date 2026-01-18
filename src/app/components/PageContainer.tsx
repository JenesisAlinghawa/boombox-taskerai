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
        height: "100%", // Matches the main/sidebar height
        width: "100%",
        display: "flex",
        flexDirection: "column",
        background: "rgba(0, 68, 255, 0.20)", // Fill: 0044FF @ 20%
        backdropFilter: "blur(50px)",         // Background blur: 50
        WebkitBackdropFilter: "blur(50px)",
        border: "1px solid rgba(255, 255, 255, 0.10)", // Stroke: FFFFFF @ 10%
        borderRadius: 12,                     // Corner radius: 12
        boxShadow: "1px 1px 2px rgba(255, 255, 255, 0.10)", // Drop shadow
        padding: "24px",
        overflow: "hidden"
      }}
    >
      {title && (
        <div className="mb-6">
          <h1 className="text-white text-2xl font-bold uppercase tracking-[0.2em]">
            {title}
          </h1>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {children}
      </div>
    </div>
  );
};