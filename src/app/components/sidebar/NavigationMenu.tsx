"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getCurrentUser } from "@/utils/sessionManager";

interface NavigationMenuProps {
  collapsed: boolean;
}

const mainMenuItems = [
  { iconFile: "dashboard-icon.png", label: "Dashboard", href: "/dashboard" },
  {
    iconFile: "notification-icon.png",
    label: "Notifications",
    href: "/notifications",
  },
  { iconFile: "task-icon.png", label: "Tasks", href: "/tasks" },
  { iconFile: "messages-icon.png", label: "Messages", href: "/messages" },
];

const otherMenuItems = [
  { iconFile: "analytics-icon.png", label: "Analytics", href: "/analytics" },
  { iconFile: "logs-icon.png", label: "Logs", href: "/logs" },
  { iconFile: "settings-icon.png", label: "Settings", href: "/settings" },
];

export function NavigationMenu({ collapsed }: NavigationMenuProps) {
  const pathname = usePathname() || "";
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);

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
          0
        );
        setUnreadMessages(totalUnread);
      } catch {
        // ignore fetch errors
      }
    };

    fetchUnreadMessages();
    const id = setInterval(fetchUnreadMessages, 3000);
    return () => clearInterval(id);
  }, []);

  // Real-time updates via EventSource for notifications and messages
  useEffect(() => {
    if (!currentUser?.id) return;
    const es = new EventSource(`/api/subscribe?userId=${currentUser.id}`);

    const onNotification = () => {
      // Notifications are handled separately on the notifications page
    };

    const onDirectMessage = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        const payload = data;
        if (payload && payload.message) {
          // Increment unread message indicator
          setUnreadMessages((prev) => prev + 1);
        }
      } catch (err) {
        // ignore
      }
    };

    es.addEventListener("notification", onNotification as EventListener);
    es.addEventListener("direct_message", onDirectMessage as EventListener);

    return () => {
      es.close();
    };
  }, [currentUser]);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Single Search Bar */}
      <div
        style={{
          padding: "8px 12px",
          marginBottom: 8,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(255,255,255,0.08)",
            borderRadius: 6,
            padding: "6px 10px",
            border: "1px solid rgba(255,255,255,0.1)",
            width: "100%",
          }}
        >
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
            🔍
          </span>
          <input
            type="text"
            placeholder="Search.."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              color: "#ffffff",
              fontSize: 12,
              outline: "none",
              fontFamily: "Inter, system-ui, -apple-system, sans-serif",
            }}
          />
        </div>
      </div>

      {/* Divider */}
      <div
        style={{
          margin: "0 12px 12px",
          borderTop: "1px solid rgba(255,255,255,0.1)",
        }}
      />

      {/* Main Menu Items */}
      <nav
        style={{
          padding: "0 12px",
          display: "flex",
          flexDirection: "column",
          gap: 0,
        }}
      >
        {mainMenuItems.map((item) => {
          let active = false;
          if (item.href === "/dashboard") {
            active = pathname === "/dashboard";
          } else {
            active =
              pathname === item.href || pathname.startsWith(item.href + "/");
          }
          const isMessages = item.href === "/messages";

          return (
            <Link
              href={item.href}
              key={item.label}
              style={{ textDecoration: "none" }}
            >
              <button
                style={{
                  width: "100%",
                  padding: collapsed ? "10px" : "10px 12px",
                  background: active
                    ? "linear-gradient(90deg, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0.25) 100%)"
                    : "transparent",
                  color: active ? "#a0d8ef" : "#ffffff",
                  border: "none",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: collapsed ? "center" : "flex-start",
                  gap: collapsed ? 0 : 12,
                  fontSize: 12,
                  fontWeight: active ? 600 : 500,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  position: "relative",
                  overflow: "hidden",
                  fontFamily: "Inter, system-ui, -apple-system, sans-serif",
                }}
              >
                {active && (
                  <div
                    style={{
                      position: "absolute",
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: 3,
                      background:
                        "linear-gradient(180deg, rgba(59,130,246,0.8) 0%, rgba(107,114,128,0.4) 100%)",
                    }}
                  />
                )}
                <img
                  src={`/assets/images/${item.iconFile}`}
                  alt={item.label}
                  style={{ width: 20, height: 20, objectFit: "contain" }}
                />
                {!collapsed && <span>{item.label}</span>}
                {isMessages && unreadMessages > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
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

      {/* Divider */}
      <div
        style={{
          margin: "12px 12px 0",
          borderTop: "1px solid rgba(255,255,255,0.1)",
        }}
      />

      {/* Other Section */}
      <div style={{ padding: "12px 12px 0" }}>
        <h3
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.5)",
            margin: "8px 0 12px",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            fontFamily: "Inter, system-ui, -apple-system, sans-serif",
          }}
        >
          OTHER
        </h3>
        <nav style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {otherMenuItems.map((item) => {
            let active = false;
            if (item.href === "/dashboard") {
              active = pathname === "/dashboard";
            } else {
              active =
                pathname === item.href || pathname.startsWith(item.href + "/");
            }

            return (
              <Link
                href={item.href}
                key={item.label}
                style={{ textDecoration: "none" }}
              >
                <button
                  style={{
                    width: "100%",
                    padding: collapsed ? "10px" : "10px 12px",
                    background: active
                      ? "linear-gradient(90deg, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0.25) 100%)"
                      : "transparent",
                    color: active ? "#a0d8ef" : "#ffffff",
                    border: "none",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: collapsed ? "center" : "flex-start",
                    gap: collapsed ? 0 : 12,
                    fontSize: 12,
                    fontWeight: active ? 600 : 500,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    position: "relative",
                    overflow: "hidden",
                    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
                  }}
                >
                  {active && (
                    <div
                      style={{
                        position: "absolute",
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: 3,
                        background:
                          "linear-gradient(180deg, rgba(59,130,246,0.8) 0%, rgba(107,114,128,0.4) 100%)",
                      }}
                    />
                  )}
                  <img
                    src={`/assets/images/${item.iconFile}`}
                    alt={item.label}
                    style={{ width: 20, height: 20, objectFit: "contain" }}
                  />
                  {!collapsed && <span>{item.label}</span>}
                </button>
              </Link>
            );
          })}

          {/* Role-Based: Team Management - Only visible to OWNER, CO_OWNER, MANAGER */}
          {currentUser &&
            ["OWNER", "CO_OWNER", "MANAGER"].includes(currentUser.role) && (
              <Link href="/settings/team" style={{ textDecoration: "none" }}>
                <button
                  style={{
                    width: "100%",
                    padding: collapsed ? "10px" : "10px 12px",
                    background:
                      pathname === "/settings/team"
                        ? "linear-gradient(90deg, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0.25) 100%)"
                        : "transparent",
                    color:
                      pathname === "/settings/team" ? "#a0d8ef" : "#ffffff",
                    border: "none",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: collapsed ? "center" : "flex-start",
                    gap: collapsed ? 0 : 12,
                    fontSize: 12,
                    fontWeight: pathname === "/settings/team" ? 600 : 500,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    position: "relative",
                    overflow: "hidden",
                    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
                    marginTop: "8px",
                  }}
                  title="Team Management (Admin Only)"
                >
                  {pathname === "/settings/team" && (
                    <div
                      style={{
                        position: "absolute",
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: 3,
                        background:
                          "linear-gradient(180deg, rgba(59,130,246,0.8) 0%, rgba(107,114,128,0.4) 100%)",
                      }}
                    />
                  )}
                  <span style={{ fontSize: "16px" }}>👥</span>
                  {!collapsed && <span>Team Management</span>}
                </button>
              </Link>
            )}
        </nav>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />
    </div>
  );
}
