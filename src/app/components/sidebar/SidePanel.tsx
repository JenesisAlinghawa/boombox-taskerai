"use client";

import React, { useState, useEffect } from "react";
import { SidebarHeader } from "./SidebarHeader";
import { NavigationMenu } from "./NavigationMenu";
import { SidebarFooter } from "./SidebarFooter";

export function SidePanel() {
  const [collapsed, setCollapsed] = useState(true);

  const width = collapsed ? 72 : 164;
  const leftGap = 8;
  const rightGap = 8;
  const verticalGap = 12;

  useEffect(() => {
    const main = document.querySelector("main");
    if (main) {
      main.style.margin = `${verticalGap}px ${rightGap}px ${verticalGap}px ${leftGap + width + rightGap}px`;
      main.style.height = `calc(100vh - ${verticalGap * 2}px)`;
    }
  }, [width, leftGap, rightGap, verticalGap]);

  return (
    <aside
      style={{
        width,
        height: `calc(100vh - ${verticalGap * 2}px)`,
        left: leftGap,
        top: verticalGap,
      }}
      className="fixed bg-blue-600/50 text-white pr-1.25 z-50 shadow-lg flex flex-col rounded overflow-hidden backdrop-blur-sm transition-all duration-300"
    >
      <SidebarHeader collapsed={collapsed} setCollapsed={setCollapsed} />
      <NavigationMenu collapsed={collapsed} />
      <SidebarFooter collapsed={collapsed} />
    </aside>
  );
}
