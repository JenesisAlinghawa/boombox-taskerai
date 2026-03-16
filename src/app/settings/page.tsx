"use client";

import React, { useState, useEffect } from "react";
import { LogOut, AlertCircle } from "lucide-react";
import { getCurrentUser, clearUserSession } from "@/utils/sessionManager";
import { useAuthProtection } from "@/app/hooks/useAuthProtection";
import { PageContainer } from "@/app/components/page-layouts/MainPageContainerLayoutComponent";
import { PageContentCon } from "@/app/components/page-layouts/PageContentWrapperContainerComponent";
import { useRouter } from "next/navigation";
import { ProfileManagementComponent } from "@/app/components/settings-components/ProfileManagementComponent";
import { EmailPasswordManagementComponent } from "@/app/components/settings-components/EmailPasswordManagementComponent";
import { NotificationsComponent } from "@/app/components/settings-components/NotificationsComponent";
import { TeamManagementComponent } from "@/app/components/settings-components/TeamManagementComponent";
import { ConfirmProvider } from "@/app/components/providers-popups/ConfirmationDialogProviderComponent";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isVerified: boolean;
  profilePicture?: string;
  emailNotifications?: boolean;
  messageNotifications?: boolean;
}

type TabType = "profile" | "accountSecurity" | "notifications" | "team";

export default function SettingsPage() {
  const router = useRouter();
  useAuthProtection(); // Protect this route
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [pendingUserCount, setPendingUserCount] = useState(0);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser?.role === "OWNER") {
      fetchPendingUserCount();
    }
  }, [currentUser]);

  const loadCurrentUser = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setCurrentUser(user as User);
      setError(null);
    } catch (err) {
      setError("Failed to load user data");
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingUserCount = async () => {
    try {
      const userId =
        typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      const response = await fetch("/api/user-management/pending", {
        headers: userId ? { "x-user-id": userId } : {},
      });
      if (response.ok) {
        const data = await response.json();
        setPendingUserCount(data.users?.length || 0);
      }
    } catch (err) {
      console.error("Failed to fetch pending user count:", err);
    }
  };

  const handleLogout = async () => {
    try {
      // Clear session data FIRST (before API call)
      // This ensures getCurrentUser() won't have user data to send
      clearUserSession();
      if (typeof window !== "undefined") {
        sessionStorage.clear();
      }

      // Call logout API to clear server-side cookies
      await fetch("/api/authentication-endpoints/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout API error:", err);
    } finally {
      // Hard refresh to clear any cached app state and socket connections
      if (typeof window !== "undefined") {
        window.location.href = "/auth/login";
      }
    }
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    handleLogout();
  };

  if (loading) {
    return (
      <div className="p-8 bg-white min-h-screen">
        <p className="text-white/60">Loading settings...</p>
      </div>
    );
  }

  const canManageUsers = ["OWNER", "ADMIN"].includes(currentUser?.role || "");

  return (
    <ConfirmProvider>
      <PageContainer title="SETTINGS">
        <PageContentCon className="mt-0 w-full h-auto">
          <div className="flex gap-1">
            {/* Left Sidebar Navigation */}
            <div className="w-48 h-auto flex-shrink-0 overflow-y-auto">
              <div className="bg-blue-100 backdrop-blur-md border border-black/10 mr-1 rounded-sm p-2 space-y-2 sticky top-0">
                <button
                  onClick={() => {
                    setActiveTab("profile");
                    setError(null);
                  }}
                  className={`w-full px-4 py-3 font-medium transition-colors rounded-sm text-left ${
                    activeTab === "profile"
                      ? "bg-blue-600 text-white"
                      : "text-black/70 hover:bg-white/50"
                  }`}
                >
                  Profile
                </button>
                <button
                  onClick={() => {
                    setActiveTab("accountSecurity");
                    setError(null);
                  }}
                  className={`w-full px-4 py-3 font-medium transition-colors rounded-sm text-left ${
                    activeTab === "accountSecurity"
                      ? "bg-blue-600 text-white"
                      : "text-black/70 hover:bg-white/50"
                  }`}
                >
                  Email & Password
                </button>
                <button
                  onClick={() => {
                    setActiveTab("notifications");
                    setError(null);
                  }}
                  className={`w-full px-4 py-3 font-medium transition-colors rounded-sm text-left ${
                    activeTab === "notifications"
                      ? "bg-blue-600 text-white"
                      : "text-black/70 hover:bg-white/50"
                  }`}
                >
                  Notifications
                </button>
                {canManageUsers && (
                  <button
                    onClick={() => {
                      setActiveTab("team");
                      setError(null);
                    }}
                    className={`w-full px-4 py-3 font-medium transition-colors rounded-sm text-left flex items-center justify-between ${
                      activeTab === "team"
                        ? "bg-blue-600 text-white"
                        : "text-black/70 hover:bg-white/50"
                    }`}
                  >
                    <span>Team Management</span>
                    {pendingUserCount > 0 && (
                      <div className="w-2 h-2 rounded-full bg-red-600"></div>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Right Content Area */}
            <div className="flex-1 flex flex-col space-y-6">
              {error && (
                <div className="p-4 bg-red-100 border border-red-300 rounded-sm flex items-center gap-1">
                  <AlertCircle size={20} className="text-red-700" />
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              {/* Profile Tab */}
              {activeTab === "profile" && currentUser && (
                <ProfileManagementComponent
                  currentUser={currentUser}
                  onError={setError}
                />
              )}

              {/* Email & Password Tab */}
              {activeTab === "accountSecurity" && currentUser && (
                <EmailPasswordManagementComponent
                  currentUser={currentUser}
                  onError={setError}
                />
              )}

              {/* Notifications Tab */}
              {activeTab === "notifications" && (
                <NotificationsComponent
                  currentUser={currentUser}
                  onError={setError}
                />
              )}

              {/* Team Management Tab */}
              {activeTab === "team" && canManageUsers && (
                <TeamManagementComponent
                  currentUser={currentUser}
                  canManageUsers={canManageUsers}
                  onError={setError}
                />
              )}
            </div>
          </div>
        </PageContentCon>

        {/* Logout Confirmation Modal */}
        {showLogoutConfirm && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowLogoutConfirm(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-[90%] max-w-sm bg-blue-100 border border-black/10 rounded-sm shadow-xl p-6"
            >
              <div className="flex items-center gap-1 mb-1 pb-4 border-b border-black/10">
                <div className="w-12 h-12 bg-red-200/60 rounded-sm flex items-center justify-center">
                  <AlertCircle size={24} className="text-red-700" />
                </div>
                <h2 className="text-lg font-semibold text-black/80">
                  Confirm Logout
                </h2>
              </div>

              <p className="text-black/70 text-sm mb-1 leading-relaxed">
                Are you sure you want to logout? You'll need to sign in again to
                access your account.
              </p>

              <div className="flex gap-1">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-4 py-2 bg-white/60 hover:bg-white/80 text-black/80 rounded-sm transition-colors font-medium border border-black/10"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-sm transition-colors font-medium"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </PageContainer>
    </ConfirmProvider>
  );
}
