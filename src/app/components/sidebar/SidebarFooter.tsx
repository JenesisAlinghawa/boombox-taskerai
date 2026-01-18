"use client";

import React, { useEffect, useState, useRef } from "react";
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
  const loadedRef = useRef(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await getCurrentUser();
        if (userData) {
          setUser(userData);
          loadedRef.current = true;
        }
      } catch (e) {
        console.error("Failed to load user data", e);
      }
    };

    loadUser();

    // Listen for storage changes (when profile is updated in another tab or same tab)
    const handleStorageChange = () => {
      loadUser();
    };

    window.addEventListener("storage", handleStorageChange);

    // Also listen for custom event when profile is updated
    const handleProfileUpdate = () => {
      loadUser();
    };

    window.addEventListener("profileUpdated", handleProfileUpdate);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("profileUpdated", handleProfileUpdate);
    };
  }, []);

  return (
    <div
      style={{
        padding: collapsed ? "12px" : "12px 16px",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        display: "flex",
        flexDirection: "column",
        alignItems: collapsed ? "center" : "flex-start",
        gap: 4,
      }}
    >
      {user && (
        <>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "#798CC3",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              flexShrink: 0,
              overflow: "hidden",
            }}
          >
            {user.profilePicture ? (
              <img
                src={user.profilePicture}
                alt={`${user.firstName} ${user.lastName}`}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              `${user.firstName[0]}${user.lastName[0]}`
            )}
          </div>
          <p style={{ margin: 0, fontWeight: 500, fontSize: collapsed ? 12 : 14, textAlign: collapsed ? "center" : "left" }}>
            {`${user.firstName} ${user.lastName} (${user.role?.charAt(0).toUpperCase() + (user.role?.slice(1) || 'User')})`}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: collapsed ? 10 : 12,
              opacity: 0.7,
              textAlign: collapsed ? "center" : "left",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "100%",
            }}
          >
            {user.email}
          </p>
        </>
      )}
    </div>
  );
}