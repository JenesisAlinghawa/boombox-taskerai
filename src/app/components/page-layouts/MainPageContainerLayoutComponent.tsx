"use client";

import React, { useEffect, useState } from "react";
import { getCurrentUser } from "@/utils/sessionManager";
import { LogOut, Sparkles, MessageCircle, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { clearUserSession } from "@/utils/sessionManager";
import { NotificationWidget } from "@/app/components/shared-headers/NotificationCenterHeaderComponent";

interface PageContainerProps {
  children: React.ReactNode;
  title?: string;
}

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
  profilePicture?: string;
}

export const PageContainer = ({ children, title }: PageContainerProps) => {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showTaskerBot, setShowTaskerBot] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [animatingTaskerBot, setAnimatingTaskerBot] = useState(false);

  // Add TaskerBot animation CSS
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes taskerBotWave {
        0%, 100% { transform: scale(1) rotate(0deg); }
        25% { transform: scale(1.05) rotate(-3deg); }
        50% { transform: scale(1.1) rotate(3deg); }
        75% { transform: scale(1.05) rotate(-2deg); }
      }
      @keyframes taskerBotPulse {
        0%, 100% { transform: scale(1) rotate(0deg); }
        25% { transform: scale(1.08) rotate(-3deg); }
        50% { transform: scale(1.12) rotate(3deg); }
        75% { transform: scale(1.08) rotate(-2deg); }
      }
      .animate-taskerbot-wave {
        animation: taskerBotWave 1s ease-in-out;
      }
      .animate-taskerbot-pulse {
        animation: taskerBotPulse 1s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  // Cleanup animation timeout on unmount
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current)
        clearTimeout(animationTimeoutRef.current);
    };
  }, []);

  // ensure highlight state clears if widget is closed via its internal close button
  useEffect(() => {
    const handleClosed = () => setShowTaskerBot(false);
    window.addEventListener("taskerBotClosed", handleClosed);
    return () => window.removeEventListener("taskerBotClosed", handleClosed);
  }, []);

  const animationTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { label: string; path: string }[]
  >([]);
  const router = useRouter();

  const menuItems = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Tasks", path: "/tasks" },
    { label: "Analytics", path: "/analytics" },
    // settings accessible via profile dropdown now

    { label: "Teams", path: "/teams" },
    // add more as needed
  ];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.trim() === "") {
      setSearchResults([]);
    } else {
      const lower = query.toLowerCase();
      const results = menuItems.filter((item) =>
        item.label.toLowerCase().includes(lower),
      );
      setSearchResults(results);
    }
  };

  const handleSelectResult = (path: string) => {
    router.push(path);
    setSearchQuery("");
    setSearchResults([]);
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await getCurrentUser();
        if (userData) setEmployee(userData);
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

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    clearUserSession();
    router.push("/auth/login");
  };
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        background: "transparent",
        padding: 0,
        margin: 0,
        overflow: "visible", // allow dropdowns to escape
      }}
    >
      {title && (
        <div className="relative z-[2000] bg-blue-300 backdrop-blur-sm  shadow-sm shadow-black/50 rounded-sm m-0 mb-2 p-0 overflow-visible">
          <div className="flex items-center justify-between">
            <h1
              className="ml-2"
              style={{
                color: "#000000",
                fontSize: "var(--font-size-description-small)",
                fontWeight: "300",
                textTransform: "capitalize",
                letterSpacing: "0.2em",
                fontFamily: "var(--font-inria-sans)",
                margin: 0,
                marginLeft: "16px",
              }}
            >
              {title}
            </h1>

            {/* Right Section: TaskerBot + Profile */}
            <div className="flex items-center gap-3">
              {/* Search box */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search menu..."
                  className="px-3 py-1.5 rounded-lg bg-black/10 text-black text-xs placeholder-black-600 outline-none"
                />
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 bg-blue-600/70 backdrop-blur-sm rounded-lg shadow-lg w-48 z-[1000]">
                    {searchResults.map((item) => (
                      <div
                        key={item.path}
                        onClick={() => handleSelectResult(item.path)}
                        className="px-3 py-2 cursor-pointer text-black-800 text-sm hover:bg-blue-600/50 transition-colors"
                      >
                        {item.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* TaskerBot Toggle Button */}
              <button
                onClick={() => {
                  setShowTaskerBot(!showTaskerBot);
                  window.dispatchEvent(new CustomEvent("toggleTaskerBot"));
                }}
                onMouseEnter={() => {
                  // Only show wave animation on hover if modal is not open
                  if (!showTaskerBot) {
                    setAnimatingTaskerBot(true);
                    if (animationTimeoutRef.current)
                      clearTimeout(animationTimeoutRef.current);
                    animationTimeoutRef.current = setTimeout(
                      () => setAnimatingTaskerBot(false),
                      1200,
                    );
                  }
                }}
                className={`px-3 py-2.5 flex items-center gap-2 text-xs font-light cursor-pointer relative rounded-full border border-transparent hover:border-black/50 text-black transition-all duration-200 ease-out ${showTaskerBot ? "shadow-[1px_1px_6px_rgba(0,0,0,0.30)]" : "shadow-none"} ${animatingTaskerBot && !showTaskerBot ? "animate-taskerbot-wave" : ""} ${showTaskerBot ? "animate-taskerbot-pulse" : ""}`}
                title="Open TaskerBot"
              >
                <div className="relative w-6 h-6 flex items-center justify-center">
                  <MessageCircle size={24} strokeWidth={1.5} />
                  <Sparkles
                    size={14}
                    strokeWidth={4}
                    className="absolute bottom-0 right-0 text-purple-600"
                  />
                </div>
              </button>

              {/* Notification Widget */}
              <NotificationWidget excludePages={["/settings"]} />

              {/* TaskerBot close listener */}
              <script></script>
              {/* Profile Section */}
              {employee && (
                <>
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    title={`${employee.firstName} ${employee.lastName} (${employee.role ? employee.role.charAt(0).toUpperCase() + employee.role.slice(1).toLowerCase() : "Employee"})`}
                    className={`relative flex items-center gap-2 px-3 py-1.5  bg-blue-400/10 border border-black/10 hover:bg-blue-400/20 hover:border-black/20 transition-all duration-200 ${showDropdown ? "bg-blue-400/20 border-black/20" : ""}`}
                  >
                    {/* Avatar only */}
                    <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-xs font-semibold overflow-hidden flex-shrink-0">
                      {employee.profilePicture ? (
                        <img
                          src={employee.profilePicture}
                          alt={`${employee.firstName} ${employee.lastName}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-black-800">
                          {employee.firstName[0]}
                          {employee.lastName[0]}
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Dropdown Menu */}
                  {showDropdown && (
                    <div className="absolute top-full right-0 mt-2 bg-blue-100 backdrop-blur-lg border border-black/10 rounded-sm shadow-lg z-[1000] w-48">
                      <div className="flex flex-col items-center p-4 border-b border-black/10">
                        <div className="w-16 h-16 rounded-full bg-blue-200 flex items-center justify-center overflow-hidden">
                          {employee.profilePicture ? (
                            <img
                              src={employee.profilePicture}
                              alt={`${employee.firstName} ${employee.lastName}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-black text-xl font-semibold">
                              {employee.firstName![0]}
                              {employee.lastName![0]}
                            </span>
                          )}
                        </div>
                        <p className="mt-3 text-xs font-semibold text-black/80 m-0 break-words max-w-[150px] px-2">
                          {employee.firstName!} {employee.lastName!}
                        </p>
                        <p className="text-[10px] text-black/60 mt-1 break-words max-w-[150px] px-2">
                          {employee.email!}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          router.push("/settings");
                          setShowDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-black/80 hover:bg-black/5 transition-colors flex items-center gap-2"
                      >
                        <Settings size={14} />
                        Settings
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full px-3 py-2 text-left ml-1 text-sm text-black/80 hover:bg-red-400/10 transition-colors flex items-center gap-2"
                      >
                        <LogOut size={12} />
                        Logout
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar">{children}</div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]">
          <div className="bg-blue-100 backdrop-blur-lg rounded-lg p-6 w-96 shadow-lg text-center border border-black/10">
            <h2 className="text-lg font-semibold text-black/80 mb-2">
              Confirm Logout
            </h2>
            <p className="text-black/60 text-sm mb-6">
              Are you sure you want to log out?
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-6 py-2 bg-blue-200 text-black/80 rounded-sm font-medium hover:bg-blue-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="px-6 py-2 bg-red-500 text-white rounded-sm font-medium hover:bg-red-600 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
