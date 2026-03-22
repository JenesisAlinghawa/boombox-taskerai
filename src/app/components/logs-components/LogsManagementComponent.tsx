"use client";

import React, { useState, useMemo } from "react";
import { Activity, Search, Filter, ArrowUpDown } from "lucide-react";

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

interface Props {
  logs: Log[];
  loading: boolean;
}

type ActionType =
  | "LOGIN"
  | "TASK_CREATE"
  | "TASK_UPDATE"
  | "TASK_DELETE"
  | "TASK_STATUS_CHANGE"
  | "COMMENT_CREATE"
  | "COMMENT_DELETE"
  | "ATTACHMENT_ADD"
  | "USER_UPDATE"
  | "OTHER";

const getActionGroup = (action: string): ActionType => {
  const actionLower = action.toLowerCase();

  // Login & Logout
  if (
    actionLower.includes("logged in") ||
    actionLower.includes("logged out") ||
    actionLower.includes("login")
  )
    return "LOGIN";

  // Task Create
  if (
    actionLower.includes("task created") ||
    actionLower.includes("created a task")
  )
    return "TASK_CREATE";

  // Task Delete
  if (
    actionLower.includes("deleted task") ||
    actionLower.includes("task_deleted")
  )
    return "TASK_DELETE";

  // Task Status Change
  if (
    actionLower.includes("status") &&
    (actionLower.includes("task_updated") ||
      actionLower.includes("status changed"))
  )
    return "TASK_STATUS_CHANGE";

  // Task Update (general)
  if (
    actionLower.includes("updated task") ||
    actionLower.includes("task_update") ||
    actionLower.includes("updated")
  )
    return "TASK_UPDATE";

  // Comments
  if (
    actionLower.includes("added comment") ||
    actionLower.includes("edited comment") ||
    actionLower.includes("comment_created")
  )
    return "COMMENT_CREATE";
  if (
    actionLower.includes("deleted comment") ||
    actionLower.includes("comment_deleted")
  )
    return "COMMENT_DELETE";

  // Attachments
  if (
    actionLower.includes("added attachment") ||
    actionLower.includes("attachment")
  )
    return "ATTACHMENT_ADD";

  // User Updates
  if (actionLower.includes("user") && !actionLower.includes("logged"))
    return "USER_UPDATE";

  return "OTHER";
};

const getActionColor = (actionType: ActionType): string => {
  const colors: Record<ActionType, string> = {
    LOGIN: "bg-blue-100/50 border-blue-300/30 text-blue-700",
    TASK_CREATE: "bg-green-100/50 border-green-300/30 text-green-700",
    TASK_UPDATE: "bg-yellow-100/50 border-yellow-300/30 text-yellow-700",
    TASK_DELETE: "bg-red-100/50 border-red-300/30 text-red-700",
    TASK_STATUS_CHANGE: "bg-purple-100/50 border-purple-300/30 text-purple-700",
    COMMENT_CREATE: "bg-indigo-100/50 border-indigo-300/30 text-indigo-700",
    COMMENT_DELETE: "bg-pink-100/50 border-pink-300/30 text-pink-700",
    ATTACHMENT_ADD: "bg-cyan-100/50 border-cyan-300/30 text-cyan-700",
    USER_UPDATE: "bg-orange-100/50 border-orange-300/30 text-orange-700",
    OTHER: "bg-gray-100/50 border-gray-300/30 text-gray-700",
  };
  return colors[actionType];
};

const getActionLabel = (actionType: ActionType): string => {
  const labels: Record<ActionType, string> = {
    LOGIN: "Login",
    TASK_CREATE: "Task Created",
    TASK_UPDATE: "Task Updated",
    TASK_DELETE: "Task Deleted",
    TASK_STATUS_CHANGE: "Status Changed",
    COMMENT_CREATE: "Comment Added",
    COMMENT_DELETE: "Comment Deleted",
    ATTACHMENT_ADD: "Attachment Added",
    USER_UPDATE: "User Updated",
    OTHER: "Other Activity",
  };
  return labels[actionType];
};

