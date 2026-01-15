"use client";

import React, { useState, useEffect } from "react";
import { X, Upload, Search } from "lucide-react";

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  profilePicture?: string;
  active?: boolean;
}

interface ChannelCreationModalProps {
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

export function ChannelCreationModal({
  isOpen,
  onClose,
  onSubmit,
  currentUserId,
}: ChannelCreationModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Set<number>>(
    new Set()
  );
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(
    null
  );
  const [profilePicturePreview, setProfilePicturePreview] = useState<
    string | null
  >(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  useEffect(() => {
    // Filter users based on search query
    if (searchQuery.trim() === "") {
      setFilteredUsers(allUsers);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(
        allUsers.filter(
          (user) =>
            user.firstName.toLowerCase().includes(query) ||
            user.lastName.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, allUsers]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const userId =
        typeof window !== "undefined" ? localStorage.getItem("userId") : null;
      const response = await fetch("/api/users", {
        headers: userId ? { "x-user-id": userId } : {},
      });
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      const data = await response.json();
      // Filter out inactive users and current user
      const activeUsers = (data.users || []).filter(
        (user: User) => user.active !== false && user.id !== currentUserId
      );
      setAllUsers(activeUsers);
      setFilteredUsers(activeUsers);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const toggleMember = (userId: number) => {
    const newSelectedMembers = new Set(selectedMembers);
    if (newSelectedMembers.has(userId)) {
      newSelectedMembers.delete(userId);
    } else {
      newSelectedMembers.add(userId);
    }
    setSelectedMembers(newSelectedMembers);
  };

  const handleProfilePictureChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePictureFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfilePicturePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Channel name is required");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        memberIds: Array.from(selectedMembers),
        profilePictureFile: profilePictureFile || undefined,
      });
      // Reset form
      setName("");
      setDescription("");
      setSelectedMembers(new Set());
      setProfilePictureFile(null);
      setProfilePicturePreview(null);
      setSearchQuery("");
      onClose();
    } catch (err) {
      console.error("Error creating channel:", err);
      setError(err instanceof Error ? err.message : "Failed to create channel");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Create New Channel
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition"
            disabled={submitting}
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Channel Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Channel Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Marketing Team, Product Updates"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={submitting}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this channel about?"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              disabled={submitting}
            />
          </div>

          {/* Profile Picture */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Channel Picture
            </label>
            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureChange}
                  className="hidden"
                  id="profile-picture-input"
                  disabled={submitting}
                />
                <label
                  htmlFor="profile-picture-input"
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition"
                >
                  <Upload size={18} className="text-gray-600" />
                  <span className="text-sm text-gray-700">Upload Image</span>
                </label>
              </div>
              {profilePicturePreview && (
                <div className="flex items-center gap-2">
                  <img
                    src={profilePicturePreview}
                    alt="Preview"
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setProfilePictureFile(null);
                      setProfilePicturePreview(null);
                    }}
                    className="text-sm text-red-600 hover:text-red-700"
                    disabled={submitting}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Members Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Members
            </label>
            <p className="text-xs text-gray-500 mb-3">
              You will be added as a member automatically
            </p>

            {/* Search */}
            <div className="relative mb-4">
              <Search
                size={18}
                className="absolute left-3 top-2.5 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading || submitting}
              />
            </div>

            {/* Members List */}
            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
              {loading ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  Loading users...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No users found
                </div>
              ) : (
                <div className="divide-y">
                  {filteredUsers.map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMembers.has(user.id)}
                        onChange={() => toggleMember(user.id)}
                        disabled={submitting}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {user.email}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {selectedMembers.size > 0 && (
              <div className="mt-3 text-sm text-gray-600">
                {selectedMembers.size} member
                {selectedMembers.size !== 1 ? "s" : ""} selected
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Creating..." : "Create Channel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
