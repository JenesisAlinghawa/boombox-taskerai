"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { SidePanel } from "@/app/components/sidebar/SidebarPanelContainerComponent";
import { TaskerBotWidget } from "@/app/components/shared-headers/TaskerBotHeaderComponent";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isAuthPage = pathname === "/" || pathname.startsWith("/auth/");

  // Auth pages layout - full screen, no sidebar
  if (isAuthPage) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden">
        <div
          className="fixed inset-0 z-[-1] bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/assets/images/taskerBg.jpg')",
            backgroundColor: "#01162B",
          }}
        />

        {/* Frosted overlay that covers the whole screen */}
        <div className="fixed inset-0 bg-white/60 backdrop-blur-md z-[-0.5]" />

        <main
          style={{
            position: "relative",
            minHeight: "100vh",
            width: "100vw",
            background: "transparent",
            overflow: "hidden",
          }}
        >
          {children}
        </main>
      </div>
    );
  }

  // Logged-in pages layout - with sidebar
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div
        className="fixed inset-0 z-[-1] bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/assets/images/taskerBg.jpg')",
          backgroundColor: "#01162B",
        }}
      />

      {/* Frosted overlay that covers the whole screen */}
      <div className="fixed inset-0 bg-white/50 backdrop-blur-lg z-[-0.5]" />

      <div className="flex h-screen w-full">
        {/* Sidebar for logged-in users */}
        <SidePanel />

        <main
          style={{
            position: "relative",
            flex: 1,
            background: "transparent",
            overflow: "visible", // allow header dropdowns to overflow
          }}
        >
          {children}
        </main>
      </div>

      {/* TaskerBot Widget */}
      <TaskerBotWidget excludePages={["/settings"]} />
    </div>
  );
}
