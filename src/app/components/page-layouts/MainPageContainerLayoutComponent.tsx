"use client";

import React, { useEffect, useState } from "react";
import { getCurrentUser } from "@/utils/sessionManager";
import { LogOut, Sparkles, MessageCircle, Settings, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { clearUserSession } from "@/utils/sessionManager";
import { NotificationWidget } from "@/app/components/shared-headers/NotificationHeaderComponent";

interface PageContainerProps {
  children: React.ReactNode;
  title?: string;
}

interface Employee {
  id: string;
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

  // ensure highlight state clears if widget is closed via its internal close button
  useEffect(() => {
    const handleClosed = () => setShowTaskerBot(false);
    window.addEventListener("taskerBotClosed", handleClosed);
    return () => window.removeEventListener("taskerBotClosed", handleClosed);
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { label: string; path: string }[]
  >([]);
  const router = useRouter();

  const menuItems = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Tasks", path: "/tasks" },
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
        marginLeft: 10,
        overflow: "visible", // allow dropdowns to escape
      }}
    >
      <div className="relative z-[2000] bg-blue-300 shadow-sm px-6 py-0 ml-[-10px] mb-2 overflow-visible transition-shadow duration-200">
        <div className="flex items-center justify-between gap-4">
          {/* Page Title */}
          <div className="text-black capitalize text-lg min-w-fit hidden sm:block">
            {title || "Dashboard"}
          </div>

          {/* Center Section: Search */}
          <div className="flex items-center flex-1 justify-center gap-2">
            {/* Search box */}
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search a menu..."
                className="w-full px-4 py-1 rounded-full bg-white/90 border border-white text-gray-700 text-sm placeholder-gray-500 outline-none focus:border-white focus:bg-white transition-colors"
              />
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-md w-full z-[1000]">
                  {searchResults.map((item) => (
                    <div
                      key={item.path}
                      onClick={() => handleSelectResult(item.path)}
                      className="px-4 py-2 cursor-pointer text-gray-700 text-sm hover:bg-gray-50 transition-colors"
                    >
                      {item.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Section: TaskerBot + Notification + Profile */}
          <div className="flex items-center gap-3 ml-auto flex-shrink-0">
            {/* TaskerBot Toggle Button */}
            <button
              onClick={() => {
                setShowTaskerBot(!showTaskerBot);
                window.dispatchEvent(new CustomEvent("toggleTaskerBot"));
              }}
              className={`px-4 py-2 flex items-center gap-2 text-xs cursor-pointer relative rounded-full transition-all duration-200 ease-out border border-transparent ${
                showTaskerBot
                  ? " bg-white/30 text-black hover:border-black/50"
                  : "bg-white text-blue-600 shadow-md border-black/50"
              }`}
              title="Create Task with Taskerbot"
            >
              <Plus size={16} strokeWidth={3} />
              <span className="hidden sm:inline">
                Create Task with TaskerBot
              </span>
            </button>

            {/* Notification Widget */}
            <NotificationWidget />
            {/* Profile Section */}
            {employee && (
              <>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  title={`${employee.firstName} ${employee.lastName} (${employee.role ? employee.role.charAt(0).toUpperCase() + employee.role.slice(1).toLowerCase() : "Employee"})`}
                  className={`relative flex items-center gap-2 px-1 py-1 rounded-lg transition-all duration-200 ${
                    showDropdown
                      ? "bg-white/30"
                      : "bg-white/20 hover:bg-white/30"
                  }`}
                >
                  {/* Avatar only */}
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-semibold overflow-hidden flex-shrink-0">
                    {employee.profilePicture ? (
                      <img
                        src={employee.profilePicture}
                        alt={`${employee.firstName} ${employee.lastName}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-blue-600">
                        {employee.firstName[0]}
                        {employee.lastName[0]}
                      </span>
                    )}
                  </div>
                </button>

                {/* Dropdown Menu */}
                {showDropdown && (
                  <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-[1000] w-48">
                    <div className="flex flex-col items-center p-4 border-b border-gray-200">
                      <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        {employee.profilePicture ? (
                          <img
                            src={employee.profilePicture}
                            alt={`${employee.firstName} ${employee.lastName}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-gray-700 text-xl font-semibold">
                            {employee.firstName![0]}
                            {employee.lastName![0]}
                          </span>
                        )}
                      </div>
                      <p className="mt-3 text-xs font-semibold text-gray-700 m-0 break-words max-w-[150px] px-2">
                        {employee.firstName!} {employee.lastName!}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-1 break-words max-w-[150px] px-2">
                        {employee.email!}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        router.push("/settings");
                        setShowDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      <Settings size={14} />
                      Settings
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-red-50 transition-colors flex items-center gap-2 border-t border-gray-200"
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

      <div className="flex-1 overflow-y-auto custom-scrollbar">{children}</div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]">
          <div className="bg-white border border-gray-200 rounded-lg p-6 w-96 shadow-md text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Confirm Logout
            </h2>
            <p className="text-gray-600 text-sm mb-6">
              Are you sure you want to log out?
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="px-6 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
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
