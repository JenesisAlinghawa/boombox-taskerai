"use client";

import React, { useState } from "react";
import { SidePanel } from "@/app/components/sidebar/SidePanel";
import ChatBot from "@/app/components/ChatBot";

export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <SidePanel />

      <main
        style={{
          flex: 1,
          marginLeft: collapsed ? 80 : 260,
          transition: "margin-left 0.3s ease",
          background: "#f8fbff",
        }}
      >
        {children}
      </main>

      <ChatBot />
    </div>
  );
}
