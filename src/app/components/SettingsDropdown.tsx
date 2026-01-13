"use client";

import { useState, useEffect } from "react";

interface Props {
  userId: number;
  userName: string;
  userEmail: string;
}

const COLORS = {
  bg: "#ffffff",
  cardBg: "#F9FAFD",
  text: "#ffffff",
  muted: "#a0aec0",
  border: "#374151",
  primary: "#5d8bb1",
  hover: "#2d3748",
  danger: "#ef4444",
};

export default function SettingsDropdown({
  userId,
  userName,
  userEmail,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<
    "profile" | "notifications" | "team" | null
  >(null);

  const handleMenuClick = (modal: "profile" | "notifications" | "team") => {
    setActiveModal(modal);
    setIsOpen(false);
  };

  return (
    <>
      {/* Settings Button */}
      <div style={{ position: "relative" }}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            padding: "8px 16px",
            background: COLORS.primary,
            color: COLORS.text,
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          ⚙️ Settings
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              right: 0,
              marginTop: "8px",
              background: COLORS.cardBg,
              border: `1px solid ${COLORS.border}`,
              borderRadius: "8px",
              minWidth: "220px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
              zIndex: 100,
            }}
          >
            <button
              onClick={() => handleMenuClick("profile")}
              style={{
                display: "block",
                width: "100%",
                padding: "8px 12px",
                background: "transparent",
                color: COLORS.text,
                border: "none",
                textAlign: "left",
                cursor: "pointer",
                fontSize: "12px",
                borderBottom: `1px solid ${COLORS.border}`,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = COLORS.hover)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              👤 Profile
            </button>
            <button
              onClick={() => handleMenuClick("notifications")}
              style={{
                display: "block",
                width: "100%",
                padding: "8px 12px",
                background: "transparent",
                color: COLORS.text,
                border: "none",
                textAlign: "left",
                cursor: "pointer",
                fontSize: "12px",
                borderBottom: `1px solid ${COLORS.border}`,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = COLORS.hover)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              🔔 Notifications
            </button>
            <button
              onClick={() => handleMenuClick("team")}
              style={{
                display: "block",
                width: "100%",
                padding: "8px 12px",
                background: "transparent",
                color: COLORS.text,
                border: "none",
                textAlign: "left",
                cursor: "pointer",
                fontSize: "12px",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = COLORS.hover)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              👥 Team
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {activeModal === "profile" && (
        <UpdateProfileModal
          userId={userId}
          userName={userName}
          userEmail={userEmail}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === "notifications" && (
        <NotificationPreferencesModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === "team" && (
        <TeamManagementModal
          userId={userId}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* Close dropdown when clicking outside */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99,
          }}
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

function UpdateProfileModal({
  userId,
  userName,
  userEmail,
  onClose,
}: {
  userId: number;
  userName: string;
  userEmail: string;
  onClose: () => void;
}) {
  const [name, setName] = useState(userName);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    if (!name.trim()) {
      setMessage("Name is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId.toString(),
        },
        body: JSON.stringify({ name }),
      });

      if (res.ok) {
        setMessage("Profile updated successfully!");
        setTimeout(onClose, 1500);
      } else {
        setMessage("Failed to update profile");
      }
    } catch {
      setMessage("Error updating profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ maxWidth: "400px", width: "90%" }}>
        <h2
          style={{
            margin: "0 0 16px",
            fontSize: "18px",
            fontWeight: 600,
            color: COLORS.text,
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
              color: COLORS.text,
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
              background: COLORS.bg,
              color: COLORS.text,
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
              color: COLORS.text,
            }}
          >
            Email
          </label>
          <input
            type="email"
            value={userEmail}
            disabled
            style={{
              width: "100%",
              padding: "10px 12px",
              border: `1px solid ${COLORS.border}`,
              borderRadius: "6px",
              background: COLORS.hover,
              color: COLORS.muted,
              fontSize: "13px",
              boxSizing: "border-box",
            }}
          />
        </div>

        {message && (
          <div
            style={{
              marginBottom: "16px",
              color: message.includes("success") ? "#10b981" : "#ef4444",
              fontSize: "13px",
            }}
          >
            {message}
          </div>
        )}

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "10px",
              background: COLORS.border,
              color: COLORS.text,
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              flex: 1,
              padding: "10px",
              background: COLORS.primary,
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "13px",
              fontWeight: 500,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

function NotificationPreferencesModal({ onClose }: { onClose: () => void }) {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Save notification preferences
      // For now, just close the modal
      await new Promise((resolve) => setTimeout(resolve, 500));
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ maxWidth: "400px", width: "90%" }}>
        <h2
          style={{
            margin: "0 0 16px",
            fontSize: "18px",
            fontWeight: 600,
            color: COLORS.text,
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
              style={{ cursor: "pointer" }}
            />
            <span style={{ color: COLORS.text, fontSize: "13px" }}>
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
              style={{ cursor: "pointer" }}
            />
            <span style={{ color: COLORS.text, fontSize: "13px" }}>
              Push Notifications
            </span>
          </label>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "10px",
              background: COLORS.border,
              color: COLORS.text,
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            style={{
              flex: 1,
              padding: "10px",
              background: COLORS.primary,
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "13px",
              fontWeight: 500,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

function TeamManagementModal({
  userId,
  onClose,
}: {
  userId: number;
  onClose: () => void;
}) {
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [addingUser, setAddingUser] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editStatus, setEditStatus] = useState("");

  // Fetch team on mount
  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const res = await fetch("/api/teams", {
          headers: { "x-user-id": userId.toString() },
        });
        const data = await res.json();
        setTeam(data.team);
      } catch (err) {
        console.error("Failed to fetch team:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeam();
  }, [userId]);

  const handleAddUser = async () => {
    if (!email.trim()) {
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
          "x-user-id": userId.toString(),
        },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setEmail("");
        // Refresh team
        const teamRes = await fetch("/api/teams", {
          headers: { "x-user-id": userId.toString() },
        });
        const teamData = await teamRes.json();
        setTeam(teamData.team);
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
    try {
      const res = await fetch(`/api/teams/${memberId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId.toString(),
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setEditingId(null);
        // Refresh team
        const teamRes = await fetch("/api/teams", {
          headers: { "x-user-id": userId.toString() },
        });
        const teamData = await teamRes.json();
        setTeam(teamData.team);
      }
    } catch (err) {
      console.error("Failed to update member:", err);
    }
  };

  const handleDeactivate = async (memberId: number) => {
    if (!confirm("Are you sure you want to remove this user from your team?"))
      return;

    try {
      const res = await fetch(`/api/teams/${memberId}`, {
        method: "DELETE",
        headers: { "x-user-id": userId.toString() },
      });

      if (res.ok) {
        // Refresh team
        const teamRes = await fetch("/api/teams", {
          headers: { "x-user-id": userId.toString() },
        });
        const teamData = await teamRes.json();
        setTeam(teamData.team);
      }
    } catch (err) {
      console.error("Failed to remove member:", err);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div
        style={{
          maxWidth: "500px",
          width: "90%",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        <h2
          style={{
            margin: "0 0 16px",
            fontSize: "18px",
            fontWeight: 600,
            color: COLORS.text,
          }}
        >
          Team Management
        </h2>

        {loading ? (
          <div
            style={{
              color: COLORS.muted,
              textAlign: "center",
              padding: "20px",
            }}
          >
            Loading team...
          </div>
        ) : (
          <>
            {/* Add User Section */}
            <div
              style={{
                marginBottom: "20px",
                paddingBottom: "20px",
                borderBottom: `1px solid ${COLORS.border}`,
              }}
            >
              <h3
                style={{
                  margin: "0 0 12px",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: COLORS.text,
                }}
              >
                Add User
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
                    background: COLORS.bg,
                    color: COLORS.text,
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
                  color: COLORS.text,
                }}
              >
                Team Members ({team?.members?.length || 0})
              </h3>
              {team?.members && team.members.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {team.members.map((member: any) => (
                    <div
                      key={member.id}
                      style={{
                        padding: "12px",
                        background: COLORS.hover,
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
                              color: COLORS.text,
                              fontSize: "13px",
                              fontWeight: 500,
                            }}
                          >
                            {member.user.name}
                          </div>
                          <div
                            style={{ color: COLORS.muted, fontSize: "12px" }}
                          >
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
                                      ? "#10b981"
                                      : "#6b7280",
                                  color: "#fff",
                                  borderRadius: "4px",
                                  fontSize: "12px",
                                  fontWeight: 500,
                                }}
                              >
                                {member.status}
                              </span>
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
                                  background: COLORS.danger,
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  fontSize: "12px",
                                }}
                              >
                                Remove
                              </button>
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
          </>
        )}

        <div style={{ marginTop: "20px" }}>
          <button
            onClick={onClose}
            style={{
              width: "100%",
              padding: "10px",
              background: COLORS.border,
              color: COLORS.text,
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

function ModalOverlay({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: COLORS.cardBg,
          borderRadius: "8px",
          padding: "24px",
          color: COLORS.text,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
