"use client";

import React, { useState, useEffect } from "react";
import { SidebarHeader } from "./SidebarHeaderSectionComponent";
import { NavigationMenu } from "./MainNavigationMenuComponent";

export function SidePanel() {
  const [collapsed, setCollapsed] = useState(true);

  const width = collapsed ? 62 : 152;
  const leftGap = 4;
  const rightGap = 6;
  const verticalGap = 4;

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
      className="fixed bg-blue-300  text-black p-0 z-50 shadow-md shadow-black/50 flex flex-col rounded overflow-hidden backdrop-blur-sm transition-all duration-300"
    >
      <SidebarHeader collapsed={collapsed} setCollapsed={setCollapsed} />
      <NavigationMenu collapsed={collapsed} />
    </aside>
  );
}
