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
  AlignCenter,
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

        const res = await fetch(`/api/direct-messages/users?userId=${user.id}`);
        const data = await res.json();
        const users = Array.isArray(data?.users) ? data.users : [];
        const totalUnread = users.reduce(
          (sum: number, u: any) => sum + (u.unreadCount || 0),
          0,
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
    padding: "10px 16px 10px 16px",
    borderColor: active ? "rgba(225,225,225,0.65)" : "transparent",
    color: "#ffffff",
    borderWidth: 1,
    borderRadius: 32,
    display: "flex",
    alignItems: "center",
    gap: 12,
    fontSize: 12,
    fontWeight: 200,
    cursor: "pointer",
    transition: "all 0.2s",
    position: "relative",
    overflow: "hidden",
  });

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      }}
    >
      <nav
        style={{
          padding: "12px 0",
          display: "flex",
          flexDirection: "column",
          gap: 8,
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
              style={{
                textDecoration: "none",
                width: "85%",
                margin: "0 auto",
                display: "block",
              }}
            >
              <button
                style={buttonStyle(active)}
                title={collapsed ? item.label : undefined}
              >
                {active && (
                  <div
                    style={{
                      position: "absolute",
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: 3,
                    }}
                  />
                )}
                <div
                  style={{
                    width: 20,
                    display: "flex",
                    justifyContent: "flex-start",
                  }}
                >
                  <Icon size={20} strokeWidth={1.5} />
                </div>
                {!collapsed && <span>{item.label}</span>}

                {isMessages && unreadMessages > 0 && (
                  <div
                    style={{
                      marginLeft: "auto",
                      minWidth: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: "#ef4444",
                      border: "2px solid rgba(0, 68, 255, 0.23)",
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 4px",
                    }}
                  >
                    {unreadMessages > 99 ? "99+" : unreadMessages}
                  </div>
                )}
              </button>
            </Link>
          );
        })}
      </nav>

      <div
        style={{
          margin: "0 16px",
          borderTop: "1px solid rgba(255,255,255,0.25)",
        }}
      />

      <nav
        style={{
          padding: "12px 0",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {otherMenuItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              style={{
                textDecoration: "none",
                width: "80%",
                margin: "0 auto",
                display: "block",
              }}
            >
              <button
                style={buttonStyle(active)}
                title={collapsed ? item.label : undefined}
              >
                {active && (
                  <div
                    style={{
                      position: "absolute",
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: 3,
                    }}
                  />
                )}
                <div
                  style={{
                    width: 20,
                    display: "flex",
                    justifyContent: "flex-start",
                  }}
                >
                  <Icon size={20} strokeWidth={1.5} />
                </div>
                {!collapsed && <span>{item.label}</span>}
              </button>
            </Link>
          );
        })}
      </nav>

      <div style={{ flex: 1 }} />
    </div>
  );
}
