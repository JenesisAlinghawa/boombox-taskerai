"use client";

import React, { useEffect, useState } from "react";
import { DatePickerInput } from "@/app/components/tasks/TaskDueDatePickerInputComponent";
import { AlertTriangle, Paperclip, X } from "lucide-react";
import type { User } from "./types";

export default function CreateTaskModal({
  users,
  currentEmployee: currentUser,
  onClose,
  onCreate,
  editingTask,
}: {
  users: User[];
  currentEmployee: User | null;
  onClose: () => void;
  onCreate: (data: any) => void;
  editingTask?: any;
}) {
  const [title, setTitle] = useState(editingTask?.title || "");
  const [description, setDescription] = useState(
    editingTask?.description || "",
  );
  const [assigneeIds, setAssigneeIds] = useState<string[]>(
    editingTask?.assignees?.map((a: any) => a.assignee?.id || a.id) ||
      (currentUser?.id ? [currentUser.id] : []),
  );
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [dueDate, setDueDate] = useState<Date | null>(
    editingTask?.dueDate ? new Date(editingTask.dueDate) : null,
  );
  const [priority, setPriority] = useState(editingTask?.priority || "medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [initialComment, setInitialComment] = useState("");
  const [initialAttachmentFile, setInitialAttachmentFile] =
    useState<File | null>(null);

  // Sync assignees with current user when they load
  useEffect(() => {
    if (currentUser && assigneeIds.length === 0) {
      setAssigneeIds([currentUser.id]);
    }
  }, [currentUser, assigneeIds.length]);

  const toggleAssignee = (userId: string) => {
    setAssigneeIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const removeAssignee = (userId: string) => {
    setAssigneeIds((prev) => prev.filter((id) => id !== userId));
  };

  const getAssigneeLabel = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    return user?.name || user?.email || userId;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation - all required except description
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (!priority) {
      setError("Priority is required");
      return;
    }

    if (!currentUser) {
      setError("User not logged in");
      return;
    }

    if (assigneeIds.length === 0) {
      setError("At least one assignee is required");
      return;
    }

    if (!dueDate || !(dueDate instanceof Date) || isNaN(dueDate.getTime())) {
      setError("Due date is required");
      return;
    }

    // Validate due date is not in the past
    const dueDateObj = new Date(dueDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    dueDateObj.setHours(0, 0, 0, 0);

    if (dueDateObj < now) {
      setError("Due date cannot be in the past");
      return;
    }

    setLoading(true);
    try {
      // If editing, use PATCH; if creating, use POST
      if (editingTask?.id) {
        // Update existing task
        const taskData = {
          title,
          description: description || null,
          priority,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          assigneeIds,
        };
        const res = await fetch(`/api/task-management/${editingTask.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": String(currentUser.id),
          },
          body: JSON.stringify(taskData),
        });

        if (!res.ok) {
          const errorData = await res
            .json()
            .catch(() => ({ error: "Unknown error" }));
          throw new Error(errorData.error || `Server error: ${res.status}`);
        }
        const data = await res.json();
        onCreate(data.task);
      } else {
        // Create new task
        const taskData = {
          title,
          description: description || null,
          priority,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          assigneeIds,
          status: "todo",
        };
        const res = await fetch("/api/task-management", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": String(currentUser.id),
          },
          body: JSON.stringify(taskData),
        });

        if (!res.ok) {
          const errorData = await res
            .json()
            .catch(() => ({ error: "Unknown error" }));
          throw new Error(errorData.error || `Server error: ${res.status}`);
        }
        const data = await res.json();
        const newTaskId = data.task.id;

        // Add initial comment if provided
        if (initialComment.trim()) {
          try {
            await fetch(`/api/task-management/${newTaskId}/comments`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-user-id": String(currentUser.id),
              },
              body: JSON.stringify({ content: initialComment }),
            });
          } catch (err) {
            console.error("Error adding initial comment:", err);
          }
        }

        // Add initial attachment if provided
        if (initialAttachmentFile) {
          try {
            const formData = new FormData();
            formData.append("file", initialAttachmentFile);
            formData.append("filename", initialAttachmentFile.name);

            await fetch(`/api/task-management/${newTaskId}/attachments`, {
              method: "POST",
              headers: {
                "x-user-id": String(currentUser.id),
              },
              body: formData,
            });
          } catch (err) {
            console.error("Error adding initial attachment:", err);
          }
        }

        onCreate(data.task);
      }
    } catch (err: any) {
      setError(
        err.message || `Failed to ${editingTask ? "update" : "create"} task`,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-4 sm:p-6"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="
          w-full max-w-3xl max-h-[92vh] overflow-y-auto
          bg-white border border-gray-200 rounded-xl shadow-xl
        "
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/70 flex justify-between items-center sticky top-0 z-10">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-lg font-medium text-gray-900">
              {editingTask ? "Edit Task" : "Create New Task"}
            </h2>
            <p className="text-xs text-gray-600">
              {editingTask
                ? "Update task details"
                : "Add a new task to your workspace"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-2xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="
                w-full px-4 py-2.5 rounded-lg border border-gray-200
                bg-white text-gray-900 text-sm placeholder-gray-400
                focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300/50
                shadow-sm
              "
              placeholder="Task title..."
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="
                w-full min-h-[100px] px-4 py-2.5 rounded-lg border border-gray-200
                bg-white text-gray-900 text-sm placeholder-gray-400
                focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300/50
                shadow-sm resize-y
              "
              placeholder="Task description..."
            />
          </div>

          {/* Grid: Assignees, Attachment, Priority, Due Date */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="flex flex-col gap-3">
              {/* Assignees (Multi-select) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Assignees <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setShowAssigneeDropdown(!showAssigneeDropdown)
                    }
                    className="
                      w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-left
                      text-gray-900 text-sm shadow-sm focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300/50
                      hover:border-gray-300 transition-colors
                    "
                  >
                    {assigneeIds.length === 0
                      ? "Select assignees..."
                      : `${assigneeIds.length} assignee${assigneeIds.length !== 1 ? "s" : ""} selected`}
                  </button>

                  {/* Selected Assignees Tags */}
                  {assigneeIds.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {assigneeIds.map((userId) => (
                        <div
                          key={userId}
                          className="
                            inline-flex items-center gap-1.5 bg-gray-100 text-gray-800
                            px-3 py-1 rounded-full text-sm
                          "
                        >
                          {getAssigneeLabel(userId)}
                          <button
                            type="button"
                            onClick={() => removeAssignee(userId)}
                            className="text-gray-500 hover:text-gray-900"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Dropdown Menu */}
                  {showAssigneeDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                      {users.map((user) => (
                        <label
                          key={user.id}
                          className="
                            flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer
                            text-sm text-gray-800 border-b border-gray-100 last:border-none
                          "
                        >
                          <input
                            type="checkbox"
                            checked={assigneeIds.includes(user.id)}
                            onChange={() => toggleAssignee(user.id)}
                            className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                          />
                          {user.name || user.email}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Attachment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Attachment
                </label>
                <input
                  type="file"
                  onChange={(e) =>
                    setInitialAttachmentFile(e.target.files?.[0] || null)
                  }
                  className="
                    w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm
                    file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                    file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100 cursor-pointer
                  "
                />
                {initialAttachmentFile && (
                  <div className="mt-2 flex items-center text-sm text-gray-600">
                    <Paperclip size={16} className="mr-2" />
                    {initialAttachmentFile.name}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="flex flex-col gap-3">
              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Priority <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="
                    w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm
                    focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300/50
                    shadow-sm
                  "
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <DatePickerInput
                  value={dueDate ? dueDate.toISOString() : ""}
                  onChange={(dateString) => {
                    if (dateString) {
                      setDueDate(new Date(dateString));
                    } else {
                      setDueDate(null);
                    }
                  }}
                  required
                  placeholder="Select date and time..."
                />
              </div>
            </div>
          </div>

          {/* Initial Comment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Initial Comment
            </label>
            <textarea
              value={initialComment}
              onChange={(e) => setInitialComment(e.target.value)}
              className="
                w-full min-h-[80px] px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm
                placeholder-gray-400 focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300/50
                shadow-sm resize-y
              "
              placeholder="Add a comment (optional)..."
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            className="
              px-6 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-medium
              hover:bg-gray-50 transition-colors shadow-sm
            "
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`
              px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-colors shadow-sm
              ${
                loading
                  ? "bg-blue-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }
            `}
          >
            {loading
              ? editingTask
                ? "Updating..."
                : "Creating..."
              : editingTask
                ? "Update Task"
                : "Create Task"}
          </button>
        </div>
      </form>
    </div>
  );
}
