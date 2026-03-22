"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/utils/sessionManager";
import { useAuthProtection } from "@/app/hooks/useAuthProtection";
import { PageContainer } from "@/app/components/page-layouts/MainPageContainerLayoutComponent";
import { PageContentCon } from "@/app/components/page-layouts/PageContentWrapperContainerComponent";
import { LogsManagementComponent } from "@/app/components/logs-components/LogsManagementComponent";
import { AlertCircle, Lock } from "lucide-react";

interface Log {
  id: number;
  taskId?: string | null;
  userId: string;
  action: string;
  data?: any;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function LogsPage() {
  useAuthProtection(); // Protect this route
  const router = useRouter();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState(true);

  useEffect(() => {
    fetchUserAndLogs();
  }, []);

  const fetchUserAndLogs = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      // Authorization check - only ADMIN and OWNER can access logs
      const authorizedRoles = ["ADMIN", "OWNER"];
      if (user.role && !authorizedRoles.includes(user.role)) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      fetchLogs(user.id);
    } catch (err) {
      setError("Failed to authenticate");
      setLoading(false);
    }
  };

  const fetchLogs = async (userId: string) => {
    try {
      const response = await fetch("/api/activity-logging", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(userId),
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch logs");
      }

      const data = await response.json();
      setLogs(data.logs || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch logs");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PageContainer title="ACTIVITY LOGS">
        <PageContentCon>
          <div className="p-8 text-center">
            <p className="text-black/60 text-sm">Loading activity logs...</p>
          </div>
        </PageContentCon>
      </PageContainer>
    );
  }

  // Access denied for non-admin users
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-transparent m-2 flex items-center justify-center p-5">
        <div className="max-w-xs text-center bg-red-500/10 border border-red-500/30 rounded-lg p-10 flex flex-col items-center gap-4">
          <Lock size={48} className="text-red-400" />
          <h2 className="m-0 text-xl font-semibold text-black/62">
            Access Denied
          </h2>
          <p className="m-0 text-sm text-black/60 leading-relaxed">
            Activity Logs are restricted to admins and above.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-4 px-5 py-2 bg-blue-600 text-white rounded-md cursor-pointer text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <PageContainer title="ACTIVITY LOGS">
        <PageContentCon>
          <div className="p-8 bg-red-100/50 border border-red-300/30 rounded-sm">
            <div className="flex items-center gap-3 text-red-700">
              <AlertCircle size={24} />
              <p className="text-sm font-semibold">{error}</p>
            </div>
          </div>
        </PageContentCon>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="ACTIVITY LOGS">
      <PageContentCon className="m-2">
        <LogsManagementComponent logs={logs} loading={false} />
      </PageContentCon>
    </PageContainer>
  );
}
