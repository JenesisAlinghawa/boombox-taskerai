// app/ClientLayout.tsx
"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { SidePanel } from "@/app/components/sidebar/SidePanel";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

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
