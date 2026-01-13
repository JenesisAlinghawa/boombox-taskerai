"use client";

import { SidePanel } from "@/app/components/sidebar/SidePanel";
import ChatBot from "@/app/components/ChatBot";

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <SidePanel />

      <main
        style={{
          flex: 1,
          marginLeft: 260,
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
