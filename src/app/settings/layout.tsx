"use client";

import React from "react";
import ChatBot from "@/app/components/ChatBot";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <ChatBot />
    </>
  );
}
