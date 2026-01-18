"use client";

import React, { useState } from "react";
import { SidebarHeader } from "./SidebarHeader";
import { NavigationMenu } from "./NavigationMenu";
import { SidebarFooter } from "./SidebarFooter";

export function SidePanel() {
  const [collapsed, setCollapsed] = useState(true);

  const width = collapsed ? 95 : 250;
  const leftGap = 10;
  const rightGap = 10;
  const verticalGap = 10;

  React.useEffect(() => {
    const main = document.querySelector("main");
    if (main) {
      main.style.margin = `${verticalGap}px ${rightGap}px ${verticalGap}px ${leftGap + width + rightGap}px`;
      main.style.transition = "margin 0.3s ease";
      main.style.minHeight = `calc(100vh - ${verticalGap * 2}px)`;
    }
  }, [width]);

  return (
    <aside
      style={{
        width,
        background: "rgba(0, 68, 255, 0.23)",
        color: "#ffffff",
        height: `calc(100vh - ${verticalGap * 2}px)`,
        position: "fixed",
        left: leftGap,
        top: verticalGap,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: 12,
        boxShadow: "1px 1px 2px 2px rgba(255, 255, 255, 0.1)",
        backdropFilter: "blur(50px)",
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        transition: "width 0.3s ease",
      }}
    >
      <SidebarHeader collapsed={collapsed} setCollapsed={setCollapsed} />
      <NavigationMenu collapsed={collapsed} />
      <SidebarFooter collapsed={collapsed} />
    </aside>
  );
}