"use client";

import React, { useState } from "react";
import { PageContentCon } from "@/app/components/PageContentCon";
import { DatePickerInput } from "@/app/components/DatePickerInput";

type User = {
  id: number;
  name?: string | null;
  email: string;
};

const COLORS = {
  bg: "transparent",
  cardBg: "transparent",
  text: "#ffffff",
  muted: "#ffffff",
  todo: "#8b5cf6",
  inProgress: "#f59e0b",
  stuck: "#ef4444",
  done: "#10b981",
  shadow: "#000000",
};

export default function CreateTaskModal({
  users,
  currentUser,
  onClose,
  onCreate,
}: {
  users: User[];
  currentUser: User | null;
  onClose: () => void;
  onCreate: (data: any) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [initialComment, setInitialComment] = useState("");
  const [initialAttachmentFile, setInitialAttachmentFile] =
    useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (!priority) {
      setError("Priority is required");
      return;
    }

    if (!assigneeId) {
      setError("Assignee is required");
      return;
    }

    if (!dueDate) {
      setError("Due date is required");
      return;
    }

    if (!currentUser) {
      setError("User not logged in");
      return;
    }

    setLoading(true);
    try {
      const taskData = {
        title,
        description: description || null,
        priority,
        dueDate,
        assigneeId,
        status: "todo",
      };

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(currentUser.id),
        },
        body: JSON.stringify(taskData),
      });

      if (!res.ok) throw new Error("Failed to create task");
      const data = await res.json();
      const newTaskId = data.task.id;

      if (initialComment.trim()) {
        try {
          await fetch(`/api/tasks/${newTaskId}/comments`, {
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

      if (initialAttachmentFile) {
        try {
          const formData = new FormData();
          formData.append("file", initialAttachmentFile);
          formData.append("filename", initialAttachmentFile.name);

          await fetch(`/api/tasks/${newTaskId}/attachments`, {
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
    } catch (err: any) {
      setError(err.message || "Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "90%",
          maxWidth: 600,
          background: COLORS.cardBg,
          padding: "24px",
          borderRadius: 12,
          boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
          border: "1px solid rgba(0,0,0,0.1)",
        }}
      >
        <PageContentCon
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
            paddingBottom: 16,
            borderBottom: "1px solid rgba(0,0,0,0.1)",
          }}
        >
          <h2
            style={{
              margin: 0,
              color: COLORS.text,
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            Create New Task
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: COLORS.muted,
              cursor: "pointer",
              fontSize: 20,
              padding: 0,
            }}
          >
            ✕
          </button>
        </PageContentCon>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                color: COLORS.muted,
                marginBottom: 6,
                fontWeight: 500,
              }}
            >
              Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: 6,
                border: "1px solid rgba(0,0,0,0.1)",
                background: "rgba(0,0,0,0.03)",
                color: COLORS.text,
                fontSize: 13,
                boxSizing: "border-box",
              }}
              placeholder="Task title"
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                color: COLORS.muted,
                marginBottom: 6,
                fontWeight: 500,
              }}
            >
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: "100%",
                minHeight: 80,
                padding: "10px",
                borderRadius: 6,
                border: "1px solid rgba(0,0,0,0.1)",
                background: "rgba(0,0,0,0.03)",
                color: COLORS.text,
                fontSize: 13,
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
              placeholder="Task description..."
            />
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  color: COLORS.muted,
                  marginBottom: 6,
                  fontWeight: 500,
                }}
              >
                Assignee *
              </label>
              <select
                required
                value={assigneeId || ""}
                onChange={(e) =>
                  setAssigneeId(e.target.value ? Number(e.target.value) : null)
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: 6,
                  border: "1px solid rgba(0,0,0,0.1)",
                  background: "rgba(0,0,0,0.03)",
                  color: COLORS.text,
                  fontSize: 13,
                  boxSizing: "border-box",
                }}
              >
                <option value="">Select an assignee...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email}{" "}
                    {currentUser?.id === u.id ? "(You)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  color: COLORS.muted,
                  marginBottom: 6,
                  fontWeight: 500,
                }}
              >
                Priority *
              </label>
              <select
                required
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: 6,
                  border: "1px solid rgba(0,0,0,0.1)",
                  background: "rgba(0,0,0,0.03)",
                  color: COLORS.text,
                  fontSize: 13,
                  boxSizing: "border-box",
                }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                color: COLORS.muted,
                marginBottom: 6,
                fontWeight: 500,
              }}
            >
              Due Date *
            </label>
            <DatePickerInput
              value={dueDate}
              onChange={setDueDate}
              required
              placeholder="Select date and time..."
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                color: COLORS.muted,
                marginBottom: 6,
                fontWeight: 500,
              }}
            >
              Add Initial Comment
            </label>
            <textarea
              value={initialComment}
              onChange={(e) => setInitialComment(e.target.value)}
              style={{
                width: "100%",
                minHeight: 60,
                padding: "10px",
                borderRadius: 6,
                border: "1px solid rgba(0,0,0,0.1)",
                background: "rgba(0,0,0,0.03)",
                color: COLORS.text,
                fontSize: 13,
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
              placeholder="Add a comment to this task (optional)..."
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                color: COLORS.muted,
                marginBottom: 6,
                fontWeight: 500,
              }}
            >
              Add Attachment
            </label>
            <input
              type="file"
              onChange={(e) =>
                setInitialAttachmentFile(e.target.files?.[0] || null)
              }
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: 6,
                border: "1px solid rgba(0,0,0,0.1)",
                background: "rgba(0,0,0,0.03)",
                color: COLORS.text,
                fontSize: 13,
                boxSizing: "border-box",
              }}
            />
            {initialAttachmentFile && (
              <div style={{ marginTop: 6, fontSize: 12, color: "#10b981" }}>
                📄 {initialAttachmentFile.name}
              </div>
            )}
          </div>

          {error && (
            <div
              style={{
                padding: "12px",
                borderRadius: 6,
                background: "rgba(239, 68, 68, 0.1)",
                color: COLORS.stuck,
                fontSize: 13,
                border: "1px solid rgba(239, 68, 68, 0.3)",
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "flex-end",
              marginTop: 8,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 16px",
                borderRadius: 6,
                background: "transparent",
                color: COLORS.text,
                border: "1px solid rgba(0,0,0,0.1)",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "10px 16px",
                borderRadius: 6,
                background: loading ? "rgba(59, 130, 246, 0.5)" : "#3b82f6",
                color: "#fff",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {loading ? "Creating..." : "Create Task"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
