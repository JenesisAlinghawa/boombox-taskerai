"use client";

import React, { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { getCurrentUser } from "@/utils/sessionManager";
import { useAuthProtection } from "@/app/hooks/useAuthProtection";
import { PageContainer } from "@/app/components/PageContainer";
import { PageContentCon } from "@/app/components/PageContentCon";
import { AlertCircle } from "lucide-react";

interface Log {
  id: number;
  taskId: number | null;
  userId: number;
  action: string;
  data: any;
  createdAt: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function LogsPage() {
  useAuthProtection(); // Protect this route
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

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

      setUserRole(user.role || "EMPLOYEE");
      fetchLogs();
    } catch (err) {
      setError("Failed to authenticate");
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await fetch("/api/logs", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
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
      <div className="p-8 text-center bg-white min-h-screen">
        <p className="text-gray-600">Loading activity logs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-3 text-red-800">
          <AlertCircle size={24} />
          <p className="text-lg font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <PageContainer title="ACTIVITY LOGS">
      {logs.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <AlertCircle size={40} className="mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600">No activity logs yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{log.action}</h3>
                  <p className="text-sm text-gray-600">
                    By {log.user.firstName} {log.user.lastName} (
                    {log.user.email})
                  </p>
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {formatDistanceToNow(new Date(log.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>

              {log.taskId && (
                <p className="text-sm text-blue-600 mb-2">
                  Task ID: {log.taskId}
                </p>
              )}

              {log.data && (
                <details className="text-xs text-gray-600 mt-2">
                  <summary className="cursor-pointer hover:text-gray-900">
                    View Details
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
