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
        padding: collapsed ? "20px 12px" : "20px 16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        borderBottom: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "#fff",
          padding: 4,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <SidebarOpen size={24} /> : <SidebarClose size={24} />}
      </button>

      <h1
        style={{
          margin: 0,
          fontSize: 16,
          fontWeight: 500,
          color: "#fff",
          textAlign: "center",
        }}
      >
        TASKERAI
      </h1>
    </div>
  );
});