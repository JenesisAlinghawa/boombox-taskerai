"use client";

import React, { useState } from "react";
import { Bell, Check } from "lucide-react";

interface Employee {
  id: number;
  emailNotifications?: boolean;
  messageNotifications?: boolean;
}

interface Props {
  currentEmployee: Employee | null;
  onError: (error: string) => void;
}

export function NotificationsComponent({ currentEmployee, onError }: Props) {
  const [emailNotifications, setEmailNotifications] = useState(
    currentEmployee?.emailNotifications ?? true,
  );
  const [messageNotifications, setMessageNotifications] = useState(
    currentEmployee?.messageNotifications ?? true,
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const saveNotificationPreferences = async () => {
    if (!currentEmployee) return;
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/user-management/${currentEmployee.id}/notification-preferences`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": String(currentEmployee.id),
          },
          body: JSON.stringify({
            emailNotifications,
            messageNotifications,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to save notification preferences",
        );
      }

      setMessage("Notification preferences updated successfully");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      onError(
        err instanceof Error
          ? err.message
          : "Failed to save notification preferences",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full">
      <div className="bg-blue-100 backdrop-blur-md border border-black/10 rounded-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell size={20} className="text-black/70" />
          <h2 className="text-lg font-semibold text-black/80">
            Notification Preferences
          </h2>
        </div>

        <div className="space-y-4">
          {/* Email Notifications */}
          <div className="flex items-center justify-between p-4 bg-white/50 rounded-sm border border-black/5">
            <div>
              <label className="block text-sm font-medium text-black/80 mb-1">
                Email Notifications
              </label>
              <p className="text-xs text-black/60">
                Receive email notifications for task updates and messages
              </p>
            </div>
            <button
              onClick={() => setEmailNotifications(!emailNotifications)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                emailNotifications ? "bg-blue-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  emailNotifications ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Message Notifications */}
          <div className="flex items-center justify-between p-4 bg-white/50 rounded-sm border border-black/5">
            <div>
              <label className="block text-sm font-medium text-black/80 mb-1">
                Message Notifications
              </label>
              <p className="text-xs text-black/60">
                Receive notifications for new direct messages
              </p>
            </div>
            <button
              onClick={() => setMessageNotifications(!messageNotifications)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                messageNotifications ? "bg-blue-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  messageNotifications ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {message && (
          <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-sm text-green-800 text-sm flex items-center gap-2">
            <Check size={16} />
            {message}
          </div>
        )}

        <button
          onClick={saveNotificationPreferences}
          disabled={saving}
          className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
        >
          {saving ? "Saving..." : "Save Preferences"}
        </button>
      </div>
    </div>
  );
}
