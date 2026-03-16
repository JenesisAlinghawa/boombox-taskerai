"use client";

import React, { useState } from "react";
import { Check, AlertCircle } from "lucide-react";

interface User {
  id: string;
  email: string;
  isVerified: boolean;
}

interface Props {
  currentUser: User | null;
  onError: (error: string) => void;
}

export function EmailManagementComponent({ currentUser, onError }: Props) {
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  const handleChangeEmail = async () => {
    if (!currentUser) return;

    if (!newEmail || !emailPassword) {
      onError("Please fill in all fields");
      return;
    }

    if (!newEmail.includes("@")) {
      onError("Please enter a valid email address");
      return;
    }

    setIsSaving(true);
    setMessage("");

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

      setMessageType("success");
      setMessage("Email changed successfully. Please verify your new email.");
      setNewEmail("");
      setEmailPassword("");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessageType("error");
      onError(err instanceof Error ? err.message : "Failed to change email");
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
        <h2 className="text-xl font-bold text-gray-900">Email Management</h2>
      </div>

      <div className="p-6 space-y-4">
        {/* Current Email */}
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-2">
            Current Email
          </label>
          <input
            type="email"
            value={currentUser.email}
            disabled
            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed text-sm"
          />
          <p className="text-xs text-gray-600 mt-2">
            {currentUser.isVerified ? (
              <span className="text-green-600">✓ Email verified</span>
            ) : (
              <span className="text-orange-600">
                ⚠ Email not verified yet
              </span>
            )}
          </p>
        </div>

        {/* New Email */}
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-2">
            New Email Address
          </label>
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
            placeholder="Enter new email address"
          />
        </div>

        {/* Password Confirmation */}
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-2">
            Confirm Password
          </label>
          <input
            type="password"
            value={emailPassword}
            onChange={(e) => setEmailPassword(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
            placeholder="Enter your password to confirm"
          />
          <p className="text-xs text-gray-600 mt-1">
            We need your password to confirm this change
          </p>
        </div>

        {message && (
          <div
            className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
              messageType === "success"
                ? "bg-green-50 border border-green-300 text-green-800"
                : "bg-red-50 border border-red-300 text-red-800"
            }`}
          >
            <Check size={16} />
            {message}
          </div>
        )}

        <button
          onClick={handleChangeEmail}
          disabled={isSaving}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-semibold text-sm mt-6"
        >
          {isSaving ? "Changing Email..." : "Change Email"}
        </button>
      </div>
    </div>
  );
}
