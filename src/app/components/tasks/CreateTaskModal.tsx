"use client";

import React, { useEffect, useState } from "react";
import { DatePickerInput } from "@/app/components/tasks/TaskDueDatePickerInputComponent";
import { AlertTriangle, Paperclip } from "lucide-react";

type User = {
  id: number;
  name?: string | null;
  email: string;
};

export default function CreateTaskModal({
  users,
  currentEmployee,
  onClose,
  onCreate,
}: {
  users: User[];
  currentEmployee: User | null;
  onClose: () => void;
  onCreate: (data: any) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState<number | null>(
    currentEmployee?.id ? Number(currentEmployee.id) : null,
  );
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [priority, setPriority] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [initialComment, setInitialComment] = useState("");
  const [initialAttachmentFile, setInitialAttachmentFile] =
    useState<File | null>(null);

  // Sync assignee with current user when they load
  useEffect(() => {
    if (currentEmployee && !assigneeId) {
      setAssigneeId(Number(currentEmployee.id));
    }
  }, [currentEmployee, assigneeId]);

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

    if (!currentEmployee) {
      setError("User not logged in");
      return;
    }

    // Default assigner to current user if not specified
    const finalAssigneeId = assigneeId || Number(currentEmployee.id);

    if (!finalAssigneeId) {
      setError("Assignee is required");
      return;
    }

    if (!dueDate || !(dueDate instanceof Date) || isNaN(dueDate.getTime())) {
      setError("Due date is required");
      return;
    }

    setLoading(true);
    try {
      const taskData = {
        title,
        description: description || null,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        assigneeId: finalAssigneeId,
        status: "todo",
      };

      // Create task first
      const res = await fetch("/api/task-management", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(currentEmployee.id),
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
              "x-user-id": String(currentEmployee.id),
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
              "x-user-id": String(currentEmployee.id),
            },
            body: formData,
          });
        } catch (err) {
          console.error("Error adding initial attachment:", err);
        }
      }

      onCreate(data.task);
    } catch (err: any) {
      setError(err.message || "Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-5"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-[min(96%,700px)] max-h-[90vh] bg-blue-100/95 backdrop-blur-lg rounded-sm border border-black/20 overflow-auto"
      >
        {/* Header */}
        <div className="p-6 border-b border-black/10 flex justify-between items-center sticky top-0 bg-blue-100/95 z-10">
          <div className="flex flex-col gap-1">
            <div className="text-lg font-bold text-black/80">
              Create New Task
            </div>
            <div className="text-xs text-black/60">
              Add a new task to your workspace
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-none border-none text-black/60 cursor-pointer text-xl hover:text-black transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex flex-col gap-5">
            {/* Title */}
            <div>
              <div className="text-xs mb-2 text-black/60 font-semibold">
                Title
              </div>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-sm border border-black/10 bg-blue-100/50 text-black/80 text-sm placeholder-black/40 focus:outline-none focus:border-blue-400"
                placeholder="Task title..."
              />
            </div>

            {/* Description */}
            <div>
              <div className="text-xs mb-2 text-black/60 font-semibold">
                Description
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full min-h-[80px] px-3 py-2 rounded-sm border border-black/10 bg-blue-100/50 text-black/80 text-sm placeholder-black/40 focus:outline-none focus:border-blue-400"
                placeholder="Task description..."
              />
            </div>

            {/* Grid: Assignee, Attachment, Priority, Due Date */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
              {/* Left Column */}
              <div className="flex flex-col gap-3">
                {/* Assignee */}
                <div>
                  <div className="text-xs mb-2 text-black/60 font-semibold">
                    Assignee
                  </div>
                  <select
                    required
                    value={assigneeId || ""}
                    onChange={(e) =>
                      setAssigneeId(
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    className="w-full px-3 py-2 rounded-sm border border-black/10 bg-blue-200/30 text-black/80 focus:outline-none focus:border-blue-400 hover:border-black/20 transition-colors"
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.email}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Attachment */}
                <div>
                  <div className="text-xs mb-2 text-black/60 font-semibold">
                    Attachment
                  </div>
                  <input
                    type="file"
                    onChange={(e) =>
                      setInitialAttachmentFile(e.target.files?.[0] || null)
                    }
                    className="w-full px-3 py-2 rounded-sm border border-black/10 bg-blue-100/50 text-black/80 focus:outline-none focus:border-blue-400 hover:border-black/20 transition-colors"
                  />
                  {initialAttachmentFile && (
                    <div className="mt-2 flex items-center text-xs text-blue-600">
                      <Paperclip size={14} className="mr-2" />
                      {initialAttachmentFile.name}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column */}
              <div className="flex flex-col gap-3">
                {/* Priority */}
                <div>
                  <div className="text-xs mb-2 text-black/60 font-semibold">
                    Priority
                  </div>
                  <select
                    required
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-sm border border-black/10 bg-blue-200/30 text-black/80 text-sm focus:outline-none focus:border-blue-400 hover:border-black/20 transition-colors"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                {/* Due Date */}
                <div>
                  <div className="text-xs mb-2 text-black/60 font-semibold">
                    Due Date
                  </div>
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
              <div className="text-xs mb-2 text-black/60 font-semibold">
                Initial Comment
              </div>
              <textarea
                value={initialComment}
                onChange={(e) => setInitialComment(e.target.value)}
                className="w-full min-h-[60px] px-3 py-2 rounded-sm border border-black/10 bg-blue-100/50 text-black/80 text-sm placeholder-black/40 focus:outline-none focus:border-blue-400"
                placeholder="Add a comment (optional)..."
              />
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-sm bg-red-500/20 text-red-700 text-sm border border-red-400/30 flex items-center">
                <AlertTriangle size={16} className="mr-2" />
                {error}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end mt-6 pt-5 border-t border-black/10">
            <button
              type="button"
              onClick={onClose}
              className="px-12 py-2 rounded-sm border border-black/10 bg-blue-100/50 text-black/80 text-xs hover:bg-blue-100/70 hover:border-black/20 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-12 py-2 rounded-sm text-xs text-white transition-colors ${
                loading
                  ? "bg-blue-500/50 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading ? "Creating..." : "Create Task"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
