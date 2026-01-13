import React, { useEffect, useState } from "react";
import { getCurrentUser } from "@/utils/sessionManager";

interface User {
  id: number;
  name: string;
  email: string;
}

interface SidebarHeaderProps {
  collapsed: boolean;
  onCollapse: () => void;
}

export function SidebarHeader({ collapsed, onCollapse }: SidebarHeaderProps) {
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
    loadUser();
  }, []);

  return (
    <div
      style={{
        padding: "16px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        borderBottom: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div style={{ fontSize: 24 }}>✓</div>
        {!collapsed && (
          <h1
            style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#fff" }}
          >
            Taskerai
          </h1>
        )}
      </div>

      {/* User Profile */}
      {user && (
        <div
          style={{
            padding: "10px",
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
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "#798CC3",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            👤
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 12 }}>
              {user.name || "User"}
            </p>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: 10,
                opacity: 0.7,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user.email}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
