"use client";

import { useState, useEffect } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description: string;
    memberIds: number[];
    profilePictureFile?: File;
  }) => Promise<void>;
  currentUserId: number;
}

const COLORS = {
  bg: "#ffffff",
  cardBg: "#F9FAFD",
  text: "#1f2937",
  muted: "#a0aec0",
  border: "rgba(0,0,0,0.1)",
  primary: "#5d8bb1",
  shadow: "#E1F1FD",
};

export default function CreateChannelModal({
  isOpen,
  onClose,
  onSubmit,
  currentUserId,
}: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/teams", {
          headers: {
            "x-user-id": String(currentUserId),
          },
        });
        const data = await res.json();
        // Extract team members
        const members = data?.team?.members?.map((m: any) => m.user) || [];
        setUsers(members);
      } catch (err) {
        console.error("Failed to fetch users:", err);
      }
    };
    fetchUsers();
  }, [isOpen, currentUserId]);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Channel name is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await onSubmit({
        name,
        description,
        memberIds: selectedUsers,
      });
      setName("");
      setDescription("");
      setSelectedUsers([]);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to create channel");
    } finally {
      setLoading(false);
    }
  };

  return isOpen ? (
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
          maxWidth: "400px",
          width: "90%",
          color: COLORS.text,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 600 }}>
          Create Channel
        </h2>

        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            Channel Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="# channel-name"
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
            }}
          >
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this channel about?"
            style={{
              width: "100%",
              padding: "10px 12px",
              border: `1px solid ${COLORS.border}`,
              borderRadius: "6px",
              background: COLORS.bg,
              color: COLORS.text,
              fontSize: "13px",
              boxSizing: "border-box",
              resize: "vertical",
              minHeight: "80px",
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
            }}
          >
            Add Members
          </label>
          <div
            style={{
              maxHeight: "150px",
              overflowY: "auto",
              border: `1px solid ${COLORS.border}`,
              borderRadius: "6px",
              background: COLORS.bg,
              padding: "8px",
            }}
          >
            {users.map((user) => (
              <label
                key={user.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "8px",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(user.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedUsers([...selectedUsers, user.id]);
                    } else {
                      setSelectedUsers(
                        selectedUsers.filter((id) => id !== user.id),
                      );
                    }
                  }}
                  style={{ marginRight: "8px", cursor: "pointer" }}
                />
                {user.name}{" "}
                {user.id === currentUserId && (
                  <span style={{ color: COLORS.primary, marginLeft: "4px" }}>
                    (You)
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>

        {error && (
          <div
            style={{ color: "#ef4444", marginBottom: "16px", fontSize: "13px" }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "10px 12px",
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
            onClick={handleCreate}
            disabled={loading}
            style={{
              flex: 1,
              padding: "10px 12px",
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
            {loading ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  ) : null;
}
