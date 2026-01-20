"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/utils/sessionManager";
import { useAuthProtection } from "@/app/hooks/useAuthProtection";
import { PageContainer } from "@/app/components/PageContainer";
import { PageContentCon } from "@/app/components/PageContentCon";

interface Notification {
  id: number;
  userId: number;
  type: string; // 'task_assigned', 'channel_added', 'welcome', 'task_deadline', etc.
  title: string;
  message: string;
  relatedId?: number; // taskId, channelId, etc.
  relatedType?: string; // 'task', 'channel', etc.
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  useAuthProtection(); // Protect this route
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`/api/notifications?userId=${currentUser?.id}`);
      const data = await res.json();
      const items = Array.isArray(data?.notifications)
        ? data.notifications
        : [];
      setNotifications(items);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser?.id) return;
    fetchNotifications();

    // Poll for updates
    const interval = setInterval(() => fetchNotifications(), 3000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  const handleDelete = async (notificationId: number) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, { method: "DELETE" });
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Mark as read
      if (!notification.isRead) {
        await fetch(`/api/notifications/${notification.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isRead: true }),
        });
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, isRead: true } : n,
          ),
        );
      }

      // Navigate based on notification type
      if (notification.type === "new_user_registration") {
        router.push("/settings?tab=team");
      } else if (
        notification.relatedType === "task" &&
        notification.relatedId
      ) {
        router.push(`/dashboard/tasks`);
      } else if (
        notification.relatedType === "channel" &&
        notification.relatedId
      ) {
        router.push(`/dashboard/messages`);
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Failed to handle notification click:", err);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "task_assigned":
        return "📋";
      case "channel_added":
        return "👥";
      case "welcome":
        return "🎉";
      case "task_deadline":
        return "⏰";
      case "new_user_registration":
        return "👤";
      default:
        return "📢";
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "task_assigned":
        return "#3b82f6"; // blue
      case "channel_added":
        return "#10b981"; // green
      case "welcome":
        return "#f59e0b"; // amber
      case "task_deadline":
        return "#ef4444"; // red
      case "new_user_registration":
        return "#8b5cf6"; // purple
      default:
        return "#6366f1"; // indigo
    }
  };

  return (
    <PageContainer title="NOTIFICATIONS">
      {loading ? (
        <div style={{ color: "#333", textAlign: "center", padding: "40px" }}>
          Loading notifications...
        </div>
      ) : notifications.length === 0 ? (
        <div
          style={{
            background: "#F9FAFD",
            border: "1px solid rgba(0,0,0,0.1)",
            filter: "drop-shadow(2px 2px 5px rgba(211, 212, 214, 0.5))",
            borderRadius: "12px",
            padding: "40px",
            textAlign: "center",
            color: "#a0aec0",
          }}
        >
          No notifications yet
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {notifications.map((notification) => (
            <div
              key={notification.id}
              style={{
                background: "#F9FAFD",
                border: `1px solid ${
                  notification.isRead
                    ? "rgba(0,0,0,0.1)"
                    : "rgba(239, 68, 68, 0.3)"
                }`,
                filter: "drop-shadow(2px 2px 5px rgba(211, 212, 214, 0.5))",
                borderRadius: "12px",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                gap: "16px",
                cursor: "pointer",
                transition: "all 0.2s",
                opacity: notification.isRead ? 0.8 : 1,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "rgba(249, 250, 253, 0.8)";
                (e.currentTarget as HTMLElement).style.borderColor =
                  "rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#F9FAFD";
                (e.currentTarget as HTMLElement).style.borderColor =
                  notification.isRead
                    ? "rgba(0,0,0,0.1)"
                    : "rgba(239, 68, 68, 0.3)";
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "8px",
                  background: getNotificationColor(notification.type),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                  flexShrink: 0,
                }}
              >
                {getNotificationIcon(notification.type)}
              </div>

              {/* Content */}
              <div
                style={{
                  flex: 1,
                  cursor: "pointer",
                  minWidth: 0,
                }}
                onClick={() => handleNotificationClick(notification)}
              >
                <h3
                  style={{
                    color: "#333",
                    fontSize: "14px",
                    fontWeight: 600,
                    margin: "0 0 4px 0",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {notification.title}
                </h3>
                <p
                  style={{
                    color: "#666",
                    fontSize: "13px",
                    margin: "0 0 4px 0",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {notification.message}
                </p>
                <p
                  style={{
                    color: "#a0aec0",
                    fontSize: "12px",
                    margin: 0,
                  }}
                >
                  {new Date(notification.createdAt).toLocaleString()}
                </p>
              </div>

              {/* Unread indicator */}
              {!notification.isRead && (
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#ef4444",
                    flexShrink: 0,
                  }}
                />
              )}

              {/* Action buttons */}
              {notification.type === "new_user_registration" ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(notification.id);
                  }}
                  style={{
                    background: "rgba(100, 116, 139, 0.2)",
                    color: "#64748b",
                    border: "1px solid rgba(100, 116, 139, 0.3)",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "rgba(100, 116, 139, 0.3)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "rgba(100, 116, 139, 0.2)";
                  }}
                >
                  Dismiss
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(notification.id);
                  }}
                  style={{
                    background: "rgba(239, 68, 68, 0.2)",
                    color: "#ef4444",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "rgba(239, 68, 68, 0.3)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "rgba(239, 68, 68, 0.2)";
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
