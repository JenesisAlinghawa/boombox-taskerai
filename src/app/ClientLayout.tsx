"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { SidePanel } from "@/app/components/sidebar/SidePanel";
import { TaskerBotWidget } from "@/app/components/TaskerBotWidget";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isAuthPage =
    pathname === "/" ||
    pathname.startsWith("/auth/login") ||
    pathname.startsWith("/auth/forgotPassword") ||
    pathname.startsWith("/auth/register");

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
  <div className="fixed inset-0 bg-[rgba(0,32,55,0.32)] backdrop-blur-lg z-[-0.5]" />

      <div className="flex h-screen w-full">
        {/* Conditional Rendering: SidePanel only shows if NOT an auth page */}
        {!isAuthPage && <SidePanel />}

        <main
          style={{
            position: "relative",
            flex: 1,
            background: "transparent",
            overflow: "hidden",
          }}
        >
          {children}
        </main>
      </div>

      {/* TaskerBot Widget */}
      {!isAuthPage && <TaskerBotWidget excludePages={["/settings"]} />}
    </div>
  );
}
