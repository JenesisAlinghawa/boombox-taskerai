"use client";

import React, { useState, useEffect } from "react";
import { Plus, Users, Check, Trash2, MoreVertical } from "lucide-react";
import { useConfirm } from "@/app/components/providers-popups/ConfirmationDialogProviderComponent";

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isVerified: boolean;
  active?: boolean;
  profilePicture?: string;
}

interface Props {
  currentUser: User | null;
  canManageUsers: boolean;
  onError: (error: string) => void;
}

const ROLES = ["USER", "MANAGER", "ADMIN", "OWNER"];

export function TeamManagementComponent({
  currentUser,
  canManageUsers,
  onError,
}: Props) {
  const confirm = useConfirm();
  const [users, setUsers] = useState<User[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [teamLoading, setTeamLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState<number | null>(null);
  const [showDeleteDropdown, setShowDeleteDropdown] = useState<number | null>(
    null,
  );
  const [approvingUserId, setApprovingUserId] = useState<number | null>(null);
  const [rejectingUserId, setRejectingUserId] = useState<number | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);

  useEffect(() => {
    if (canManageUsers) {
      fetchUsers();
    }
  }, [canManageUsers]);

  const fetchUsers = async () => {
    setTeamLoading(true);
    try {
      const userId =
        typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      const response = await fetch("/api/user-management", {
        headers: userId ? { "x-user-id": userId } : {},
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch users");
      }
      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to fetch users");
    } finally {
      setTeamLoading(false);
    }
  };

  const inviteUser = async () => {
    if (!inviteEmail) return;
    setInviting(true);

    try {
      const response = await fetch("/api/team-invitations/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });

      if (!response.ok) throw new Error("Failed to send invite");

      setInviteEmail("");
      onError(""); // Clear any previous errors
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setInviting(false);
    }
  };

  const promoteUser = async (userId: number, newRole: string) => {
    try {
      const sessionUserId =
        typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      const response = await fetch("/api/user-management/promote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionUserId && { "x-user-id": sessionUserId }),
        },
        body: JSON.stringify({ userId, newRole }),
      });

      if (!response.ok) throw new Error("Failed to promote user");

      fetchUsers();
      setShowRoleDropdown(null);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to promote user");
    }
  };

  const deleteUser = async (
    userId: number,
    action: "deactivate" | "delete",
  ) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    let confirmed = false;
    if (action === "deactivate") {
      confirmed = await confirm({
        title: "Deactivate User",
        message: `Are you sure you want to deactivate ${user.firstName} ${user.lastName}? They will not be able to log in until reactivated.`,
      });
    } else {
      confirmed = await confirm({
        title: "Delete User",
        message: `Are you sure you want to permanently delete ${user.firstName} ${user.lastName}? This user will be removed from the database and can register again with a new account.`,
      });
    }

    if (!confirmed) return;

    setDeletingUserId(userId);
    try {
      const sessionUserId =
        typeof window !== "undefined" ? localStorage.getItem("userId") : null;

      let endpoint = "";
      let method = "DELETE";
      let body = undefined;

      if (action === "deactivate") {
        // Deactivate user - restrict access but keep account
        endpoint = `/api/user-management/${userId}/deactivate`;
        method = "PATCH";
        body = JSON.stringify({ active: false });
      } else {
        // Delete user completely from database
        endpoint = `/api/user-management/${userId}`;
        method = "DELETE";
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(sessionUserId && { "x-user-id": sessionUserId }),
        },
        ...(body && { body }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process user action");
      }

      fetchUsers();
      setShowDeleteDropdown(null);
      onError(""); // Clear any previous errors

      // Show success message
      const actionText = action === "deactivate" ? "Deactivated" : "Deleted";
      onError(""); // This will be replaced with a success toast if needed
    } catch (err) {
      onError(
        err instanceof Error ? err.message : "Failed to process user action",
      );
    } finally {
      setDeletingUserId(null);
    }
  };

  const approveUser = async (userId: number) => {
    setApprovingUserId(userId);
    try {
      const sessionUserId =
        typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      const response = await fetch(`/api/user-management/${userId}/approve`, {
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
      onError(err instanceof Error ? err.message : "Failed to approve user");
      alert(err instanceof Error ? err.message : "Failed to approve user");
    } finally {
      setApprovingUserId(null);
    }
  };

  const rejectUser = async (userId: number) => {
    if (
      !(await confirm({
        message:
          "Are you sure you want to reject this user? Their account will be deleted.",
      }))
    )
      return;

    setRejectingUserId(userId);
    try {
      const sessionUserId =
        typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      const response = await fetch(`/api/user-management/${userId}/deny`, {
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
      onError(err instanceof Error ? err.message : "Failed to reject user");
      alert(err instanceof Error ? err.message : "Failed to reject user");
    } finally {
      setRejectingUserId(null);
    }
  };

  if (!canManageUsers) {
    return (
      <p className="text-black/60">
        You don't have permission to manage team members
      </p>
    );
  }

  return (
    <div className="w-full space-y-2">
      {/* Invite Section */}
      <div className="bg-blue-100 backdrop-blur-md border border-black/10 rounded-sm p-6">
        <h3 className="font-semibold text-black/80 mb-4 flex items-center gap-2">
          <Plus size={18} />
          Add New Team Member
        </h3>
        <div className="flex gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="Enter email address"
            className="flex-1 px-4 py-2 border border-black/10 rounded-sm bg-white/50 text-black placeholder-black/40 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          <button
            onClick={inviteUser}
            disabled={inviting || !inviteEmail}
            className="px-6 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
          >
            {inviting ? "Sending..." : "Send Invite"}
          </button>
        </div>
        <p className="text-xs text-black/60 mt-2">
          An invitation link will be sent to their email
        </p>
      </div>

      {/* Users List */}
      <div className="bg-blue-100 backdrop-blur-md border border-black/10 rounded-sm p-6">
        <h3 className="font-semibold text-black/80 mb-4 flex items-center gap-2">
          <Users size={18} />
          Team Members ({users.length})
        </h3>

        {teamLoading ? (
          <p className="text-black/60">Loading team members...</p>
        ) : users.length === 0 ? (
          <p className="text-black/60">No team members yet</p>
        ) : (
          <div className="space-y-2">
            {users.map((user) => (
              <div
                key={user.id}
                className="p-4 border border-black/10 rounded-sm flex items-center justify-between hover:bg-white/30 transition-colors bg-white/20"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-black/80">
                      {user.firstName} {user.lastName}
                    </h4>
                    <span className="text-xs font-medium px-2 py-1 bg-blue-500 text-white rounded">
                      {user.role}
                    </span>
                  </div>
                  <p className="text-sm text-black/70 truncate">{user.email}</p>
                  <p className="text-xs text-black/60 mt-1">
                    {!user.active && (
                      <span className="inline-block px-2 py-0.5 bg-amber-200 text-amber-800 rounded">
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
                              className="text-sm px-3 py-1 bg-green-200 text-green-800 rounded hover:bg-green-300 transition-colors disabled:opacity-50 whitespace-nowrap flex items-center gap-1 font-medium"
                            >
                              <Check size={14} />
                              {approvingUserId === user.id
                                ? "Approving..."
                                : "Approve"}
                            </button>
                            <button
                              onClick={() => rejectUser(user.id)}
                              disabled={rejectingUserId === user.id}
                              className="text-sm px-3 py-1 bg-red-200 text-red-800 rounded hover:bg-red-300 transition-colors disabled:opacity-50 whitespace-nowrap font-medium"
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
                                  showRoleDropdown === user.id ? null : user.id,
                                )
                              }
                              className="text-sm px-3 py-1 bg-white/40 text-black/80 rounded hover:bg-white/60 transition-colors whitespace-nowrap font-medium border border-black/10"
                            >
                              Change Role
                            </button>

                            {showRoleDropdown === user.id && (
                              <div className="absolute right-0 mt-1 bg-white border border-black/10 rounded shadow-lg z-10 w-40">
                                {ROLES.map((role) => (
                                  <button
                                    key={role}
                                    onClick={() => promoteUser(user.id, role)}
                                    className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors text-sm text-black/80 font-medium"
                                  >
                                    {role}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="relative">
                          <button
                            onClick={() =>
                              setShowDeleteDropdown(
                                showDeleteDropdown === user.id ? null : user.id,
                              )
                            }
                            className="p-1 text-black/60 hover:bg-red-100 hover:text-red-700 rounded transition-colors"
                            title="Delete options"
                            disabled={deletingUserId === user.id}
                          >
                            <MoreVertical size={16} />
                          </button>

                          {showDeleteDropdown === user.id && (
                            <div className="absolute right-0 mt-1 bg-white border border-black/10 rounded shadow-lg z-10 w-48">
                              <button
                                onClick={() =>
                                  deleteUser(user.id, "deactivate")
                                }
                                disabled={deletingUserId === user.id}
                                className="w-full text-left px-4 py-2 hover:bg-yellow-50 transition-colors text-sm text-yellow-700 font-medium flex items-center gap-2 disabled:opacity-50"
                              >
                                <Trash2 size={14} />
                                Deactivate User
                              </button>
                              <button
                                onClick={() => deleteUser(user.id, "delete")}
                                disabled={deletingUserId === user.id}
                                className="w-full text-left px-4 py-2 hover:bg-red-100 transition-colors text-sm text-red-800 font-medium flex items-center gap-2 border-t border-black/10 disabled:opacity-50"
                              >
                                <Trash2 size={14} />
                                Delete User
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
