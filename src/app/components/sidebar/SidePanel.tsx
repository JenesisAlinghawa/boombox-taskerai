"use client";

import React, { useState, useEffect } from "react";
import { SidebarHeader } from "./SidebarHeader";
import { NavigationMenu } from "./NavigationMenu";
import { SidebarFooter } from "./SidebarFooter";

export function SidePanel() {
  const [collapsed, setCollapsed] = useState(true);

  const width = collapsed ? 95 : 250;
  const leftGap = 10;
  const rightGap = 10;
  const verticalGap = 10;

  useEffect(() => {
    const main = document.querySelector("main");
    if (main) {
      // Pushes main content area to create the 10px gutter around the screen
      main.style.margin = `${verticalGap}px ${rightGap}px ${verticalGap}px ${leftGap + width + rightGap}px`;
      main.style.transition = "margin 0.3s ease";
      main.style.height = `calc(100vh - ${verticalGap * 2}px)`;
      main.style.display = "flex";
      main.style.flexDirection = "column";
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
        border: "1px solid rgba(255, 255, 255, 0.10)", // 10% Stroke
        borderRadius: 12,
        boxShadow: "1px 1px 2px rgba(255, 255, 255, 0.10)", // Shadow Spec
        backdropFilter: "blur(5px)", // Blur: 5
        WebkitBackdropFilter: "blur(5px)",
        transition: "width 0.3s ease",
        overflow: "hidden"
      }}
    >
      <SidebarHeader collapsed={collapsed} setCollapsed={setCollapsed} />
      <NavigationMenu collapsed={collapsed} />
      <SidebarFooter collapsed={collapsed} />
    </aside>
  );
}