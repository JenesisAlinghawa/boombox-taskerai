"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getCurrentUser, saveUserSession } from "@/utils/sessionManager";

interface User {
  id: number;
  name: string;
  email: string;
  role?: "EMPLOYEE" | "TEAM_LEAD" | "MANAGER" | "CO_OWNER" | "OWNER";
}

interface TeamMember {
  id: number;
  user: {
    id: number;
    name: string;
    email: string;
  };
  status: string;
  inviter?: {
    id: number;
    name: string;
    email: string;
  } | null;
}

interface Team {
  id: number;
  ownerId: number;
  members: TeamMember[];
}

const COLORS = {
  bg: "#ffffff",
  cardBg: "#F9FAFD",
  text: "#1f2937",
  muted: "#6b7280",
  border: "rgba(0,0,0,0.1)",
  primary: "#5d8bb1",
  hover: "#2d3748",
  danger: "#ef4444",
  success: "#10b981",
  shadow: "#E1F1FD",
};

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<
    "profile" | "notifications" | "team"
  >("profile");

  // Profile state
  const [name, setName] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  // Notification state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [notificationLoading, setNotificationLoading] = useState(false);

  // Team state
  const [team, setTeam] = useState<Team | null>(null);
  const [teamLoading, setTeamLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [addingUser, setAddingUser] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editStatus, setEditStatus] = useState("");

  // Load user from session API
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await getCurrentUser();
        if (userData) {
          setUser(userData);
          setName(userData.name || "");
        }
      } catch (e) {
        console.error("Failed to load user data", e);
      }
    };
    loadUser();
  }, []);

  // Load team when activeTab is team
  useEffect(() => {
    if (activeTab === "team" && user) {
      fetchTeam();
    }
  }, [activeTab, user]);

  const fetchTeam = async () => {
    if (!user) return;
    setTeamLoading(true);
    try {
      const res = await fetch("/api/teams", {
        headers: { "x-user-id": user.id.toString() },
      });
      const data = await res.json();
      setTeam(data.team);
    } catch (err) {
      console.error("Failed to fetch team:", err);
    } finally {
      setTeamLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    if (!name.trim() || !user) {
      setProfileMessage("Name is required");
      return;
    }

    setProfileLoading(true);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id.toString(),
        },
        body: JSON.stringify({ name }),
      });

      if (res.ok) {
        const updatedUser = { ...user, name };
        setUser(updatedUser);
        saveUserSession(updatedUser);
        setProfileMessage("Profile updated successfully!");
        setTimeout(() => setProfileMessage(""), 3000);
      } else {
        setProfileMessage("Failed to update profile");
      }
    } catch {
      setProfileMessage("Error updating profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleNotificationSave = async () => {
    setNotificationLoading(true);
    try {
      // Save notification preferences
      // For now, just show success message
      await new Promise((resolve) => setTimeout(resolve, 500));
      setProfileMessage("Notification preferences saved!");
      setTimeout(() => setProfileMessage(""), 3000);
    } finally {
      setNotificationLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!email.trim() || !user) {
      setError("Email is required");
      return;
    }

    setAddingUser(true);
    setError("");
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id.toString(),
        },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setEmail("");
        await fetchTeam();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to add user");
      }
    } catch (err) {
      setError("Error adding user");
    } finally {
      setAddingUser(false);
    }
  };

  const handleStatusChange = async (memberId: number, newStatus: string) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/teams/${memberId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id.toString(),
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setEditingId(null);
        await fetchTeam();
      }
    } catch (err) {
      console.error("Failed to update member:", err);
    }
  };

  const handleDeactivate = async (memberId: number) => {
    if (
      !confirm("Are you sure you want to remove this user from your team?") ||
      !user
    )
      return;

    try {
      const res = await fetch(`/api/teams/${memberId}`, {
        method: "DELETE",
        headers: { "x-user-id": user.id.toString() },
      });

      if (res.ok) {
        await fetchTeam();
      }
    } catch (err) {
      console.error("Failed to remove member:", err);
    }
  };

  const handleMessageInviter = (inviterId: number) => {
    // Navigate to messages page with the inviter
    const messagesUrl = `/dashboard/messages?userId=${inviterId}`;
    window.location.href = messagesUrl;
  };

  return (
    <div style={{ padding: 20, minHeight: "100vh", background: COLORS.bg }}>
      <h1
        style={{
          margin: "0 0 24px",
          color: COLORS.text,
          fontSize: 24,
          fontWeight: 600,
        }}
      >
        Settings
      </h1>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "16px",
          marginBottom: "24px",
          borderBottom: `1px solid ${COLORS.border}`,
        }}
      >
        {["profile", "notifications", "team"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            style={{
              padding: "12px 24px",
              background: activeTab === tab ? COLORS.primary : "transparent",
              color: COLORS.text,
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 600,
              borderBottom:
                activeTab === tab ? `2px solid ${COLORS.primary}` : "none",
              transition: "all 0.2s",
              textTransform: "capitalize",
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab) {
                e.currentTarget.style.color = COLORS.primary;
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab) {
                e.currentTarget.style.color = COLORS.text;
              }
            }}
          >
            {tab === "profile" && "👤 Profile"}
            {tab === "notifications" && "🔔 Notifications"}
            {tab === "team" && "👥 Team"}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div
          style={{
            background: "#F9FAFD",
            borderRadius: "8px",
            padding: "20px",
            maxWidth: "600px",
            border: `1px solid ${COLORS.border}`,
            filter: "drop-shadow(2px 2px 5px rgba(211, 212, 214, 0.5))",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              color: "#333",
              fontSize: "18px",
              fontWeight: 600,
            }}
          >
            Update Profile Details
          </h2>

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "6px",
                fontSize: "13px",
                fontWeight: 500,
                color: "#333",
              }}
            >
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: `1px solid ${COLORS.border}`,
                borderRadius: "6px",
                background: "#ffffff",
                color: "#333",
                fontSize: "13px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "6px",
                fontSize: "13px",
                fontWeight: 500,
                color: "#333",
              }}
            >
              Email
            </label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              style={{
                width: "100%",
                padding: "10px 12px",
                border: `1px solid ${COLORS.border}`,
                borderRadius: "6px",
                background: "#f5f5f5",
                color: COLORS.muted,
                fontSize: "13px",
                boxSizing: "border-box",
              }}
            />
          </div>

          {profileMessage && (
            <div
              style={{
                marginBottom: "16px",
                padding: "10px 12px",
                borderRadius: "6px",
                background: profileMessage.includes("success")
                  ? "rgba(16, 185, 129, 0.1)"
                  : "rgba(239, 68, 68, 0.1)",
                color: profileMessage.includes("success")
                  ? COLORS.success
                  : COLORS.danger,
                fontSize: "13px",
              }}
            >
              {profileMessage}
            </div>
          )}

          <button
            onClick={handleProfileUpdate}
            disabled={profileLoading}
            style={{
              padding: "10px 24px",
              background: COLORS.primary,
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: profileLoading ? "not-allowed" : "pointer",
              fontSize: "13px",
              fontWeight: 500,
              opacity: profileLoading ? 0.6 : 1,
            }}
          >
            {profileLoading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <div
          style={{
            background: "#F9FAFD",
            borderRadius: "8px",
            padding: "20px",
            maxWidth: "600px",
            border: `1px solid ${COLORS.border}`,
            filter: "drop-shadow(2px 2px 5px rgba(211, 212, 214, 0.5))",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              color: "#333",
              fontSize: "18px",
              fontWeight: 600,
            }}
          >
            Notification Preferences
          </h2>

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                style={{ cursor: "pointer", width: "16px", height: "16px" }}
              />
              <span style={{ color: "#333", fontSize: "13px" }}>
                Email Notifications
              </span>
            </label>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={pushNotifications}
                onChange={(e) => setPushNotifications(e.target.checked)}
                style={{ cursor: "pointer", width: "16px", height: "16px" }}
              />
              <span style={{ color: "#333", fontSize: "13px" }}>
                Push Notifications
              </span>
            </label>
          </div>

          <button
            onClick={handleNotificationSave}
            disabled={notificationLoading}
            style={{
              padding: "10px 24px",
              background: COLORS.primary,
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: notificationLoading ? "not-allowed" : "pointer",
              fontSize: "13px",
              fontWeight: 500,
              opacity: notificationLoading ? 0.6 : 1,
            }}
          >
            {notificationLoading ? "Saving..." : "Save Preferences"}
          </button>

          {profileMessage && (
            <div
              style={{
                marginTop: "16px",
                padding: "10px 12px",
                borderRadius: "6px",
                background: "rgba(16, 185, 129, 0.1)",
                color: COLORS.success,
                fontSize: "13px",
              }}
            >
              {profileMessage}
            </div>
          )}
        </div>
      )}

      {/* Team Tab */}
      {activeTab === "team" && (
        <div
          style={{
            background: "#F9FAFD",
            borderRadius: "8px",
            padding: "20px",
            maxWidth: "700px",
            border: `1px solid ${COLORS.border}`,
            filter: "drop-shadow(2px 2px 5px rgba(211, 212, 214, 0.5))",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <h2
              style={{
                margin: 0,
                color: "#333",
                fontSize: "18px",
                fontWeight: 600,
              }}
            >
              Team Management
            </h2>

            {/* Link to dedicated team management page for admins */}
            {user?.role &&
              ["OWNER", "CO_OWNER", "MANAGER"].includes(user.role) && (
                <Link href="/settings/team" style={{ textDecoration: "none" }}>
                  <button
                    style={{
                      padding: "10px 20px",
                      background: COLORS.primary,
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                    }}
                  >
                    Manage Team
                  </button>
                </Link>
              )}
          </div>

          {/* Add User Section */}
          <div
            style={{
              marginBottom: "24px",
              paddingBottom: "24px",
              borderBottom: `1px solid ${COLORS.border}`,
            }}
          >
            <h3
              style={{
                margin: "0 0 12px",
                fontSize: "14px",
                fontWeight: 600,
                color: "#333",
              }}
            >
              Add User to Team
            </h3>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter user email"
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: "6px",
                  background: "#ffffff",
                  color: "#333",
                  fontSize: "13px",
                  boxSizing: "border-box",
                }}
              />
              <button
                onClick={handleAddUser}
                disabled={addingUser}
                style={{
                  padding: "10px 16px",
                  background: COLORS.primary,
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: addingUser ? "not-allowed" : "pointer",
                  fontSize: "13px",
                  fontWeight: 500,
                  opacity: addingUser ? 0.6 : 1,
                }}
              >
                {addingUser ? "Adding..." : "Add"}
              </button>
            </div>
            {error && (
              <div
                style={{
                  color: COLORS.danger,
                  marginTop: "8px",
                  fontSize: "12px",
                }}
              >
                {error}
              </div>
            )}
          </div>

          {/* Team Members List */}
          <div>
            <h3
              style={{
                margin: "0 0 12px",
                fontSize: "14px",
                fontWeight: 600,
                color: "#333",
              }}
            >
              Team Members ({team?.members?.length || 0})
            </h3>

            {teamLoading ? (
              <div
                style={{
                  color: COLORS.muted,
                  textAlign: "center",
                  padding: "20px",
                }}
              >
                Loading team...
              </div>
            ) : team?.members && team.members.length > 0 ? (
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                {team.members.map((member) => (
                  <div
                    key={member.id}
                    style={{
                      padding: "12px",
                      background: "#ffffff",
                      borderRadius: "6px",
                      border: `1px solid ${COLORS.border}`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            color: "#333",
                            fontSize: "13px",
                            fontWeight: 500,
                          }}
                        >
                          {member.user.name}{" "}
                          {user?.id === member.user.id && (
                            <span style={{ color: COLORS.primary }}>(You)</span>
                          )}
                        </div>
                        <div style={{ color: COLORS.muted, fontSize: "12px" }}>
                          {member.user.email}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        {editingId === member.id ? (
                          <>
                            <select
                              value={editStatus}
                              onChange={(e) => setEditStatus(e.target.value)}
                              style={{
                                padding: "6px 8px",
                                background: COLORS.bg,
                                color: COLORS.text,
                                border: `1px solid ${COLORS.border}`,
                                borderRadius: "4px",
                                fontSize: "12px",
                              }}
                            >
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                            </select>
                            <button
                              onClick={() =>
                                handleStatusChange(member.id, editStatus)
                              }
                              style={{
                                padding: "6px 12px",
                                background: COLORS.primary,
                                color: "#fff",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "12px",
                              }}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              style={{
                                padding: "6px 12px",
                                background: COLORS.border,
                                color: COLORS.text,
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "12px",
                              }}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <span
                              style={{
                                padding: "6px 12px",
                                background:
                                  member.status === "active"
                                    ? "transparent"
                                    : "transparent",
                                color:
                                  member.status === "active"
                                    ? COLORS.success
                                    : COLORS.muted,
                                borderRadius: "4px",
                                fontSize: "12px",
                                fontWeight: 500,
                              }}
                            >
                              {member.status}
                            </span>

                            {/* Show Message button if user is not the team owner AND current user is the member */}
                            {user?.id === member.user.id &&
                              team?.ownerId !== user.id &&
                              member.inviter && (
                                <button
                                  onClick={() =>
                                    handleMessageInviter(member.inviter!.id)
                                  }
                                  style={{
                                    padding: "6px 12px",
                                    background: COLORS.primary,
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                  }}
                                >
                                  Message {member.inviter.name.split(" ")[0]}
                                </button>
                              )}

                            {/* Show Edit and Remove buttons only if user is team owner */}
                            {team?.ownerId === user?.id && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingId(member.id);
                                    setEditStatus(member.status);
                                  }}
                                  style={{
                                    padding: "6px 12px",
                                    background: COLORS.primary,
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeactivate(member.id)}
                                  style={{
                                    padding: "6px 12px",
                                    background: "transparent",
                                    color: COLORS.danger,
                                    border: `1px solid ${COLORS.danger}`,
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                  }}
                                >
                                  Remove
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  color: COLORS.muted,
                  textAlign: "center",
                  padding: "16px",
                }}
              >
                No team members yet
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
