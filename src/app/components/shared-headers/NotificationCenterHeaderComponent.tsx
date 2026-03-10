"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { getCurrentUser } from "@/utils/sessionManager";

interface NotificationWidgetProps {
  excludePages?: string[];
}

export const NotificationWidget: React.FC<NotificationWidgetProps> = ({
  excludePages = ["/settings"],
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentEmployee, setCurrentEmployee] = useState<any>(null);
  const [shouldShow, setShouldShow] = useState(true);
  const [isRingingBell, setIsRingingBell] = useState(false);
  const bellTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Add animation CSS
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes bellRing {
        0%, 100% { transform: rotate(0deg); }
        10% { transform: rotate(-15deg); }
        20% { transform: rotate(15deg); }
        30% { transform: rotate(-15deg); }
        40% { transform: rotate(15deg); }
        50% { transform: rotate(-10deg); }
        60% { transform: rotate(10deg); }
        70% { transform: rotate(-5deg); }
        80% { transform: rotate(5deg); }
        90% { transform: rotate(-2deg); }
      }
      .animate-bell-ring {
        animation: bellRing 1s ease-in-out;
        transform-origin: center top;
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  // Check if current page is in excludePages
  useEffect(() => {
    const isExcluded = excludePages.some(
      (page) => pathname === page || pathname.startsWith(page + "/"),
    );
    setShouldShow(!isExcluded);
  }, [pathname, excludePages]);

  // Check if notifications page is active
  const isActive =
    pathname === "/notifications" || pathname.startsWith("/notifications/");

  // Load user and fetch notifications
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentEmployee(user);
        if (user?.id) {
          await fetchNotifications(user.id);
        }
      } catch (e) {
        console.error("Failed to load user", e);
      }
    };

    loadUser();
  }, []);

  // Fetch notifications
  const fetchNotifications = async (userId: number) => {
    try {
      const res = await fetch(`/api/notification-handlers?userId=${userId}`);
      const data = await res.json();
      const items = Array.isArray(data?.notifications)
        ? data.notifications
        : [];
      const unread = items.filter((n: any) => !n.isRead).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  // Refresh notifications periodically
  useEffect(() => {
    if (!currentEmployee?.id) return;

    const interval = setInterval(() => {
      fetchNotifications(currentEmployee.id);
    }, 5000);

    return () => clearInterval(interval);
  }, [currentEmployee?.id]);

  // Listen for notification events
  useEffect(() => {
    if (!currentEmployee?.id) return;

    const es = new EventSource(
      `/api/subscription-management?userId=${currentEmployee.id}`,
    );

    const onNotification = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        console.log("[NotificationWidget] New notification event:", data);
        setUnreadCount((prev) => prev + 1);
        // Trigger bell ringing animation
        setIsRingingBell(true);
        if (bellTimeoutRef.current) clearTimeout(bellTimeoutRef.current);
        bellTimeoutRef.current = setTimeout(() => setIsRingingBell(false), 600);
      } catch (error) {
        console.error("[NotificationWidget] Event parse error:", error);
      }
    };

    es.addEventListener("notification", onNotification as EventListener);
    return () => es.close();
  }, [currentEmployee?.id]);

  // Cleanup bell timeout on unmount
  useEffect(() => {
    return () => {
      if (bellTimeoutRef.current) clearTimeout(bellTimeoutRef.current);
    };
  }, []);

  if (!shouldShow) return null;

  return (
    <button
      onClick={() => router.push("/notifications")}
      onMouseEnter={() => {
        setIsRingingBell(true);
        if (bellTimeoutRef.current) clearTimeout(bellTimeoutRef.current);
        bellTimeoutRef.current = setTimeout(
          () => setIsRingingBell(false),
          1000,
        );
      }}
      className={`relative px-3 py-2 rounded-full border border-transparent hover:border-black/50 text-black transition-all duration-200 ease-out text-xs font-light cursor-pointer ${
        isActive ? "shadow-[1px_1px_6px_rgba(0,0,0,0.30)]" : "shadow-none"
      }`}
      title="Notifications"
    >
      <Bell
        size={20}
        strokeWidth={1.5}
        className={isRingingBell ? "animate-bell-ring" : ""}
      />
      {/* Unread indicator badge */}
      {unreadCount > 0 && (
        <div className="absolute top-0 right-0 min-w-[18px] h-[18px] rounded-full bg-red-500 border border-black/20 text-white text-[10px] font-bold flex items-center justify-center">
          {unreadCount > 99 ? "99+" : unreadCount}
        </div>
      )}
    </button>
  );
};
