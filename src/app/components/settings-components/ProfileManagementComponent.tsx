"use client";

import React, { useState, useRef } from "react";
import { Upload, Users, Check } from "lucide-react";
import { saveUserSession } from "@/utils/sessionManager";

interface Employee {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isVerified: boolean;
  profilePicture?: string;
  emailNotifications?: boolean;
  messageNotifications?: boolean;
}

interface Props {
  currentEmployee: Employee | null;
  onError: (error: string) => void;
}

export function ProfileManagementComponent({
  currentEmployee,
  onError,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile state
  const [firstName, setFirstName] = useState(currentEmployee?.firstName || "");
  const [lastName, setLastName] = useState(currentEmployee?.lastName || "");
  const [profilePicture, setProfilePicture] = useState(
    currentEmployee?.profilePicture || "",
  );
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");

  const handleProfilePictureChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
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
    if (!currentEmployee) return;
    setProfileSaving(true);
    setProfileMessage("");

    try {
      const response = await fetch(
        `/api/user-management/${currentEmployee.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": String(currentEmployee.id),
          },
          body: JSON.stringify({
            firstName,
            lastName,
            profilePicture,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save profile");
      }

      setProfileMessage("Profile updated successfully");

      // Save updated profile to localStorage
      const updatedEmployee = {
        ...currentEmployee,
        firstName,
        lastName,
        profilePicture,
      } as Employee;
      saveUserSession(updatedEmployee as any);

      // Dispatch custom event to notify sidebar of profile update
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("profileUpdated"));
      }

      setTimeout(() => setProfileMessage(""), 3000);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setProfileSaving(false);
    }
  };

  const changePassword = async () => {
    if (!currentEmployee) return;

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      onError("All password fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      onError("New password and confirm password do not match");
      return;
    }

    if (newPassword.length < 6) {
      onError("Password must be at least 6 characters long");
      return;
    }

    setPasswordSaving(true);
    setPasswordMessage("");

    try {
      const response = await fetch(
        `/api/user-management/${currentEmployee.id}/change-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": String(currentEmployee.id),
          },
          body: JSON.stringify({
            currentPassword,
            newPassword,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to change password");
      }

      setPasswordMessage("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordMessage(""), 3000);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setPasswordSaving(false);
    }
  };

  if (!currentEmployee) {
    return <p className="text-black/60">Loading user data...</p>;
  }

  return (
    <div className="w-full space-y-1">
      {/* Profile Information Card */}
      <div className="bg-blue-100 backdrop-blur-md border border-black/10 rounded-sm p-4">
        <h2 className="text-lg font-semibold text-black/80 mb-3">
          Update Profile Details
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
          {/* Left Column: Profile Picture */}
          <div className="flex flex-col items-center justify-start">
            <label className="block text-sm font-medium text-black/70 mb-4 text-center">
              Profile Picture
            </label>
            <div className="w-32 h-32 rounded-sm bg-white/70 flex items-center justify-center overflow-hidden border border-black/10 mb-4">
              {profilePicture ? (
                <img
                  src={profilePicture}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Users size={48} className="text-black/40" />
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors font-medium"
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

          {/* Right Column: Form Inputs */}
          <div className="lg:col-span-2 space-y-4">
            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-black/70 mb-2">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-2 border border-black/10 rounded-sm bg-white/50 text-black placeholder-black/40 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Your first name"
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-black/70 mb-2">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-2 border border-black/10 rounded-sm bg-white/50 text-black placeholder-black/40 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Your last name"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-black/70 mb-2">
                Email (Read-only)
              </label>
              <input
                type="email"
                value={currentEmployee.email}
                disabled
                className="w-full px-4 py-2 border border-black/10 rounded-sm bg-gray-100 text-black/60 cursor-not-allowed"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-black/70 mb-2">
                Role (Read-only)
              </label>
              <input
                type="text"
                value={currentEmployee.role}
                disabled
                className="w-full px-4 py-2 border border-black/10 rounded-sm bg-gray-100 text-black/60 cursor-not-allowed"
              />
            </div>

            {profileMessage && (
              <div className="p-3 bg-green-100 border border-green-300 rounded-sm text-green-800 text-sm flex items-center gap-2">
                <Check size={16} />
                {profileMessage}
              </div>
            )}

            <button
              onClick={saveProfile}
              disabled={profileSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
            >
              {profileSaving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="bg-blue-100 backdrop-blur-md border border-black/10 rounded-sm p-6">
        <h2 className="text-lg font-semibold text-black/80 mb-6">
          Change Password
        </h2>

        <div className="max-w-md space-y-4">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-black/70 mb-2">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2 border border-black/10 rounded-sm bg-white/50 text-black placeholder-black/40 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Enter current password"
            />
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-black/70 mb-2">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 border border-black/10 rounded-sm bg-white/50 text-black placeholder-black/40 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Enter new password"
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-black/70 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-black/10 rounded-sm bg-white/50 text-black placeholder-black/40 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Confirm new password"
            />
          </div>

          {passwordMessage && (
            <div className="p-3 bg-green-100 border border-green-300 rounded-sm text-green-800 text-sm flex items-center gap-2">
              <Check size={16} />
              {passwordMessage}
            </div>
          )}

          <button
            onClick={changePassword}
            disabled={passwordSaving}
            className="px-6 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
          >
            {passwordSaving ? "Changing..." : "Change Password"}
          </button>
        </div>
      </div>
    </div>
  );
}
