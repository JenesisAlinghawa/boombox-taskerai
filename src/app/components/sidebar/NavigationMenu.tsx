"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getCurrentUser } from "@/utils/sessionManager";
import type { User } from "@/utils/sessionManager";
import {
  LayoutDashboard,
  ClipboardList,
  MessageCircle,
  Bell,
  BarChart2,
  FileText,
  Settings,
} from "lucide-react";

interface NavigationMenuProps {
  collapsed: boolean;
}

const mainMenuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: ClipboardList, label: "Tasks", href: "/tasks" },
  { icon: MessageCircle, label: "Messages", href: "/messages" },
  { icon: Bell, label: "Notifications", href: "/notifications" },
];

const otherMenuItems = [
  { icon: BarChart2, label: "Analytics", href: "/analytics" },
  { icon: FileText, label: "Logs", href: "/logs" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export function NavigationMenu({ collapsed }: NavigationMenuProps) {
  const pathname = usePathname() || "";
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
      } catch (e) {
        console.error("Failed to load user", e);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    const fetchUnreadMessages = async () => {
      try {
        const user = await getCurrentUser();
        if (!user?.id) return;

        const res = await fetch(
          `/api/direct-messages/users?userId=${user.id}`
        );
        const data = await res.json();
        const users = Array.isArray(data?.users) ? data.users : [];
        const totalUnread = users.reduce(
          (sum: number, u: any) => sum + (u.unreadCount || 0),
          0
        );
        setUnreadMessages(totalUnread);
      } catch {}
    };

    fetchUnreadMessages();
    const id = setInterval(fetchUnreadMessages, 3000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;
    const es = new EventSource(`/api/subscribe?userId=${currentUser.id}`);

    const onDirectMessage = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data?.message) {
          setUnreadMessages((prev) => prev + 1);
        }
      } catch {}
    };

    es.addEventListener("direct_message", onDirectMessage as EventListener);
    return () => es.close();
  }, [currentUser]);

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/");

  const buttonStyle = (active: boolean): React.CSSProperties => ({
    width: "100%",
    padding: "10px",
    background: active ? "rgba(59,130,246,0.15)" : "transparent",
    color: active ? "#a0d8ef" : "#ffffff",
    border: "none",
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: collapsed ? "center" : "flex-start",
    fontSize: 12,
    cursor: "pointer",
    transition: "background-color 0.2s, color 0.2s",
    position: "relative",
    overflow: "hidden",
    gap: collapsed ? 0 : 12,
  });

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        fontFamily: "Inria-sans system-ui, -apple-system, sans-serif",
      }}
    >
      <nav
        style={{
          padding: collapsed ? "12px" : "12px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          alignItems: collapsed ? "center" : "flex-start",
        }}
      >
        {mainMenuItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          const isMessages = item.href === "/messages";

          return (
            <Link
              key={item.label}
              href={item.href}
              style={{ textDecoration: "none", width: "100%" }}
            >
              <button
                style={buttonStyle(active)}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={20} strokeWidth={1.5} />
                {!collapsed && item.label}

                {isMessages && unreadMessages > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: 4,
                      right: collapsed ? 4 : 12,
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: "#ef4444",
                      border: "2px solid #42527F",
                    }}
                  />
                )}
              </button>
            </Link>
          );
        })}
      </nav>

      <div
        style={{
          margin: collapsed ? "0 12px" : "0 16px",
          borderTop: "1px solid rgba(255,255,255,0.1)",
        }}
      />

      <nav
        style={{
          padding: collapsed ? "12px" : "12px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          alignItems: collapsed ? "center" : "flex-start",
        }}
      >
        {otherMenuItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              style={{ textDecoration: "none", width: "100%" }}
            >
              <button
                style={buttonStyle(active)}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={20} strokeWidth={1.5} />
                {!collapsed && item.label}
              </button>
            </Link>
          );
        })}
      </nav>

      <div style={{ flex: 1 }} />
    </div>
  );
}
