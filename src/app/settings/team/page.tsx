/**
 * Team Management Page with Role-Based Access Control
 *
 * This page is protected by role checks. Only OWNER, CO_OWNER, and MANAGER
 * can access this page. Other roles see an "Access Denied" message.
 *
 * Features:
 * - View team members
 * - Add new users (admin only)
 * - Manage user roles
 * - Remove team members
 * - Promote users to CO_OWNER (OWNER only)
 */

"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/utils/sessionManager";
import { AlertCircle, Lock, Plus, Edit2, Trash2, Crown } from "lucide-react";

interface User {
  id: number;
  name: string;
  email: string;
  role: "EMPLOYEE" | "TEAM_LEAD" | "MANAGER" | "CO_OWNER" | "OWNER";
}

interface TeamUser extends User {
  createdAt: string;
}

const COLORS = {
  bg: "#ffffff",
  cardBg: "#F9FAFD",
  text: "#1f2937",
  muted: "#6b7280",
  border: "rgba(0,0,0,0.1)",
  primary: "#5d8bb1",
  danger: "#ef4444",
  success: "#10b981",
  shadow: "#E1F1FD",
  lockBg: "#fef2f2",
  lockBorder: "#fee2e2",
};

export default function TeamManagementPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    password: "",
    role: "EMPLOYEE",
  });

  // Determine if current user is authorized to manage team
  const isAuthorized = (role?: string) => {
    return role === "OWNER" || role === "CO_OWNER" || role === "MANAGER";
  };

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      try {
        const user = await getCurrentUser();

        if (!user) {
          router.push("/auth/login");
          return;
        }

        setCurrentUser(user as User);

        // Check if user has permission to access team management
        if (!isAuthorized(user.role)) {
          // User is not authorized - show access denied UI but don't redirect
          setError(
            `Access Denied: Your role (${user.role}) cannot manage team members`
          );
          setLoading(false);
          return;
        }

        // Fetch users list
        await fetchUsers(user.id);
      } catch (err) {
        console.error("Error checking auth:", err);
        setError("Failed to verify permissions");
        setLoading(false);
      }
    };

    checkAuthAndFetch();
  }, [router]);

  const fetchUsers = async (userId: number) => {
    try {
      const res = await fetch("/api/users", {
        headers: {
          "x-user-id": String(userId),
        },
      });

      if (!res.ok) {
        if (res.status === 403) {
          setError("You do not have permission to manage users");
          return;
        }
        throw new Error("Failed to fetch users");
      }

      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to load team members");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!currentUser || !isAuthorized(currentUser.role)) {
      setError("You do not have permission to add users");
      return;
    }

    if (!formData.email || !formData.name || !formData.password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(currentUser.id),
        },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          password: formData.password,
          role: formData.role,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create user");
        return;
      }

      const data = await res.json();
      setUsers([...users, data.user]);
      setFormData({ email: "", name: "", password: "", role: "EMPLOYEE" });
      setShowAddForm(false);
      setError(null);
    } catch (err) {
      console.error("Error adding user:", err);
      setError("Failed to add user");
    }
  };

  const handlePromote = async (userId: number) => {
    if (currentUser?.role !== "OWNER") {
      setError("Only Owner can promote users");
      return;
    }

    try {
      const res = await fetch("/api/users/promote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(currentUser.id),
        },
        body: JSON.stringify({
          userId,
          newRole: "CO_OWNER",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to promote user");
        return;
      }

      const data = await res.json();
      setUsers(users.map((u) => (u.id === userId ? data.user : u)));
      setError(null);
    } catch (err) {
      console.error("Error promoting user:", err);
      setError("Failed to promote user");
    }
  };

  // If not authorized, show access denied UI
  if (!loading && !isAuthorized(currentUser?.role) && error) {
    return (
      <div
        style={{
          padding: "40px 20px",
          minHeight: "100vh",
          background: COLORS.bg,
        }}
      >
        <div
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            padding: "40px",
            borderRadius: "12px",
            background: COLORS.lockBg,
            border: `2px solid ${COLORS.lockBorder}`,
            textAlign: "center",
          }}
        >
          <Lock
            size={64}
            color={COLORS.danger}
            style={{ margin: "0 auto 20px" }}
          />
          <h1 style={{ color: COLORS.text, marginBottom: "10px" }}>
            Access Denied
          </h1>
          <p style={{ color: COLORS.muted, marginBottom: "20px" }}>
            Your role ({currentUser?.role}) does not have permission to access
            Team Management. Only Managers, Co-Owners, and Owners can manage
            team members.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            style={{
              padding: "10px 20px",
              background: COLORS.primary,
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          padding: "40px 20px",
          minHeight: "100vh",
          background: COLORS.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: COLORS.muted }}>Loading team management...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "40px 20px",
        minHeight: "100vh",
        background: COLORS.bg,
      }}
    >
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "30px",
          }}
        >
          <h1 style={{ color: COLORS.text, margin: 0 }}>Team Management</h1>
          {isAuthorized(currentUser?.role) && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                background: COLORS.primary,
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              <Plus size={18} />
              Add User
            </button>
          )}
        </div>

        {error && (
          <div
            style={{
              padding: "15px",
              background: "#fee2e2",
              border: `1px solid ${COLORS.danger}`,
              borderRadius: "6px",
              color: COLORS.danger,
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {showAddForm && isAuthorized(currentUser?.role) && (
          <div
            style={{
              padding: "20px",
              background: COLORS.cardBg,
              border: `1px solid ${COLORS.border}`,
              borderRadius: "8px",
              marginBottom: "30px",
            }}
          >
            <h3 style={{ color: COLORS.text, marginTop: 0 }}>Add New User</h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "15px",
                marginBottom: "15px",
              }}
            >
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                style={{
                  padding: "10px",
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: "6px",
                  fontSize: "14px",
                }}
              />
              <input
                type="text"
                placeholder="Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                style={{
                  padding: "10px",
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: "6px",
                  fontSize: "14px",
                }}
              />
              <input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                style={{
                  padding: "10px",
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: "6px",
                  fontSize: "14px",
                }}
              />
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                style={{
                  padding: "10px",
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: "6px",
                  fontSize: "14px",
                }}
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="TEAM_LEAD">Team Lead</option>
                <option value="MANAGER">Manager</option>
                {currentUser?.role === "OWNER" && (
                  <option value="CO_OWNER">Co-Owner</option>
                )}
              </select>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={handleAddUser}
                style={{
                  padding: "10px 20px",
                  background: COLORS.success,
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Create User
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                style={{
                  padding: "10px 20px",
                  background: COLORS.muted,
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div
          style={{
            background: COLORS.cardBg,
            border: `1px solid ${COLORS.border}`,
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 2fr 1fr 1fr auto",
              gap: "15px",
              padding: "15px",
              background: COLORS.bg,
              borderBottom: `1px solid ${COLORS.border}`,
              fontWeight: "600",
              fontSize: "14px",
              color: COLORS.muted,
            }}
          >
            <div>Name</div>
            <div>Email</div>
            <div>Role</div>
            <div>Created</div>
            <div>Actions</div>
          </div>

          {users.map((user) => (
            <div
              key={user.id}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 2fr 1fr 1fr auto",
                gap: "15px",
                padding: "15px",
                borderBottom: `1px solid ${COLORS.border}`,
                alignItems: "center",
              }}
            >
              <div style={{ color: COLORS.text, fontSize: "14px" }}>
                {user.name}
              </div>
              <div style={{ color: COLORS.muted, fontSize: "14px" }}>
                {user.email}
              </div>
              <div
                style={{
                  display: "inline-block",
                  padding: "4px 12px",
                  background:
                    user.role === "OWNER"
                      ? "#fef3c7"
                      : user.role === "CO_OWNER"
                      ? "#dbeafe"
                      : user.role === "MANAGER"
                      ? "#d1fae5"
                      : "#f3f4f6",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "500",
                  color:
                    user.role === "OWNER"
                      ? "#92400e"
                      : user.role === "CO_OWNER"
                      ? "#1e40af"
                      : user.role === "MANAGER"
                      ? "#065f46"
                      : "#374151",
                }}
              >
                {user.role}
              </div>
              <div style={{ color: COLORS.muted, fontSize: "14px" }}>
                {new Date(user.createdAt).toLocaleDateString()}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                {currentUser?.role === "OWNER" && user.role !== "OWNER" && (
                  <button
                    onClick={() => handlePromote(user.id)}
                    title="Promote to Co-Owner"
                    style={{
                      padding: "6px 10px",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: COLORS.primary,
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Crown size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
