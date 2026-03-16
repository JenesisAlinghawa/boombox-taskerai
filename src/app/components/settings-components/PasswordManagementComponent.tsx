"use client";

import React, { useState } from "react";
import { Check } from "lucide-react";

interface User {
  id: string;
}

interface Props {
  currentUser: User | null;
  onError: (error: string) => void;
}

export function PasswordManagementComponent({ currentUser, onError }: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showPasswordStrength, setShowPasswordStrength] = useState(false);

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(newPassword);
  const strengthLabels = ["Very Weak", "Weak", "Fair", "Good", "Strong", "Very Strong"];
  const strengthColors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-lime-500",
    "bg-green-500",
    "bg-emerald-500",
  ];

  const handleChangePassword = async () => {
    if (!currentUser) return;

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

    if (currentPassword === newPassword) {
      onError("New password must be different from current password");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/user-management/${currentUser.id}/change-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": String(currentUser.id),
          },
          body: JSON.stringify({
            currentPassword,
            newPassword,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to change password");
      }

      setMessage("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentUser) {
    return <p className="text-gray-600">Loading user data...</p>;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
        <h2 className="text-xl font-bold text-gray-900">Password Management</h2>
      </div>

      <div className="p-6 space-y-4">
        {/* Current Password */}
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-2">
            Current Password
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
            placeholder="Enter current password"
          />
        </div>

        {/* New Password */}
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-2">
            New Password
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setShowPasswordStrength(e.target.value.length > 0);
            }}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
            placeholder="Enter new password"
          />

          {/* Password Strength Indicator */}
          {showPasswordStrength && newPassword && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${strengthColors[passwordStrength]} transition-all`}
                    style={{ width: `${((passwordStrength + 1) / 6) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-gray-600">
                  {strengthLabels[passwordStrength]}
                </span>
              </div>
              <ul className="text-xs text-gray-600 space-y-1">
                <li className={/[A-Z]/.test(newPassword) ? "text-green-600" : ""}>
                  {/[A-Z]/.test(newPassword) ? "✓" : "○"} Uppercase letter
                </li>
                <li className={/[0-9]/.test(newPassword) ? "text-green-600" : ""}>
                  {/[0-9]/.test(newPassword) ? "✓" : "○"} Number
                </li>
                <li
                  className={/[^A-Za-z0-9]/.test(newPassword) ? "text-green-600" : ""}
                >
                  {/[^A-Za-z0-9]/.test(newPassword) ? "✓" : "○"} Special character
                </li>
                <li className={newPassword.length >= 8 ? "text-green-600" : ""}>
                  {newPassword.length >= 8 ? "✓" : "○"} At least 8 characters
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-2">
            Confirm Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
            placeholder="Confirm new password"
          />
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-red-600 mt-1">
              Passwords do not match
            </p>
          )}
          {confirmPassword && newPassword === confirmPassword && (
            <p className="text-xs text-green-600 mt-1">
              ✓ Passwords match
            </p>
          )}
        </div>

        {message && (
          <div className="p-3 bg-green-50 border border-green-300 rounded-lg text-green-800 text-sm flex items-center gap-2">
            <Check size={16} />
            {message}
          </div>
        )}

        <button
          onClick={handleChangePassword}
          disabled={isSaving}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-semibold text-sm mt-6"
        >
          {isSaving ? "Changing Password..." : "Change Password"}
        </button>
      </div>
    </div>
  );
}
