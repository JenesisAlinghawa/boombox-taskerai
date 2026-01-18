// src/app/components/ui/Sidebar.tsx
"use client";
import React, { useState, useEffect } from "react";
import { NavigationMenu } from "./sidebar/NavigationMenu";
import SettingsDropdown from "./SettingsDropdown";
import { getCurrentUser } from "@/utils/sessionManager";

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
}

const COLORS = {
  sidebar: "#0F1626",
  sidebarDark: "#081529",
  text: "#ffffff",
  textMuted: "rgba(255,255,255,0.6)",
  active: "#a0d8ef",
  borderColor: "rgba(255,255,255,0.1)",
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
        width: collapsed ? 80 : 280,
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
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        backdropFilter: "blur(50px)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
      }}
    >
      {/* Top: Logo */}
      <div
        style={{
          padding: collapsed ? "24px 12px" : "24px 20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          borderBottom: `1px solid ${COLORS.borderColor}`,
        }}
      >
        <div style={{ fontSize: 24, fontWeight: "bold" }}>✓</div>
        {!collapsed && (
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              margin: 0,
              letterSpacing: "1px",
            }}
          >
            TASKERAI
          </h2>
        )}
      </div>

      {/* Navigation Items */}
      <nav style={{ flex: 1, padding: "20px 0", overflowY: "auto" }}>
        <NavigationMenu collapsed={collapsed} />
      </nav>

      {/* Divider before user section */}
      <div style={{ borderTop: `1px solid ${COLORS.borderColor}` }} />

      {/* User Profile Section - At Bottom */}
      {user && (
        <div
          style={{
            padding: collapsed ? "16px 12px" : "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            borderTop: `1px solid ${COLORS.borderColor}`,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #0044FF 0%, #0088FF 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              flexShrink: 0,
              fontWeight: 600,
            }}
          >
            {user.firstName?.charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <div style={{ minWidth: 0, flex: 1 }}>
              <p
                style={{
                  margin: 0,
                  fontWeight: 500,
                  fontSize: 14,
                  color: COLORS.text,
                }}
              >
                {`${user.firstName} ${user.lastName}` || "User"}
              </p>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: 12,
                  color: COLORS.textMuted,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user.role || "Owner"}
              </p>
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: 11,
                  color: COLORS.textMuted,
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
    </aside>
  );
}
