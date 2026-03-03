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

// Global unread messages store
let globalUnreadCount = 0;
let globalSetUnreadMessages: ((count: number) => void) | null = null;

export function clearUnreadMessages() {
  if (globalSetUnreadMessages) {
    globalSetUnreadMessages(0);
  }
}

export function getUnreadMessagesCount() {
  return globalUnreadCount;
}

export function NavigationMenu({ collapsed }: NavigationMenuProps) {
  const pathname = usePathname() || "";
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
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
    globalSetUnreadMessages = setUnreadMessages;
    return () => {
      globalSetUnreadMessages = null;
    };
  }, []);

  useEffect(() => {
    const fetchUnreadMessages = async () => {
      try {
        const user = await getCurrentUser();
        if (!user?.id) return;

        const res = await fetch(`/api/direct-messages/users?userId=${user.id}`);
        const data = await res.json();
        console.log("[UnreadMessages] API Response:", data);
        const users = Array.isArray(data?.users) ? data.users : [];
        const totalUnread = users.reduce(
          (sum: number, u: any) => sum + (u.unreadCount || 0),
          0,
        );
        console.log("[UnreadMessages] Total unread:", totalUnread);
        globalUnreadCount = totalUnread;
        setUnreadMessages(totalUnread);
      } catch (error) {
        console.error("[UnreadMessages] Fetch error:", error);
      }
    };

    fetchUnreadMessages();
    const id = setInterval(fetchUnreadMessages, 3000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const fetchUnreadNotifications = async () => {
      try {
        const user = await getCurrentUser();
        if (!user?.id) return;
        const res = await fetch(`/api/notifications?userId=${user.id}`);
        const data = await res.json();
        const items = Array.isArray(data?.notifications)
          ? data.notifications
          : [];
        const unread = items.filter((n: any) => !n.isRead).length;
        setUnreadNotifications(unread);
      } catch (e) {
        console.error("[Notifications] Fetch error:", e);
      }
    };
    fetchUnreadNotifications();
    const nid = setInterval(fetchUnreadNotifications, 5000);
    return () => clearInterval(nid);
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;
    console.log(
      "[UnreadMessages] Setting up EventSource for userId:",
      currentUser.id,
    );
    const es = new EventSource(`/api/subscribe?userId=${currentUser.id}`);

    const onDirectMessage = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        console.log("[UnreadMessages] New message event:", data);
        if (data?.message) {
          globalUnreadCount += 1;
          setUnreadMessages((prev) => prev + 1);
        }
      } catch (error) {
        console.error("[UnreadMessages] Event parse error:", error);
      }
    };

    const onNotification = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        console.log("[Notifications] New notification event:", data);
        setUnreadNotifications((prev) => prev + 1);
      } catch (error) {
        console.error("[Notifications] Event parse error:", error);
      }
    };

    es.addEventListener("direct_message", onDirectMessage as EventListener);
    es.addEventListener("notification", onNotification as EventListener);
    return () => es.close();
  }, [currentUser]);

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/");

  const buttonStyle = (active: boolean): string =>
    `w-full px-4 py-2.5 flex items-center gap-2.5 text-sm font-light cursor-pointer relative overflow-hidden rounded-full border border-transparent text-white transition-shadow duration-700 ease-out ${
      active ? "shadow-[1px_1px_6px_rgba(250,250,250,0.30)]" : "shadow-none"
    }`;

  return (
    <div className="flex-1 flex flex-col font-inter">
      {/* Main Menu */}
      <nav className="p-3 flex flex-col gap-2">
        {mainMenuItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          const isMessages = item.href === "/messages";
          if (isMessages) {
            console.log(
              "[UnreadMessages] Rendering Messages item - unreadMessages:",
              unreadMessages,
              "shouldShowBadge:",
              isMessages && unreadMessages > 0,
            );
          }
          return (
            <Link
              key={item.label}
              href={item.href}
              className="no-underline w-[85%] mx-auto block"
            >
              <button
                className={buttonStyle(active)}
                title={collapsed ? item.label : undefined}
              >
                {active && (
                  <div className="absolute right-0 top-0 bottom-0 w-0.5" />
                )}
                <div className="w-5 flex justify-start relative">
                  <Icon size={20} strokeWidth={1.5} />
                  {/* Unread message badge - positioned at bottom-right of icon */}
                  {isMessages && unreadMessages > 0 && (
                    <div className="absolute -bottom-1.5 -right-1.5 min-w-[14px] h-3.5 rounded-full bg-red-500 border-2 border-blue-500/25 text-white text-[9px] font-bold flex items-center justify-center">
                      {unreadMessages > 99 ? "99+" : unreadMessages}
                    </div>
                  )}
                </div>
                {!collapsed && <span>{item.label}</span>}
              </button>
            </Link>
          );
        })}
      </nav>

      {/* Separator */}
      <div className="mx-4 border-t border-white/25" />

      {/* Other Menu */}
      <nav className="p-3 flex flex-col gap-2">
        {otherMenuItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className="no-underline w-[80%] mx-auto block"
            >
              <button
                className={buttonStyle(active)}
                title={collapsed ? item.label : undefined}
              >
                {active && (
                  <div className="absolute right-0 top-0 bottom-0 w-0.5" />
                )}
                <div className="w-5 flex justify-start">
                  <Icon size={20} strokeWidth={1.5} />
                </div>
                {!collapsed && <span>{item.label}</span>}
              </button>
            </Link>
          );
        })}
      </nav>

      {/* Flex spacer */}
      <div className="flex-1" />
    </div>
  );
}
