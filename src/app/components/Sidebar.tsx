// src/app/components/ui/Sidebar.tsx
"use client";
import React, { useState, useEffect } from "react";
import { NavigationMenu } from "./sidebar/NavigationMenu";
import SettingsDropdown from "./SettingsDropdown";
import { getCurrentUser } from "@/utils/sessionManager";

interface User {
  id: number;
  name: string;
  email: string;
}

const COLORS = {
  sidebar: "#42527F",
  sidebarDark: "#1a2237",
  text: "#ffffff",
  textMuted: "rgba(255,255,255,0.7)",
  active: "#a0d8ef",
};

// menu handled by NavigationMenu (PNG-based)

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await getCurrentUser();
        if (userData) {
          setUser(userData);
        }
      } catch (e) {
        console.error("Failed to load user data", e);
      }
    };

    // Load user on mount
    loadUser();
  }, []);

  return (
    <aside
      style={{
        width: collapsed ? 64 : 220,
        background: COLORS.sidebar,
        color: COLORS.text,
        height: "100vh",
        position: "fixed",
        left: 0,
        top: 0,
        transition: "width 0.28s ease",
        display: "flex",
        flexDirection: "column",
        zIndex: 50,
        fontSize: 13,
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Top: Logo */}
      <div
        style={{
          padding: "14px 12px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div style={{ fontSize: 24 }}>✓</div>
        {!collapsed && (
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Taskerai</h2>
        )}
      </div>

      {/* User Profile Section */}
      {user && (
        <div
          style={{
            padding: "12px",
            margin: "8px 12px",
            background: "rgba(255,255,255,0.08)",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "#4A5E98",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            👤
          </div>
          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>
                {user.name || "User"}
              </p>
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: 11,
                  opacity: 0.7,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user.email}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Navigation Items */}
      <nav style={{ flex: 1, padding: "0" }}>
        <NavigationMenu collapsed={collapsed} />
      </nav>
    </aside>
  );
}
