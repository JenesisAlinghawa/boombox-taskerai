// app/ClientLayout.tsx
"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import { SidePanel } from "@/app/components/sidebar/SidePanel";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Initialize cleanup routine on app start
  useEffect(() => {
    const initCleanup = async () => {
      try {
        // Only initialize once on app start
        const response = await fetch("/api/system/cleanup-init", {
          method: "POST",
        });
        if (response.ok) {
          console.log("[ClientLayout] Cleanup routine initialized");
        }
      } catch (error) {
        console.error("[ClientLayout] Failed to initialize cleanup:", error);
      }
    };

    initCleanup();
  }, []); // Empty dependency array = run once on mount

  // List all auth routes — add more if you create them later
  const isAuthPage =
    pathname === "/auth/login" ||
    pathname === "/auth/register" ||
    pathname === "/auth/forgot-password" ||
    pathname === "/auth/reset" ||
    pathname === "/auth/verify" ||
    pathname.startsWith("/auth/");

  return (
    <>
      {/* Only show sidebar if NOT on auth page - SidePanel persists across navigation */}
      {!isAuthPage && <SidePanel />}

      <main
        style={{
          background: "#f8fbff",
          minHeight: "100vh",
          flex: 1,
          overflow: "hidden",
        }}
      >
        {children}
      </main>
    </>
  );
}
