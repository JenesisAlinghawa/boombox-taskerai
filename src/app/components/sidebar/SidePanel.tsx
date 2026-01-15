"use client";

import React, { useState } from "react";
import { SidebarHeader } from "./SidebarHeader";
import { NavigationMenu } from "./NavigationMenu";
import { SidebarFooter } from "./SidebarFooter";

export function SidePanel() {
  const [collapsed, setCollapsed] = useState(false);

  // Update main content margin when collapsed
  React.useEffect(() => {
    const main = document.querySelector("main");
    if (main) {
      main.style.marginLeft = collapsed ? "80px" : "260px";
    }
  }, [collapsed]);

  // Also set initial margin on mount
  React.useEffect(() => {
    const main = document.querySelector("main");
    if (main) {
      main.style.marginLeft = "260px";
    }
  }, []);

  return (
    <aside
      style={{
        width: collapsed ? 80 : 260,
        background: "#42527F",
        color: "#ffffff",
        height: "100vh",
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        transition: "width 0.3s ease",
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      }}
    >
      <SidebarHeader
        collapsed={collapsed}
        onCollapse={() => setCollapsed(!collapsed)}
      />
      <NavigationMenu collapsed={collapsed} />
      <SidebarFooter collapsed={collapsed} />
    </aside>
  );
}
