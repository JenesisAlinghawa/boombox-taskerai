"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getCurrentUser } from "@/utils/sessionManager";
import type { Employee } from "@/utils/sessionManager";
import {
  LayoutDashboard,
  ClipboardList,
  MessageCircle,
  BarChart2,
  FileText,
  AlignCenter,
} from "lucide-react";

interface NavigationMenuProps {
  collapsed: boolean;
}

const mainMenuItems = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    href: "/dashboard",
    animationClass: "animate-dashboard",
  },
  {
    icon: ClipboardList,
    label: "Tasks",
    href: "/tasks",
    animationClass: "animate-tasks",
  },
  {
    icon: MessageCircle,
    label: "Messages",
    href: "/messages",
    animationClass: "animate-messages",
  },
];

const otherMenuItems = [
  {
    icon: BarChart2,
    label: "Analytics",
    href: "/analytics",
    animationClass: "animate-analytics",
  },
  {
    icon: FileText,
    label: "Logs",
    href: "/logs",
    animationClass: "animate-logs",
  },
  // settings moved to profile dropdown
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
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [animatingIcon, setAnimatingIcon] = useState<string | null>(null);

  // Custom icon animations
  const iconAnimations = `
    @keyframes dashboardRotate {
      0% { transform: rotate(0deg) scale(1); }
      10% { transform: rotate(0deg) scale(0.95); }
      25% { transform: rotate(45deg) scale(0.95); }
      50% { transform: rotate(90deg) scale(1); }
      75% { transform: rotate(135deg) scale(0.95); }
      90% { transform: rotate(180deg) scale(0.95); }
      100% { transform: rotate(180deg) scale(1); }
    }
    @keyframes messagesType {
      0% { stroke-dasharray: 100; stroke-dashoffset: 100; opacity: 0.3; }
      15% { opacity: 0.6; stroke-dashoffset: 80; }
      40% { stroke-dashoffset: 20; opacity: 0.9; }
      65% { stroke-dashoffset: 0; opacity: 1; }
      85% { stroke-dashoffset: 0; opacity: 0.7; }
      100% { stroke-dasharray: 100; stroke-dashoffset: 100; opacity: 0.3; }
    }
    @keyframes analyticsBarsGrow {
      0% { transform: scaleY(0.2); opacity: 0.4; }
      30% { transform: scaleY(0.8); opacity: 0.9; }
      60% { transform: scaleY(1.05); opacity: 1; }
      85% { transform: scaleY(0.95); opacity: 0.8; }
      100% { transform: scaleY(0.2); opacity: 0.4; }
    }
    @keyframes logsType {
      0% { stroke-dasharray: 100; stroke-dashoffset: 100; opacity: 0.3; }
      15% { opacity: 0.6; stroke-dashoffset: 80; }
      40% { stroke-dashoffset: 20; opacity: 0.9; }
      65% { stroke-dashoffset: 0; opacity: 1; }
      85% { stroke-dashoffset: 0; opacity: 0.7; }
      100% { stroke-dasharray: 100; stroke-dashoffset: 100; opacity: 0.3; }
    }
    .animate-dashboard { animation: dashboardRotate 3s ease-in-out infinite; }
    .animate-tasks { animation: messagesType 3s ease-in-out infinite; }
    .animate-messages { animation: messagesType 3s ease-in-out infinite; }
    .animate-analytics { animation: analyticsBarsGrow 3s ease-in-out infinite; transform-origin: center bottom; }
    .animate-logs { animation: logsType 3s ease-in-out infinite; }
  `;

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = iconAnimations;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  const handleIconHover = (label: string) => {
    setAnimatingIcon(label);
  };

  const handleIconLeave = () => {
    setAnimatingIcon(null);
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentEmployee(user);
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

        const res = await fetch(
          `/api/direct-messaging-endpoints/users?userId=${user.id}`,
        );
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
        const res = await fetch(`/api/notification-handlers?userId=${user.id}`);
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
    if (!currentEmployee?.id) return;
    console.log(
      "[UnreadMessages] Setting up EventSource for userId:",
      currentEmployee.id,
    );
    const es = new EventSource(
      `/api/subscription-management?userId=${currentEmployee.id}`,
    );

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
  }, [currentEmployee]);

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/");

  const buttonStyle = (active: boolean): string =>
    `w-full px-4 py-2.5 flex items-center gap-2.5 text-xs font-light cursor-pointer relative overflow-hidden rounded-full border border-transparent hover:border-black/50 text-black-800 transition-all duration-200 ease-out ${
      active ? "shadow-[1px_1px_6px_rgba(0,0,0,0.30)]" : "shadow-none"
    }`;

  return (
    <div className="flex-1 flex flex-col font-inter">
      {/* top Menu */}
      <nav className="py-3 pr-0 pl-1 flex flex-col gap-2">
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
                onMouseEnter={() => handleIconHover(item.label)}
                onMouseLeave={handleIconLeave}
              >
                {active && (
                  <div className="absolute right-0 top-0 bottom-0 w-0.5" />
                )}
                <div className="w-5 flex justify-start relative">
                  <Icon
                    size={16}
                    strokeWidth={1.5}
                    className={
                      animatingIcon === item.label ? item.animationClass : ""
                    }
                  />
                  {/* Unread message badge - positioned at bottom-right of icon */}
                  {isMessages && unreadMessages > 0 && (
                    <div className="absolute -bottom-1.5 -right-1.5 min-w-[14px] h-3.5 rounded-full bg-red-500 border-2 border-blue-500/25 text-black text-[9px] font-bold flex items-center justify-center">
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
      <div className="mx-4 border-t border-black/25" />

      {/* bottom Menu */}
      <nav className="py-3 px-0 flex flex-col gap-2">
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
                onMouseEnter={() => handleIconHover(item.label)}
                onMouseLeave={handleIconLeave}
              >
                {active && (
                  <div className="absolute right-0 top-0 bottom-0 w-0.5" />
                )}
                <div className="w-5 flex justify-start">
                  <Icon
                    size={16}
                    strokeWidth={1.5}
                    className={
                      animatingIcon === item.label ? item.animationClass : ""
                    }
                  />
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
