"use client";

import React, { useState, useEffect } from "react";
import { SidebarHeader } from "./SidebarHeaderSectionComponent";
import { NavigationMenu } from "./MainNavigationMenuComponent";

export function SidePanel() {
  const [isHovered, setIsHovered] = useState(false);

  const width = isHovered ? 152 : 62;
  const leftGap = 0;
  const rightGap = 0;
  const verticalGap = 0;

  useEffect(() => {
    const main = document.querySelector("main");
    if (main) {
      main.style.margin = `${verticalGap}px ${rightGap}px ${verticalGap}px ${leftGap + width + rightGap}px`;
      main.style.height = `calc(100vh - ${verticalGap * 2}px)`;
    }
  }, [width, leftGap, rightGap, verticalGap]);

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width,
        height: `calc(100vh - ${verticalGap * 2}px)`,
        left: leftGap,
        top: verticalGap,
      }}
      className="fixed bg-blue-300  text-black p-0 z-50 shadow-md shadow-black/50 flex flex-col rounded overflow-hidden backdrop-blur-sm transition-all duration-300"
    >
      <SidebarHeader isExpanded={isHovered} />
      <NavigationMenu collapsed={!isHovered} />
    </aside>
  );
}
