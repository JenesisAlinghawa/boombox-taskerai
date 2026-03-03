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
      className={`relative border-t border-white/25 flex items-center gap-3 ${
        collapsed ? "flex-col p-3" : "flex-row px-4 py-3"
      }`}
    >
      {/* Avatar */}
      <div
        onClick={() => collapsed && setShowProfile((v) => !v)}
        className={`w-12 h-12 rounded-full bg-blue-400 flex items-center justify-center text-base overflow-hidden flex-shrink-0 ${
          collapsed ? "cursor-pointer" : "cursor-default"
        }`}
      >
        {user.profilePicture ? (
          <img
            src={user.profilePicture}
            alt={`${user.firstName} ${user.lastName}`}
            className="w-full h-full object-cover"
          />
        ) : (
          `${user.firstName[0]}${user.lastName[0]}`
        )}
      </div>

      {/* Show text ONLY when sidebar is open */}
      {!collapsed && (
        <div className="flex flex-col">
          <p className="m-0 font-light text-xs">
            {user.firstName} {user.lastName} (
            {user.role?.charAt(0).toUpperCase() +
              (user.role?.slice(1) || "User")}
            )
          </p>
          <p className="m-0 text-[8px] opacity-70">{user.email}</p>
        </div>
      )}

      {/* Collapsed popup */}
      {collapsed && showProfile && (
        <div className="absolute bottom-[48px] left-1/2 -translate-x-1/2 bg-slate-800 px-3 py-2.5 rounded-lg shadow-lg min-w-[180px] text-center z-50" />
      )}
    </div>
  );
}
