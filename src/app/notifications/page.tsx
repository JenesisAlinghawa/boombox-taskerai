"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/utils/sessionManager";
import { useAuthProtection } from "@/app/hooks/useAuthProtection";
import { PageContainer } from "@/app/components/page-layouts/MainPageContainerLayoutComponent";
import {
  ChevronDown,
  X,
  Bell,
  CheckSquare,
  ListTodo,
  AlertCircle,
  Clock,
  MessageCircle,
  Users,
  Gift,
  UserPlus,
} from "lucide-react";

interface Notification {
  id: number;
  userId: string;
  type: string;
  title: string;
  message: string;
  relatedId?: number;
  relatedType?: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  useAuthProtection();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<{
    [key: string]: boolean;
  }>({});
  const [expandedMessages, setExpandedMessages] = useState<{
    [key: number]: boolean;
  }>({});

  useEffect(() => {
    const loadUser = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const fetchNotifications = async () => {
    if (currentUser?.messageNotifications === false) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `/api/notification-handlers?userId=${currentUser?.id}`,
      );
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

    const interval = setInterval(() => fetchNotifications(), 3000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  // Group notifications: messages separate, others by type
  const groupedNotifications = useMemo(() => {
    const groups: { [key: string]: Notification[] } = {};

    notifications.forEach((notif) => {
      if (notif.relatedType === "message" || notif.type.includes("message")) {
        const key = "messages";
        if (!groups[key]) groups[key] = [];
        groups[key].push(notif);
      } else {
        const key = notif.type;
        if (!groups[key]) groups[key] = [];
        groups[key].push(notif);
      }
    });

    // Sort messages by most recent and group others
    Object.keys(groups).forEach((key) => {
      groups[key].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    });

    return groups;
  }, [notifications]);

  const handleDelete = async (notificationId: number) => {
    try {
      await fetch(`/api/notification-handlers/${notificationId}`, {
        method: "DELETE",
      });
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    try {
      if (!notification.isRead) {
        await fetch(`/api/notification-handlers/${notification.id}`, {
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

      if (notification.type === "new_user_registration") {
        router.push("/settings?tab=team");
      } else if (
        notification.relatedType === "task" &&
        notification.relatedId
      ) {
        router.push(`/tasks?focus=${notification.relatedId}`);
      } else if (
        notification.relatedType === "channel" &&
        notification.relatedId
      ) {
        router.push(`/messages`);
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Failed to handle notification click:", err);
    }
  };

  const getNotificationIcon = (type: string) => {
    if (type === "task_assigned") return ListTodo;
    if (type === "task_overdue") return AlertCircle;
    if (type === "task_deadline_approaching") return Clock;
    if (type.includes("task")) return CheckSquare;
    if (type.includes("message") || type === "new_message")
      return MessageCircle;
    if (type === "channel_added") return Users;
    if (type === "welcome") return Gift;
    if (type === "new_user_registration") return UserPlus;
    return Bell;
  };

  const getNotificationColor = (type: string) => {
    if (type.includes("task") || type === "task_assigned") {
      return "#3b82f6";
    } else if (
      type === "task_overdue" ||
      type === "task_deadline_approaching"
    ) {
      return "#ef4444";
    } else if (type.includes("message") || type === "new_message") {
      return "#06b6d4";
    } else if (type === "channel_added") {
      return "#10b981";
    } else if (type === "welcome") {
      return "#f59e0b";
    } else if (type === "new_user_registration") {
      return "#8b5cf6";
    }
    return "#6366f1";
  };

  const getGroupTitle = (key: string) => {
    if (key === "messages") return "Messages";
    if (key === "task_assigned") return "Task Assignments";
    if (key === "task_overdue") return "Overdue Tasks";
    if (key === "task_deadline_approaching") return "Approaching Deadlines";
    if (key === "channel_added") return "Channel Updates";
    if (key === "new_user_registration") return "New Users";
    return key
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const isLongText = (text: string, maxLength: number = 120) => {
    return text.length > maxLength;
  };

  const getRelativeTime = (createdAt: string) => {
    const date = new Date(createdAt);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) {
      const unit = seconds === 1 ? "second" : "seconds";
      return `${seconds} ${unit} ago`;
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      const unit = minutes === 1 ? "minute" : "minutes";
      return `${minutes} ${unit} ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      const unit = hours === 1 ? "hour" : "hours";
      return `${hours} ${unit} ago`;
    }

    const days = Math.floor(hours / 24);
    if (days < 7) {
      const unit = days === 1 ? "day" : "days";
      return `${days} ${unit} ago`;
    }

    const weeks = Math.floor(days / 7);
    if (weeks < 4) {
      const unit = weeks === 1 ? "week" : "weeks";
      return `${weeks} ${unit} ago`;
    }

    const months = Math.floor(days / 30);
    if (months < 12) {
      const unit = months === 1 ? "month" : "months";
      return `${months} ${unit} ago`;
    }

    const years = Math.floor(days / 365);
    const unit = years === 1 ? "year" : "years";
    return `${years} ${unit} ago`;
  };

  return (
    <PageContainer title="Notifications">
      {currentUser?.messageNotifications === false && (
        <div className="p-4 mb-2 bg-yellow-100/50 border border-yellow-400/30 rounded-sm text-yellow-800 text-center backdrop-blur-sm">
          You have <strong>disabled in‑app notifications</strong> in your
          settings. Turn them back on to see alerts.
        </div>
      )}

      {loading ? (
        <div className="text-black/60 text-center py-10">
          Loading notifications...
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-blue-100 backdrop-blur-lg border border-black/10 rounded-sm shadow-lg p-10 text-center text-black/60 transition-all duration-200 hover:border-black/50 hover:shadow-2xl">
          <Bell size={32} className="mx-auto mb-2 text-black/40" />
          <p>No notifications yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {Object.entries(groupedNotifications).map(
            ([groupKey, groupNotifs]) => {
              // If only 1 notification in group, render without grouping
              if (groupNotifs.length === 1) {
                const notification = groupNotifs[0];
                const isExpanded = expandedMessages[notification.id];
                const isTooLong = isLongText(notification.message, 120);
                const displayMessage = isExpanded
                  ? notification.message
                  : notification.message.slice(0, 120);

                return (
                  <div key={notification.id}>
                    <div
                      className={`flex items-start gap-1 p-1 rounded-sm border transition-all duration-150 bg-blue-100/80 backdrop-blur-md ${
                        notification.isRead
                          ? "border-black/10 opacity-75 hover:opacity-90"
                          : "border-black/20 bg-blue-100 shadow-md"
                      } hover:border-black/50 hover:shadow-lg cursor-pointer`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      {/* Icon */}
                      <div
                        className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center"
                        style={{
                          background: getNotificationColor(notification.type),
                        }}
                      >
                        {React.createElement(
                          getNotificationIcon(notification.type),
                          {
                            size: 14,
                            color: "white",
                          },
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-black/90 text-[10px] font-normal truncate">
                          {notification.title}
                        </h3>
                        <p className="text-black/80 text-xs mt-0 break-words">
                          {displayMessage}
                          {isTooLong && !isExpanded && "..."}
                        </p>
                        {isTooLong && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedMessages((prev) => ({
                                ...prev,
                                [notification.id]: !prev[notification.id],
                              }));
                            }}
                            className="mt-0.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                          >
                            {isExpanded ? "Show less" : "Show more"}
                          </button>
                        )}
                        <p className="text-black/65 text-[10px] mt-0.5">
                          {getRelativeTime(notification.createdAt)}
                        </p>
                      </div>

                      {/* Unread Indicator */}
                      {!notification.isRead && (
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 mt-1" />
                      )}

                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(notification.id);
                        }}
                        className="ml-1 flex-shrink-0 p-0.5 text-black/60 hover:text-black hover:bg-black/10 rounded transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              }

              // If multiple notifications, render with group header
              return (
                <div key={groupKey}>
                  {/* Group Header */}
                  <button
                    onClick={() =>
                      setExpandedGroups((prev) => ({
                        ...prev,
                        [groupKey]: !prev[groupKey],
                      }))
                    }
                    className="w-full flex items-center gap-1 px-4 py-2 bg-blue-100 backdrop-blur-lg border border-black/10 rounded-sm shadow-lg text-black/80 text-sm font-semibold hover:border-black/50 hover:shadow-2xl transition-all duration-200 mb-0"
                  >
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-200 flex-shrink-0 ${
                        expandedGroups[groupKey] ? "rotate-180" : ""
                      }`}
                    />
                    <span>{getGroupTitle(groupKey)}</span>
                    <span className="ml-auto bg-black/10 px-2 py-0.5 rounded text-xs">
                      {groupNotifs.length}
                    </span>
                  </button>

                  {/* Group Items */}
                  {expandedGroups[groupKey] && (
                    <div className="flex flex-col gap-1 ml-1">
                      {groupNotifs.map((notification) => {
                        const isExpanded = expandedMessages[notification.id];
                        const isTooLong = isLongText(notification.message, 120);
                        const displayMessage = isExpanded
                          ? notification.message
                          : notification.message.slice(0, 120);

                        return (
                          <div
                            key={notification.id}
                            className={`flex items-start gap-1 p-2.5 rounded-sm border transition-all duration-150 bg-blue-100/80 backdrop-blur-md ${
                              notification.isRead
                                ? "border-black/10 opacity-75 hover:opacity-90"
                                : "border-black/20 bg-blue-100 shadow-md"
                            } hover:border-black/50 hover:shadow-lg cursor-pointer`}
                            onClick={() =>
                              handleNotificationClick(notification)
                            }
                          >
                            {/* Icon */}
                            <div
                              className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center"
                              style={{
                                background: getNotificationColor(
                                  notification.type,
                                ),
                              }}
                            >
                              {React.createElement(
                                getNotificationIcon(notification.type),
                                {
                                  size: 14,
                                  color: "white",
                                },
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <h3 className="text-black/90 text-[10px] font-normal truncate">
                                {notification.title}
                              </h3>
                              <p className="text-black/80 text-xs mt-0.5 break-words">
                                {displayMessage}
                                {isTooLong && !isExpanded && "..."}
                              </p>
                              {isTooLong && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedMessages((prev) => ({
                                      ...prev,
                                      [notification.id]: !prev[notification.id],
                                    }));
                                  }}
                                  className="mt-0.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                                >
                                  {isExpanded ? "Show less" : "Show more"}
                                </button>
                              )}
                              <p className="text-black/65 text-[10px] mt-0.5">
                                {getRelativeTime(notification.createdAt)}
                              </p>
                            </div>

                            {/* Unread Indicator */}
                            {!notification.isRead && (
                              <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 mt-1" />
                            )}

                            {/* Delete Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(notification.id);
                              }}
                              className="ml-1 flex-shrink-0 p-0.5 text-black/60 hover:text-black hover:bg-black/10 rounded transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            },
          )}
        </div>
      )}
    </PageContainer>
  );
}
