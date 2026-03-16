"use client";

import React, { useState, useMemo } from "react";
import {
  CheckCircle,
  Calendar,
  User,
  Search,
  Filter,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";

interface CompletedTask {
  id: string;
  title: string;
  completedDate?: string;
  priority?: string;
  assignees?: Array<{ firstName: string; lastName: string; email: string }>;
}

interface Props {
  tasks: CompletedTask[];
  loading: boolean;
  onRedo?: (taskId: string) => Promise<void>;
  onDelete?: (taskId: string) => Promise<void>;
}

export const AnalyticsRecentlyCompletedTasks: React.FC<Props> = ({
  tasks,
  loading,
  onRedo,
  onDelete,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "title" | "priority">("date");
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [filterAssignee, setFilterAssignee] = useState<string | null>(null);
  const [actioningTaskId, setActioningTaskId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case "low":
        return "bg-blue-100 text-blue-700";
      case "medium":
        return "bg-orange-100 text-orange-700";
      case "high":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "No date";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getAssigneeName = (
    assignee?: { firstName: string; lastName: string; email: string } | null,
  ) => {
    if (!assignee) return "Unassigned";
    return (
      `${assignee.firstName} ${assignee.lastName}`.trim() || assignee.email
    );
  };

  // Get unique assignees for filter
  const uniqueAssignees = useMemo(() => {
    const assignees = new Map<string, string>();
    tasks.forEach((task) => {
      if (task.assignees && task.assignees.length > 0) {
        task.assignees.forEach((a) => {
          const name = getAssigneeName(a);
          assignees.set(a.email, name);
        });
      }
    });
    return Array.from(assignees.entries());
  }, [tasks]);

  // Get unique priorities for filter
  const uniquePriorities = useMemo(() => {
    return [...new Set(tasks.map((t) => t.priority).filter(Boolean))];
  }, [tasks]);

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    const filtered = tasks.filter((task) => {
      const matchesSearch = task.title
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesPriority =
        !filterPriority || task.priority === filterPriority;
      // Check if current user is any of the assignees or no filter is applied
      const matchesAssignee =
        !filterAssignee ||
        task.assignees?.some((a) => a.email === filterAssignee) ||
        (!filterAssignee && (!task.assignees || task.assignees.length === 0));

      return matchesSearch && matchesPriority && matchesAssignee;
    });

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "date") {
        const dateA = a.completedDate ? new Date(a.completedDate).getTime() : 0;
        const dateB = b.completedDate ? new Date(b.completedDate).getTime() : 0;
        return dateB - dateA; // Most recent first
      } else if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      } else if (sortBy === "priority") {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const prioA =
          priorityOrder[
            (a.priority?.toLowerCase() as keyof typeof priorityOrder) || 2
          ] || 2;
        const prioB =
          priorityOrder[
            (b.priority?.toLowerCase() as keyof typeof priorityOrder) || 2
          ] || 2;
        return prioA - prioB;
      }
      return 0;
    });

    return filtered;
  }, [tasks, searchTerm, sortBy, filterPriority, filterAssignee]);

  // Handle redo action
  const handleRedo = async (taskId: string) => {
    if (!onRedo) return;
    setActioningTaskId(taskId);
    setActionError(null);
    try {
      await onRedo(taskId);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Failed to redo task",
      );
    } finally {
      setActioningTaskId(null);
    }
  };

  // Handle delete action
  const handleDelete = async (taskId: string) => {
    if (!onDelete) return;
    setActioningTaskId(taskId);
    setActionError(null);
    try {
      await onDelete(taskId);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Failed to delete task",
      );
    } finally {
      setActioningTaskId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-green-100 backdrop-blur-md rounded-sm border border-black/10 p-6 flex items-center justify-center">
        <p className="text-sm text-black/60">Loading completed tasks...</p>
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="bg-green-100 backdrop-blur-md rounded-sm border border-black/10 p-6 text-center">
        <CheckCircle
          size={32}
          className="text-green-600 mx-auto mb-3 opacity-50"
        />
        <p className="text-sm text-black/60 m-0">
          No completed tasks yet. Keep up the great work!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-200 flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-300/50 p-4 shrink-0 bg-green-100">
        <h3 className="text-sm font-semibold text-black/62 m-0 flex items-center gap-2">
          <CheckCircle size={18} className="text-green-600" /> Recently
          Completed Tasks
        </h3>
        <p className="text-xs text-black/40 m-0 mt-1">
          {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""} (
          {tasks.length} total)
        </p>
      </div>

      {/* Search Bar */}
      <div className="border-b border-black/10 p-3 shrink-0 bg-green-50/50">
        <div className="relative mb-3">
          <Search
            size={14}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black/40"
          />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs border border-black/10 rounded bg-white text-black/80 placeholder-black/40 focus:outline-none focus:border-black/30"
          />
        </div>

        {/* Controls Row */}
        <div className="flex gap-2 flex-wrap items-center">
          {/* Sort */}
          <div className="flex-1 min-w-[120px]">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-2 py-1 text-xs border border-black/10 rounded bg-white text-black/80 focus:outline-none focus:border-black/30 cursor-pointer"
            >
              <option value="date">Sort by Date</option>
              <option value="title">Sort by Title</option>
              <option value="priority">Sort by Priority</option>
            </select>
          </div>

          {/* Priority Filter */}
          {uniquePriorities.length > 0 && (
            <div className="flex-1 min-w-[120px]">
              <select
                value={filterPriority || ""}
                onChange={(e) => setFilterPriority(e.target.value || null)}
                className="w-full px-2 py-1 text-xs border border-black/10 rounded bg-white text-black/80 focus:outline-none focus:border-black/30 cursor-pointer"
              >
                <option value="">All Priorities</option>
                {uniquePriorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority?.charAt(0).toUpperCase()}
                    {priority?.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Assignee Filter */}
          {uniqueAssignees.length > 0 && (
            <div className="flex-1 min-w-[120px]">
              <select
                value={filterAssignee || ""}
                onChange={(e) => setFilterAssignee(e.target.value || null)}
                className="w-full px-2 py-1 text-xs border border-black/10 rounded bg-white text-black/80 focus:outline-none focus:border-black/30 cursor-pointer"
              >
                <option value="">All Assignees</option>
                {uniqueAssignees.map(([email, name]) => (
                  <option key={email} value={email}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Active Filters Display */}
        {(searchTerm || filterPriority || filterAssignee) && (
          <div className="mt-2 flex gap-2 flex-wrap">
            {searchTerm && (
              <div className="bg-blue-100 border border-blue-200 text-blue-700 text-xs px-2 py-1 rounded flex items-center gap-1">
                Search: {searchTerm}
                <button
                  onClick={() => setSearchTerm("")}
                  className="ml-1 hover:text-blue-900"
                >
                  <X size={12} />
                </button>
              </div>
            )}
            {filterPriority && (
              <div className="bg-orange-100 border border-orange-200 text-orange-700 text-xs px-2 py-1 rounded flex items-center gap-1">
                Priority: {filterPriority.charAt(0).toUpperCase()}
                {filterPriority.slice(1)}
                <button
                  onClick={() => setFilterPriority(null)}
                  className="ml-1 hover:text-orange-900"
                >
                  <X size={12} />
                </button>
              </div>
            )}
            {filterAssignee && (
              <div className="bg-purple-100 border border-purple-200 text-purple-700 text-xs px-2 py-1 rounded flex items-center gap-1">
                Assignee:{" "}
                {
                  uniqueAssignees.find(
                    ([email]) => email === filterAssignee,
                  )?.[1]
                }
                <button
                  onClick={() => setFilterAssignee(null)}
                  className="ml-1 hover:text-purple-900"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {actionError && (
        <div className="border-b border-red-200/50 bg-red-50 p-3 shrink-0">
          <p className="text-xs text-red-600 m-0">{actionError}</p>
        </div>
      )}

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {filteredTasks.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-black/40">No tasks match your filters</p>
          </div>
        ) : (
          filteredTasks.slice(0, 10).map((task) => (
            <div
              key={task.id}
              className="bg-green-50 border border-green-200/40 rounded-sm p-3 hover:border-green-300/60 transition-colors group"
            >
              {/* Task Title and Actions */}
              <div className="flex items-start gap-2 mb-2">
                <CheckCircle
                  size={16}
                  className="text-green-600 flex-shrink-0 mt-0.5"
                />
                <p className="text-sm font-medium text-black/80 m-0 break-words flex-1">
                  {task.title}
                </p>
                {/* Action Buttons */}
                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onRedo && (
                    <button
                      onClick={() => handleRedo(task.id)}
                      disabled={actioningTaskId === task.id}
                      title="Redo task (mark as pending)"
                      className="p-1.5 rounded bg-blue-100 text-blue-600 hover:bg-blue-200 disabled:opacity-50 transition-colors"
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => handleDelete(task.id)}
                      disabled={actioningTaskId === task.id}
                      title="Delete task"
                      className="p-1.5 rounded bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-50 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Task Details */}
              <div className="flex items-center gap-3 flex-wrap text-xs ml-6">
                {task.completedDate && (
                  <div className="flex items-center gap-1 text-black/60">
                    <Calendar size={12} />
                    {formatDate(task.completedDate)}
                  </div>
                )}

                {task.assignees && task.assignees.length > 0 && (
                  <div className="flex items-center gap-1 text-black/60">
                    <User size={12} />
                    {task.assignees.length === 1
                      ? getAssigneeName(task.assignees[0])
                      : `${getAssigneeName(task.assignees[0])} +${task.assignees.length - 1}`}
                  </div>
                )}

                {task.priority && (
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(
                      task.priority,
                    )}`}
                  >
                    {task.priority.charAt(0).toUpperCase() +
                      task.priority.slice(1)}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {filteredTasks.length > 10 && (
        <div className="border-t border-black/10 p-3 text-center text-xs text-black/60 shrink-0">
          +{filteredTasks.length - 10} more completed tasks
        </div>
      )}
    </div>
  );
};
