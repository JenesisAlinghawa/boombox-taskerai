import React from "react";
import { clearUserSession } from "@/utils/sessionManager";

interface SidebarFooterProps {
  collapsed: boolean;
}

export function SidebarFooter({ collapsed }: SidebarFooterProps) {
  const handleLogout = () => {
    clearUserSession();
    window.location.href = "/auth/login";
  };

  return (
    <div
      style={{
        padding: "12px",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <button
        onClick={handleLogout}
        style={{
          width: "100%",
          padding: "10px 12px",
          background: "transparent",
          color: "#ffffff",
          border: "none",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: 12,
          fontSize: 12,
          fontWeight: 500,
          cursor: "pointer",
          transition: "all 0.2s",
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        }}
      >
        <span style={{ fontSize: 18 }}>🚪</span>
        <span>Logout</span>
      </button>
      <div style={{ height: 40 }} />
    </div>
  );
}
