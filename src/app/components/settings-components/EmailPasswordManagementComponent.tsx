"use client";

import React, { useState } from "react";
import { Check, Eye, EyeOff } from "lucide-react";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isVerified: boolean;
  profilePicture?: string;
}

interface Props {
  currentUser: User | null;
  onError: (error: string) => void;
}

export function EmailPasswordManagementComponent({
  currentUser,
  onError,
}: Props) {
  // Email state
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [showPasswordStrength, setShowPasswordStrength] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  if (!currentUser) {
    return <p className="text-gray-600">Loading user data...</p>;
  }

  // Password strength calculation
  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength++;
    if (password.length >= 12) strength++;
    if (password.length >= 16) strength++;
    return strength;
  };

  const passwordStrength = calculatePasswordStrength(newPassword);
  const strengthLabels = [
    "Very Weak",
    "Weak",
    "Fair",
    "Good",
    "Strong",
    "Very Strong",
  ];
  const strengthColors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-lime-500",
    "bg-green-500",
    "bg-emerald-500",
  ];

  const passwordRequirements = {
    uppercase: /[A-Z]/.test(newPassword),
    numbers: /[0-9]/.test(newPassword),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword),
    length: newPassword.length >= 8,
  };

  const saveEmail = async () => {
    if (!newEmail) {
      setEmailMessage("Please enter a new email address");
      return;
    }
    if (!emailPassword) {
      setEmailMessage("Please enter your password to confirm");
      return;
    }

    setEmailSaving(true);
    setEmailMessage("");

    try {
      const response = await fetch(
        `/api/user-management/${currentUser.id}/change-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": String(currentUser.id),
          },
          body: JSON.stringify({
            newEmail,
            password: emailPassword,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to change email");
      }

      setEmailMessage("Email changed successfully");
      setNewEmail("");
      setEmailPassword("");
      setTimeout(() => setEmailMessage(""), 3000);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to change email");
    } finally {
      setEmailSaving(false);
    }
  };

  const savePassword = async () => {
    if (!currentPassword) {
      setPasswordMessage("Please enter your current password");
      return;
    }
    if (!newPassword) {
      setPasswordMessage("Please enter a new password");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage("Passwords do not match");
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordMessage(
        "New password must be different from current password"
      );
      return;
    }
    if (!Object.values(passwordRequirements).every((req) => req)) {
      setPasswordMessage(
        "Password does not meet all requirements (uppercase, numbers, special characters, 8+ characters)"
      );
      return;
    }

    setPasswordSaving(true);
    setPasswordMessage("");

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

      setPasswordMessage("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordStrength(false);
      setTimeout(() => setPasswordMessage(""), 3000);
    } catch (err) {
      onError(
        err instanceof Error ? err.message : "Failed to change password"
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Email Management Section */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 px-8 py-4 bg-gray-50">
          <h2 className="text-2xl font-bold text-gray-900">Email Address</h2>
        </div>

        <div className="p-8 space-y-6">
          {/* Current Email Display */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              Current Email
            </label>
            <div className="flex items-center gap-3">
              <input
                type="email"
                value={currentUser.email}
                disabled
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed text-sm"
              />
              {currentUser.isVerified && (
                <div className="px-3 py-2 bg-green-100 border border-green-300 rounded-lg flex items-center gap-2">
                  <Check size={16} className="text-green-600" />
                  <span className="text-sm font-medium text-green-700">
                    Verified
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* New Email Input */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              New Email Address
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Enter new email address"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
            />
          </div>

          {/* Password Confirmation */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              Confirm with Password
            </label>
            <input
              type="password"
              value={emailPassword}
              onChange={(e) => setEmailPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
            />
          </div>

          {/* Email Status Message */}
          {emailMessage && (
            <div
              className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                emailMessage.includes("successfully")
                  ? "bg-green-100 text-green-700 border border-green-300"
                  : "bg-red-100 text-red-700 border border-red-300"
              }`}
            >
              {emailMessage.includes("successfully") && (
                <Check size={16} />
              )}
              {emailMessage}
            </div>
          )}

          {/* Email Save Button */}
          <button
            onClick={saveEmail}
            disabled={emailSaving}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-semibold text-sm"
          >
            {emailSaving ? "Updating Email..." : "Update Email"}
          </button>
        </div>
      </div>

      {/* Password Management Section */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 px-8 py-4 bg-gray-50">
          <h2 className="text-2xl font-bold text-gray-900">Password</h2>
        </div>

        <div className="p-8 space-y-6">
          {/* Current Password */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                {showCurrentPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setShowPasswordStrength(e.target.value.length > 0);
                }}
                placeholder="Enter new password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          {/* Password Strength Indicator */}
          {showPasswordStrength && (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-gray-600">
                  Password Strength: {strengthLabels[passwordStrength]}
                </div>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`h-2 flex-1 rounded ${
                        i < passwordStrength
                          ? strengthColors[passwordStrength - 1]
                          : "bg-gray-200"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Requirements */}
              <div className="space-y-2 bg-gray-50 p-3 rounded">
                <div className="text-xs font-semibold text-gray-700 mb-2">
                  Requirements:
                </div>
                <div
                  className={`text-xs flex items-center gap-2 ${
                    passwordRequirements.uppercase
                      ? "text-green-700"
                      : "text-gray-600"
                  }`}
                >
                  {passwordRequirements.uppercase ? (
                    <Check size={14} />
                  ) : (
                    <div className="w-3.5 h-3.5" />
                  )}
                  Uppercase letter (A-Z)
                </div>
                <div
                  className={`text-xs flex items-center gap-2 ${
                    passwordRequirements.numbers
                      ? "text-green-700"
                      : "text-gray-600"
                  }`}
                >
                  {passwordRequirements.numbers ? (
                    <Check size={14} />
                  ) : (
                    <div className="w-3.5 h-3.5" />
                  )}
                  Number (0-9)
                </div>
                <div
                  className={`text-xs flex items-center gap-2 ${
                    passwordRequirements.special
                      ? "text-green-700"
                      : "text-gray-600"
                  }`}
                >
                  {passwordRequirements.special ? (
                    <Check size={14} />
                  ) : (
                    <div className="w-3.5 h-3.5" />
                  )}
                  Special character (!@#$...etc)
                </div>
                <div
                  className={`text-xs flex items-center gap-2 ${
                    passwordRequirements.length
                      ? "text-green-700"
                      : "text-gray-600"
                  }`}
                >
                  {passwordRequirements.length ? (
                    <Check size={14} />
                  ) : (
                    <div className="w-3.5 h-3.5" />
                  )}
                  At least 8 characters
                </div>
              </div>
            </div>
          )}

          {/* Confirm Password */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-600 mt-1">
                Passwords do not match
              </p>
            )}
          </div>

          {/* Password Status Message */}
          {passwordMessage && (
            <div
              className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                passwordMessage.includes("successfully")
                  ? "bg-green-100 text-green-700 border border-green-300"
                  : "bg-red-100 text-red-700 border border-red-300"
              }`}
            >
              {passwordMessage.includes("successfully") && (
                <Check size={16} />
              )}
              {passwordMessage}
            </div>
          )}

          {/* Password Save Button */}
          <button
            onClick={savePassword}
            disabled={passwordSaving}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-semibold text-sm"
          >
            {passwordSaving ? "Updating Password..." : "Update Password"}
          </button>
        </div>
      </div>
    </div>
  );
}