export function LogsManagementComponent({ logs, loading }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedActionType, setSelectedActionType] = useState<
    ActionType | "ALL"
  >("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");

  // Filter and sort logs
  const filteredLogs = useMemo(() => {
    let filtered = logs;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.action.toLowerCase().includes(query) ||
          log.user.firstName.toLowerCase().includes(query) ||
          log.user.lastName.toLowerCase().includes(query) ||
          log.user.email.toLowerCase().includes(query) ||
          (log.taskId && log.taskId.toLowerCase().includes(query)),
      );
    }

    // Action type filter
    if (selectedActionType !== "ALL") {
      filtered = filtered.filter(
        (log) => getActionGroup(log.action) === selectedActionType,
      );
    }

    // Sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [logs, searchQuery, selectedActionType, sortBy]);

  // Group logs by action type for count
  const actionCounts = useMemo(() => {
    const counts: Record<ActionType | "ALL", number> = {
      ALL: logs.length,
      LOGIN: 0,
      TASK_CREATE: 0,
      TASK_UPDATE: 0,
      TASK_DELETE: 0,
      TASK_STATUS_CHANGE: 0,
      COMMENT_CREATE: 0,
      COMMENT_DELETE: 0,
      ATTACHMENT_ADD: 0,
      USER_UPDATE: 0,
      OTHER: 0,
    };
    logs.forEach((log) => {
      const actionType = getActionGroup(log.action);
      counts[actionType]++;
    });
    return counts;
  }, [logs]);

  if (loading) {
    return (
      <div className="w-full">
        <div className="bg-blue-100/95 backdrop-blur-lg border border-black/20 rounded-sm p-6">
          <p className="text-black/60 text-sm">Loading activity logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header with Search and Controls */}
      <div className="bg-blue-100/95 backdrop-blur-lg border border-black/20 rounded-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <Activity size={20} className="text-black/70" />
          <h2 className="text-lg font-bold text-black/80">Activity Logs</h2>
          <span className="ml-auto text-xs text-black/60">
            {filteredLogs.length} of {logs.length} activities
          </span>
        </div>

        {/* Search and Controls */}
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-2.5 text-black/40"
            />
            <input
              type="text"
              placeholder="Search by action, user, email, or task ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-black/10 rounded-sm bg-blue-100/50 text-black placeholder-black/40 focus:outline-none focus:border-blue-400 text-sm"
            />
          </div>

          {/* Filter and Sort Row */}
          <div className="flex gap-3 flex-wrap">
            {/* Filter by Action Type */}
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-black/60" />
              <select
                value={selectedActionType}
                onChange={(e) =>
                  setSelectedActionType(e.target.value as ActionType | "ALL")
                }
                className="px-3 py-1.5 border border-black/10 rounded-sm bg-blue-100/50 text-black text-xs focus:outline-none focus:border-blue-400"
              >
                <option value="ALL">All Activities</option>
                <option value="LOGIN">Logins</option>
                <option value="TASK_CREATE">Tasks Created</option>
                <option value="TASK_UPDATE">Tasks Updated</option>
                <option value="TASK_DELETE">Tasks Deleted</option>
                <option value="TASK_STATUS_CHANGE">Status Changes</option>
                <option value="COMMENT_CREATE">Comments Added</option>
                <option value="COMMENT_DELETE">Comments Deleted</option>
                <option value="ATTACHMENT_ADD">Attachments</option>
                <option value="USER_UPDATE">User Updates</option>
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <ArrowUpDown size={16} className="text-black/60" />
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as "newest" | "oldest")
                }
                className="px-3 py-1.5 border border-black/10 rounded-sm bg-blue-100/50 text-black text-xs focus:outline-none focus:border-blue-400"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Table View */}
      <div className="bg-blue-100/95 backdrop-blur-lg border border-black/20 rounded-sm overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center">
            <Activity size={32} className="mx-auto text-black/40 mb-3" />
            <p className="text-black/60 text-sm">No activity logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-black/10 bg-blue-100/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-black/70">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-black/70">
                    Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-black/70">
                    Task ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-black/70">
                    Performed by
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-black/70">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                {filteredLogs.map((log) => {
                  const actionType = getActionGroup(log.action);
                  const actionLabel = getActionLabel(actionType);

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-blue-100/50 transition-colors group"
                    >
                      {/* Time Column */}
                      <td className="px-6 py-3 text-xs text-black/60 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>

                      {/* Activity Column */}
                      <td className="px-6 py-3">
                        <span
                          className={`inline-block px-2.5 py-1 rounded text-xs font-semibold border ${getActionColor(actionType)}`}
                        >
                          {actionLabel}
                        </span>
                      </td>

                      {/* Task ID Column */}
                      <td className="px-6 py-3 text-xs text-black/80 font-medium">
                        {log.taskId ? (
                          <span className="font-mono text-blue-600">
                            {log.taskId}
                          </span>
                        ) : (
                          <span className="text-black/60">—</span>
                        )}
                      </td>

                      {/* Performed by Column */}
                      <td className="px-6 py-3 text-xs text-black/80">
                        {log.user.firstName} {log.user.lastName}
                        <div className="text-black/60 text-xs">
                          {log.user.email}
                        </div>
                      </td>

                      {/* Details Column */}
                      <td className="px-6 py-3 text-xs text-black/60">
                        {log.data && Object.keys(log.data).length > 0 ? (
                          <details className="cursor-pointer">
                            <summary className="text-blue-600 hover:text-blue-700 font-semibold">
                              View
                            </summary>
                            <div className="absolute right-6 mt-2 p-3 bg-black text-white rounded-sm text-xs z-10 hidden group-hover:block max-w-xs">
                              <pre className="whitespace-pre-wrap break-words">
                                {JSON.stringify(log.data, null, 2)}
                              </pre>
                            </div>
                          </details>
                        ) : (
                          <span className="text-black/40">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
