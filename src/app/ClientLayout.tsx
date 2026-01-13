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
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/login/") ||
    pathname.startsWith("/register/");

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Only show sidebar if NOT on auth page */}
      {!isAuthPage && <SidePanel />}

      <main
        style={{
          flex: 1,
          marginLeft: !isAuthPage ? 260 : 0,
          transition: "margin-left 0.3s ease",
          background: "#f8fbff",
          width: "100%",
        }}
      >
        {children}
      </main>
    </div>
  );
}