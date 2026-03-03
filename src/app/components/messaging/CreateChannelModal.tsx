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
      className="fixed inset-0 bg-black/50 flex justify-center items-center z-[1000] p-5"
      onClick={onClose}
    >
      <div
        className="w-[min(96%,400px)] max-w-[400px] bg-slate-900 rounded-lg border border-black/10 p-6 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Create Channel</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-300"
          >
            ✕
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Channel Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="# channel-name"
            className="w-full px-3 py-2 rounded-lg bg-blue-950 text-white border border-white/10"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this channel about?"
            className="w-full px-3 py-2 rounded-lg bg-blue-950 text-white border border-white/10 min-h-[80px] resize-y"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Add Members</label>
          <div className="max-h-[150px] overflow-y-auto border border-white/10 rounded-lg p-2 bg-blue-950">
            {users.map((user) => (
              <label
                key={user.id}
                className="flex items-center gap-3 p-2 cursor-pointer text-sm"
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
                  className="w-4 h-4"
                />
                <span className="flex-1">{user.name}</span>
                {user.id === currentUserId && (
                  <span className="text-blue-400">(You)</span>
                )}
              </label>
            ))}
          </div>
        </div>

        {error && <div className="text-red-500 mb-4 text-sm">{error}</div>}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 rounded-lg bg-white/5 text-white border border-white/10"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="flex-1 px-3 py-2 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  ) : null;
}
