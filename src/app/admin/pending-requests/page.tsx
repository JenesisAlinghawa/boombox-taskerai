"use client";

import React, { useState, useEffect } from "react";
import { Mail, Check, X, AlertCircle } from "lucide-react";
import { getCurrentUser } from "@/utils/sessionManager";

interface PendingUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
}

export default function PendingRequestsPage() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState<number | null>(null);
  const [denying, setDenying] = useState<number | null>(null);

  useEffect(() => {
    checkAuthAndFetchUsers();
  }, []);

  const checkAuthAndFetchUsers = async () => {
    try {
      const user = await getCurrentUser();

      if (!user) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      if (user.role !== "OWNER") {
        setError("Only OWNER can access this page");
        setLoading(false);
        return;
      }

      fetchPendingUsers();
    } catch (err) {
      setError("Failed to verify authorization");
      setLoading(false);
    }
  };

  const fetchPendingUsers = async () => {
    try {
      const response = await fetch("/api/users/pending", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch pending users");
      }

      const data = await response.json();
      setPendingUsers(data.users || []);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch pending users",
      );
    } finally {
      setLoading(false);
    }
  };

  const approveUser = async (
    userId: number,
    email: string,
    firstName: string,
    lastName: string,
  ) => {
    setApproving(userId);
    try {
      const response = await fetch(`/api/users/${userId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to approve user");
      }

      // Send welcome email
      await sendWelcomeEmail(email, firstName, lastName);

      setPendingUsers(pendingUsers.filter((u) => u.id !== userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve user");
    } finally {
      setApproving(null);
    }
  };

  const denyUser = async (
    userId: number,
    email: string,
    firstName: string,
    lastName: string,
  ) => {
    setDenying(userId);
    try {
      const response = await fetch(`/api/users/${userId}/deny`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to deny user");
      }

      // Send denial email
      await sendDenialEmail(email, firstName, lastName);

      setPendingUsers(pendingUsers.filter((u) => u.id !== userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deny user");
    } finally {
      setDenying(null);
    }
  };

  const sendWelcomeEmail = async (
    email: string,
    firstName: string,
    lastName: string,
  ) => {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email,
          subject: "Welcome to TaskerAI - Account Approved",
          template: "welcome",
          data: {
            firstName,
            lastName,
            appUrl,
          },
        }),
      });
    } catch (err) {
      console.error("Failed to send welcome email:", err);
    }
  };

  const sendDenialEmail = async (
    email: string,
    firstName: string,
    lastName: string,
  ) => {
    try {
      await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email,
          subject: "TaskerAI - Signup Request Status",
          template: "denial",
          data: {
            firstName,
            lastName,
          },
        }),
      });
    } catch (err) {
      console.error("Failed to send denial email:", err);
    }
  };

  if (!loading && error && error.includes("Only OWNER")) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-3 text-red-800">
          <AlertCircle size={24} />
          <p className="text-lg font-normal">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p className="text-black/62">Loading pending requests...</p>
      </div>
    );
  }

  if (error && error !== "Only OWNER can access this page") {
    return (
      <div className="p-8 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-8 bg-white min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-normal text-black/62 mb-2">
          Pending User Requests
        </h1>
        <p className="text-black/62">
          {pendingUsers.length} user{pendingUsers.length !== 1 ? "s" : ""}{" "}
          awaiting approval
        </p>
      </div>

      {pendingUsers.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <Mail size={40} className="mx-auto text-black/62 mb-3" />
          <p className="text-black/62">No pending requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingUsers.map((user) => (
            <div
              key={user.id}
              className="border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1">
                <h3 className="font-normal text-black/62">
                  {user.firstName} {user.lastName}
                </h3>
                <p className="text-sm text-black/62">{user.email}</p>
                <p className="text-xs text-black/62 mt-1">
                  Requested {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() =>
                    approveUser(
                      user.id,
                      user.email,
                      user.firstName,
                      user.lastName,
                    )
                  }
                  disabled={approving === user.id || denying === user.id}
                  className="flex items-center gap-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check size={16} />
                  {approving === user.id ? "Approving..." : "Approve"}
                </button>

                <button
                  onClick={() =>
                    denyUser(user.id, user.email, user.firstName, user.lastName)
                  }
                  disabled={approving === user.id || denying === user.id}
                  className="flex items-center gap-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X size={16} />
                  {denying === user.id ? "Denying..." : "Deny"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
