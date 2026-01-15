"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Upload,
  Users,
  Trash2,
  ChevronDown,
  LogOut,
  AlertCircle,
  Check,
  Plus,
  Mail,
  Clock,
} from "lucide-react";
import {
  getCurrentUser,
  clearUserSession,
  saveUserSession,
} from "@/utils/sessionManager";
import { useRouter } from "next/navigation";

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isVerified: boolean;
  profilePicture?: string;
}

interface ListUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isVerified: boolean;
  active: boolean;
}

type TabType = "profile" | "notifications" | "team";

const ROLES = ["EMPLOYEE", "TEAM_LEAD", "MANAGER", "CO_OWNER"];

export default function SettingsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [profilePicture, setProfilePicture] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  // Notification state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [notificationSaving, setNotificationSaving] = useState(false);

  // Team management state
  const [users, setUsers] = useState<ListUser[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editingRole, setEditingRole] = useState("");
  const [showRoleDropdown, setShowRoleDropdown] = useState<number | null>(null);
  const [approvingUserId, setApprovingUserId] = useState<number | null>(null);
  const [rejectingUserId, setRejectingUserId] = useState<number | null>(null);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (activeTab === "team" && canManageUsers) {
      fetchUsers();
    }
  }, [activeTab]);

  const loadCurrentUser = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setCurrentUser(user as User);
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setProfilePicture(user.profilePicture || "");
      setError(null);
    } catch (err) {
      setError("Failed to load user data");
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePicture(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    if (!currentUser) return;
    setProfileSaving(true);
    setProfileMessage("");

    try {
      const response = await fetch(`/api/users/${currentUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(currentUser.id),
        },
        body: JSON.stringify({
          firstName,
          lastName,
          profilePicture,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save profile");
      }

      setProfileMessage("Profile updated successfully");
      const updatedUser = {
        ...currentUser,
        firstName,
        lastName,
        profilePicture,
      } as User;
      setCurrentUser(updatedUser);

      // Save updated profile to localStorage with proper type cast
      saveUserSession(updatedUser as any);

      // Dispatch custom event to notify sidebar of profile update
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("profileUpdated"));
      }

      setTimeout(() => setProfileMessage(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setProfileSaving(false);
    }
  };

  const fetchUsers = async () => {
    setTeamLoading(true);
    try {
      const userId =
        typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      const response = await fetch("/api/users", {
        headers: userId ? { "x-user-id": userId } : {},
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch users");
      }
      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch users");
    } finally {
      setTeamLoading(false);
    }
  };

  const inviteUser = async () => {
    if (!inviteEmail) return;
    setInviting(true);

    try {
      const response = await fetch("/api/invite/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });

      if (!response.ok) throw new Error("Failed to send invite");

      setInviteEmail("");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setInviting(false);
    }
  };

  const promoteUser = async (userId: number, newRole: string) => {
    try {
      const sessionUserId =
        typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      const response = await fetch("/api/users/promote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionUserId && { "x-user-id": sessionUserId }),
        },
        body: JSON.stringify({ userId, newRole }),
      });

      if (!response.ok) throw new Error("Failed to promote user");

      fetchUsers();
      setEditingUserId(null);
      setShowRoleDropdown(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to promote user");
    }
  };

  const deleteUser = async (userId: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const sessionUserId =
        typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        headers: sessionUserId ? { "x-user-id": sessionUserId } : {},
      });

      if (!response.ok) throw new Error("Failed to delete user");

      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    }
  };

  const approveUser = async (userId: number) => {
    setApprovingUserId(userId);
    try {
      const sessionUserId =
        typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      const response = await fetch(`/api/users/${userId}/approve`, {
        method: "POST",
        headers: sessionUserId ? { "x-user-id": sessionUserId } : {},
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to approve user");
      }

      fetchUsers();
      alert("User approved successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve user");
      alert(err instanceof Error ? err.message : "Failed to approve user");
    } finally {
      setApprovingUserId(null);
    }
  };

  const rejectUser = async (userId: number) => {
    if (
      !confirm(
        "Are you sure you want to reject this user? Their account will be deleted."
      )
    )
      return;

    setRejectingUserId(userId);
    try {
      const sessionUserId =
        typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      const response = await fetch(`/api/users/${userId}/deny`, {
        method: "POST",
        headers: sessionUserId ? { "x-user-id": sessionUserId } : {},
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to reject user");
      }

      fetchUsers();
      alert("User rejected and account deleted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject user");
      alert(err instanceof Error ? err.message : "Failed to reject user");
    } finally {
      setRejectingUserId(null);
    }
  };

  const handleLogout = async () => {
    clearUserSession();
    router.push("/auth/login");
  };

  if (loading) {
    return (
      <div className="p-8 bg-white min-h-screen">
        <p className="text-gray-600">Loading settings...</p>
      </div>
    );
  }

  const canManageUsers = ["OWNER", "CO_OWNER", "MANAGER"].includes(
    currentUser?.role || ""
  );

  return (
    <div className="p-8 bg-white min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-gray-200">
        <button
          onClick={() => {
            setActiveTab("profile");
            setError(null);
          }}
          className={`px-4 py-3 font-medium transition-colors ${
            activeTab === "profile"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Profile
        </button>
        <button
          onClick={() => {
            setActiveTab("notifications");
            setError(null);
          }}
          className={`px-4 py-3 font-medium transition-colors ${
            activeTab === "notifications"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Notifications
        </button>
        {canManageUsers && (
          <button
            onClick={() => {
              setActiveTab("team");
              setError(null);
              fetchUsers();
            }}
            className={`px-4 py-3 font-medium transition-colors ${
              activeTab === "team"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Team Management
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle size={20} className="text-red-600" />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === "profile" && currentUser && (
        <div className="max-w-2xl space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Update Profile Details
            </h2>

            <div className="space-y-4">
              {/* Profile Picture */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profile Picture
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-lg bg-gray-200 flex items-center justify-center overflow-hidden">
                    {profilePicture ? (
                      <img
                        src={profilePicture}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users size={32} className="text-gray-400" />
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Upload size={16} />
                    Upload
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="Your first name"
                />
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="Your last name"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email (Read-only)
                </label>
                <input
                  type="email"
                  value={currentUser.email}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role (Read-only)
                </label>
                <input
                  type="text"
                  value={currentUser.role}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>

              {profileMessage && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm flex items-center gap-2">
                  <Check size={16} />
                  {profileMessage}
                </div>
              )}

              <button
                onClick={saveProfile}
                disabled={profileSaving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {profileSaving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <div className="max-w-2xl space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Notification Preferences
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <label className="font-medium text-gray-900">
                Email Notifications
              </label>
              <button
                onClick={() => setEmailNotifications(!emailNotifications)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  emailNotifications ? "bg-blue-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    emailNotifications ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Management Tab */}
      {activeTab === "team" && canManageUsers && (
        <div className="max-w-4xl space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Team Management
          </h2>

          {/* Invite Section */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Plus size={18} />
              Add New Team Member
            </h3>
            <div className="flex gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Enter email address"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
              <button
                onClick={inviteUser}
                disabled={inviting || !inviteEmail}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {inviting ? "Sending..." : "Send Invite"}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              An invitation link will be sent to their email
            </p>
          </div>

          {/* Users List */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Users size={18} />
              Team Members ({users.length})
            </h3>

            {teamLoading ? (
              <p className="text-gray-600">Loading team members...</p>
            ) : users.length === 0 ? (
              <p className="text-gray-600">No team members yet</p>
            ) : (
              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="p-4 border border-gray-200 rounded-lg flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </h4>
                        <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-700 rounded">
                          {user.role}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {user.email}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {!user.active && (
                          <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-700 rounded">
                            Pending Approval
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 ml-2 flex-wrap justify-end">
                      {currentUser?.role === "OWNER" &&
                        user.id !== currentUser.id && (
                          <>
                            {!user.active && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => approveUser(user.id)}
                                  disabled={approvingUserId === user.id}
                                  className="text-sm px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors disabled:opacity-50 whitespace-nowrap flex items-center gap-1"
                                >
                                  <Check size={14} />
                                  {approvingUserId === user.id
                                    ? "Approving..."
                                    : "Approve"}
                                </button>
                                <button
                                  onClick={() => rejectUser(user.id)}
                                  disabled={rejectingUserId === user.id}
                                  className="text-sm px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors disabled:opacity-50 whitespace-nowrap"
                                >
                                  {rejectingUserId === user.id
                                    ? "Rejecting..."
                                    : "Reject"}
                                </button>
                              </div>
                            )}

                            {user.active && (
                              <div className="relative">
                                <button
                                  onClick={() =>
                                    setShowRoleDropdown(
                                      showRoleDropdown === user.id
                                        ? null
                                        : user.id
                                    )
                                  }
                                  className="text-sm px-3 py-1 bg-gray-200 text-gray-900 rounded hover:bg-gray-300 transition-colors whitespace-nowrap"
                                >
                                  Change Role
                                </button>

                                {showRoleDropdown === user.id && (
                                  <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 w-40">
                                    {ROLES.map((role) => (
                                      <button
                                        key={role}
                                        onClick={() =>
                                          promoteUser(user.id, role)
                                        }
                                        className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors text-sm"
                                      >
                                        {role}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            <button
                              onClick={() => deleteUser(user.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete user"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
