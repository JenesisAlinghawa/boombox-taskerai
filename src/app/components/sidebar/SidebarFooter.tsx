"use client";

import React, { useEffect, useState } from "react";
import { getCurrentUser } from "@/utils/sessionManager";

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
  profilePicture?: string;
}

interface SidebarFooterProps {
  collapsed: boolean;
}

export function SidebarFooter({ collapsed }: SidebarFooterProps) {
  const [user, setUser] = useState<User | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await getCurrentUser();
        if (userData) setUser(userData);
      } catch (e) {
        console.error("Failed to load user data", e);
      }
    };

    loadUser();

    const handleProfileUpdate = () => loadUser();
    window.addEventListener("profileUpdated", handleProfileUpdate);

    return () => {
      window.removeEventListener("profileUpdated", handleProfileUpdate);
    };
  }, []);

  if (!user) return null;

  return (
    <div
      style={{
        position: "relative",
        padding: collapsed ? "12px" : "12px 16px",
        borderTop: "1px solid rgba(255,255,255,0.25)",
        display: "flex",
        flexDirection: collapsed ? "column" : "row", // <-- IMPORTANT
        alignItems: "center",
        gap: 12,
      }}
    >
      {/* Avatar */}
      <div
        onClick={() => collapsed && setShowProfile((v) => !v)}
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "#798CC3",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          cursor: collapsed ? "pointer" : "default",
          overflow: "hidden",
        }}
      >
        {user.profilePicture ? (
          <img
            src={user.profilePicture}
            alt={`${user.firstName} ${user.lastName}`}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          `${user.firstName[0]}${user.lastName[0]}`
        )}
      </div>

      {/* Show text ONLY when sidebar is open */}
      {!collapsed && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <p style={{ margin: 0, fontWeight: 200, fontSize: 11 }}>
            {user.firstName} {user.lastName} (
            {user.role?.charAt(0).toUpperCase() + (user.role?.slice(1) || "User")}
            )
          </p>
          <p style={{ margin: 0, fontSize: 8, opacity: 0.7 }}>
            {user.email}
          </p>
        </div>
      )}

      {/* Collapsed popup */}
      {collapsed && showProfile && (
        <div
          style={{
            position: "absolute",
            bottom: 48,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1f2437",
            padding: "10px 12px",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            minWidth: 180,
            textAlign: "center",
            zIndex: 100,
          }}
        ></div>
      )}
    </div>
  );
}
