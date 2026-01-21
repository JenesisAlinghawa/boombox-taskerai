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
      {/* Background Image Wrapper */}
      <div
        className="fixed inset-0 z-[-1] bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/assets/images/taskerBg.jpg')",
          backgroundColor: "#01162B",
        }}
      />

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
