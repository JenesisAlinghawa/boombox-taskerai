import React from "react";
import { SidebarClose, SidebarOpen } from "lucide-react";

interface SidebarHeaderProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const SidebarHeader = React.memo(function SidebarHeaderComponent({
  collapsed,
  setCollapsed,
}: SidebarHeaderProps) {
  return (
    <div
      style={{
        padding: collapsed ? "20px 12px 20px 12px" : "20px 16px 20px 16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        transition: "all 0.3s ease",
      }}
    >
      {/* Collapse/Expand Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          position: "absolute",
          right: 12,
          top: 12,
          zIndex: 10,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "#fff",
          padding: "8px 12px 8px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <SidebarOpen size={18} /> : <SidebarClose size={18} />}
      </button>

      {/* Logo + Title container */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          padding: collapsed ? "52px 0px 0px 0px" : "52px 12px 0px 0px",
          width: "100%",
          transition: "all 0.3s ease",
        }}
      >
        {/* Logo that scales */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            overflow: "hidden",
            flexShrink: 0,
            transition: "all 0.3s ease",
            backgroundColor: "rgba(255,255,255,0.05)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto",
          }}
        >
          <img
            src="/path-to-your-logo.png"
            alt="TaskerAI Logo"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transition: "all 0.3s ease",
            }}
          />
        </div>

        {/* Title appears only when expanded */}
        {!collapsed && (
          <h1
            style={{
              margin: 0,
              fontSize: 14,
              color: "#fff",
              whiteSpace: "nowrap",
              transition: "all 0.3s ease",
            }}
          >
            TASKERAI
          </h1>
        )}
      </div>
    </div>
  );
});
