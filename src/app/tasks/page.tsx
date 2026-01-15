"use client";

import React, { useEffect, useState } from "react";
import { getCurrentUser } from "@/utils/sessionManager";

type User = { id: number; name?: string | null; email: string };

type Comment = {
  id: number;
  taskId: number;
  userId?: number | null;
  content: string;
  createdAt?: string;
  user?: User | null;
};

type Attachment = {
  id: number;
  taskId: number;
  url: string;
  filename?: string | null;
  createdAt?: string;
};

type Task = {
  id: number;
  title: string;
  description?: string | null;
  status?: string;
  priority?: string | null;
  dueDate?: string | null;
  createdAt?: string;
  createdById?: number;
  createdBy?: User | null;
  assignee?: User | null;
  comments?: Comment[];
  attachments?: Attachment[];
};

const COLORS = {
  bg: "#ffffff",
  cardBg: "#F9FAFD",
  text: "#1f2937",
  muted: "#6b7280",
  todo: "#8b5cf6",
  inProgress: "#f59e0b",
  stuck: "#ef4444",
  done: "#10b981",
  shadow: "#E1F1FD",
};

const statusColors: { [key: string]: string } = {
  todo: COLORS.todo,
  inprogress: COLORS.inProgress,
  stuck: COLORS.stuck,
  completed: COLORS.done,
};

const statusLabels: { [key: string]: string } = {
  todo: "Todo",
  inprogress: "Working on it",
  stuck: "Stuck",
  completed: "Done",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [editingCell, setEditingCell] = useState<{
    taskId: number;
    field: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [taskDetails, setTaskDetails] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentValue, setEditingCommentValue] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("task");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Load current user from session manager
  useEffect(() => {
    const loadUser = async () => {
      const user = await getCurrentUser();
      if (user) {
        setCurrentUser(user);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    fetch("/api/tasks", {
      headers: {
        "x-user-id": String(currentUser.id),
      },
    })
      .then((r) => r.json())
      .then((d) => {
        const taskList = Array.isArray(d?.tasks) ? d.tasks : [];
        setTasks(taskList);
      })
      .catch(console.error);
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    // Fetch all active users for task assignment instead of just team members
    fetch("/api/users", {
      headers: {
        "x-user-id": String(currentUser.id),
      },
    })
      .then((r) => r.json())
      .then((d) => {
        // Filter to only active users (exclude inactive/pending approval)
        const activeUsers = (d?.users || []).filter(
          (u: User) => u.active !== false
        );
        setUsers(activeUsers);
      })
      .catch(console.error);
  }, [currentUser]);

  // Helper function to get headers with user ID
  const getHeaders = (additionalHeaders?: Record<string, string>) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(currentUser && { "x-user-id": String(currentUser.id) }),
    };
    return { ...headers, ...additionalHeaders };
  };

  const handleCreateTask = async (createdTask: any) => {
    try {
      setTasks((prev) => [createdTask, ...prev]);
      setShowCreateModal(false);
    } catch (err) {
      console.error("Error creating task:", err);
    }
  };

  const handleSaveField = async (taskId: number, field: string, value: any) => {
    try {
      const updateData: any = {};
      updateData[field] = value;

      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(updateData),
      });

      if (!res.ok) throw new Error("Failed to update");
      const data = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)));
      setEditingCell(null);
    } catch (err) {
      console.error("Error updating task:", err);
      setEditingCell(null);
    }
  };

  const handleDeleteTask = async (id: number) => {
    if (!confirm("Delete this task?")) return;
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });

      if (!res.ok) {
        let errorMsg = "Failed to delete";
        try {
          const error = await res.json();
          errorMsg = error.error || errorMsg;
        } catch {
          errorMsg = `Server error: ${res.status}`;
        }
        throw new Error(errorMsg);
      }

      setTasks((prev) => prev.filter((t) => t.id !== id));
      if (selectedTaskId === id) {
        setSelectedTaskId(null);
        setTaskDetails(null);
      }
    } catch (err) {
      console.error("Error deleting task:", err);
      alert(
        "Failed to delete task: " +
          (err instanceof Error ? err.message : "Unknown error")
      );
    }
  };

  const loadTaskDetails = async (taskId: number) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        headers: getHeaders(),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(
          error.error || `Failed to load task details (${res.status})`
        );
      }
      const data = await res.json();
      setTaskDetails(data.task);
      setComments(data.task.comments || []);
      setAttachments(data.task.attachments || []);
    } catch (err) {
      console.error("Error loading task details:", err);
      alert(
        `Error: ${
          err instanceof Error ? err.message : "Failed to load task details"
        }`
      );
    }
  };

  const handleAddComment = async (taskId: number) => {
    if (!newComment.trim()) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ content: newComment }),
      });
      if (!res.ok) throw new Error("Failed to add comment");
      const data = await res.json();
      setComments((prev) => [...prev, data.comment]);
      setNewComment("");
    } catch (err) {
      console.error("Error adding comment:", err);
    }
  };

  const handleDeleteComment = async (commentId: number, taskId: number) => {
    if (!confirm("Delete this comment?")) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments/${commentId}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete comment");
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      console.error("Error deleting comment:", err);
    }
  };

  const handleEditComment = async (
    commentId: number,
    taskId: number,
    newContent: string
  ) => {
    if (!newContent.trim()) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments/${commentId}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ content: newContent }),
      });
      if (!res.ok) throw new Error("Failed to update comment");
      const data = await res.json();
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? data.comment : c))
      );
      setEditingCommentId(null);
    } catch (err) {
      console.error("Error updating comment:", err);
    }
  };

  const handleAddAttachment = async (taskId: number) => {
    if (!attachmentFile) return;
    setUploadingAttachment(true);
    try {
      const formData = new FormData();
      formData.append("file", attachmentFile);
      formData.append("filename", attachmentFile.name);

      const res = await fetch(`/api/tasks/${taskId}/attachments`, {
        method: "POST",
        headers: {
          ...(currentUser && { "x-user-id": String(currentUser.id) }),
        },
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to upload attachment");
      const data = await res.json();
      setAttachments((prev) => [...prev, data.attachment]);
      setAttachmentFile(null);
    } catch (err) {
      console.error("Error uploading attachment:", err);
      alert("Failed to upload attachment");
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleDeleteAttachment = async (
    attachmentId: number,
    taskId: number
  ) => {
    if (!confirm("Delete this attachment?")) return;
    try {
      const res = await fetch(
        `/api/tasks/${taskId}/attachments/${attachmentId}`,
        {
          method: "DELETE",
          headers: getHeaders(),
        }
      );
      if (!res.ok) throw new Error("Failed to delete attachment");
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    } catch (err) {
      console.error("Error deleting attachment:", err);
      alert("Failed to delete attachment");
    }
  };

  const getFilteredAndSortedTasks = () => {
    const filtered = tasks.filter((task) => {
      const query = searchQuery.toLowerCase();
      const title = task.title.toLowerCase();
      const assignee =
        task.assignee?.name?.toLowerCase() ||
        task.assignee?.email?.toLowerCase() ||
        "";
      const dueDate = task.dueDate
        ? new Date(task.dueDate).toLocaleDateString()
        : "";

      return (
        title.includes(query) ||
        assignee.includes(query) ||
        dueDate.includes(query)
      );
    });

    filtered.sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortBy) {
        case "task":
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        case "assignee":
          aVal = (a.assignee?.name || a.assignee?.email || "").toLowerCase();
          bVal = (b.assignee?.name || b.assignee?.email || "").toLowerCase();
          break;
        case "status":
          aVal = a.status || "todo";
          bVal = b.status || "todo";
          break;
        case "priority":
          const priorityOrder: { [key: string]: number } = {
            low: 1,
            medium: 2,
            high: 3,
          };
          aVal = priorityOrder[a.priority || "medium"] || 2;
          bVal = priorityOrder[b.priority || "medium"] || 2;
          break;
        case "duedate":
          aVal = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          bVal = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          break;
        default:
          return 0;
      }

      if (sortOrder === "asc") {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    return filtered;
  };

  // Separate tasks into self-created and assigned
  const groupedTasks = () => {
    const filtered = getFilteredAndSortedTasks();
    const selfTasks = filtered.filter(
      (task) => task.createdById === currentUser?.id
    );
    const assignedTasks = filtered.filter(
      (task) => task.createdById !== currentUser?.id
    );
    return { selfTasks, assignedTasks };
  };

  return (
    <div style={{ padding: 20, minHeight: "100vh", background: COLORS.bg }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h1 style={{ margin: 0, color: COLORS.text, fontSize: 24 }}>tasks</h1>
          <button
            style={{
              background: "none",
              border: "none",
              color: COLORS.muted,
              cursor: "pointer",
              fontSize: 14,
              padding: 0,
            }}
          >
            ▼
          </button>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: "10px 16px",
            borderRadius: 6,
            background: "#3b82f6",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          + New task
        </button>
      </div>

      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: 6,
            background: "rgba(0,0,0,0.03)",
            border: "1px solid rgba(0,0,0,0.1)",
          }}
        >
          <span style={{ fontSize: 16 }}>🔍</span>
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: "none",
              border: "none",
              color: COLORS.text,
              fontSize: 13,
              outline: "none",
              width: 200,
            }}
          />
        </div>

        {/* Sort/Filter Dropdown */}
        <div style={{ display: "flex", gap: 8 }}>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              background: "rgba(0,0,0,0.03)",
              color: COLORS.text,
              border: "1px solid rgba(0,0,0,0.1)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            <option value="task">Sort by Task</option>
            <option value="assignee">Sort by Assignee</option>
            <option value="status">Sort by Status</option>
            <option value="priority">Sort by Priority</option>
            <option value="duedate">Sort by Due Date</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              background: "rgba(0,0,0,0.03)",
              color: COLORS.text,
              border: "1px solid rgba(0,0,0,0.1)",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {sortOrder === "asc" ? "↑ ASC" : "↓ DESC"}
          </button>
        </div>
      </div>

      {/* Tasks Table */}
      <div
        style={{
          background: "#F9FAFD",
          border: "1px solid rgba(0,0,0,0.1)",
          filter: "drop-shadow(2px 2px 5px rgba(211, 212, 214, 0.5))",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            overflowX: "auto",
            maxHeight: "calc(100vh - 200px)",
            overflowY: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
            }}
          >
            <thead
              style={{
                background: "rgba(0,0,0,0.03)",
                position: "sticky",
                top: 0,
              }}
            >
              <tr
                style={{
                  borderBottom: "1px solid rgba(0,0,0,0.1)",
                }}
              >
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontWeight: 600,
                    color: COLORS.muted,
                  }}
                >
                  Task
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontWeight: 600,
                    color: COLORS.muted,
                    minWidth: 150,
                  }}
                >
                  Assignee
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "center",
                    fontWeight: 600,
                    color: COLORS.muted,
                    minWidth: 80,
                  }}
                >
                  Status
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "center",
                    fontWeight: 600,
                    color: COLORS.muted,
                    minWidth: 100,
                  }}
                >
                  Attachment
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "center",
                    fontWeight: 600,
                    color: COLORS.muted,
                    minWidth: 100,
                  }}
                >
                  Comment
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "center",
                    fontWeight: 600,
                    color: COLORS.muted,
                    minWidth: 80,
                  }}
                >
                  Priority
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "center",
                    fontWeight: 600,
                    color: COLORS.muted,
                    minWidth: 120,
                  }}
                >
                  Due Date
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "center",
                    fontWeight: 600,
                    color: COLORS.muted,
                    minWidth: 80,
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {getFilteredAndSortedTasks().length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: "40px 16px",
                      textAlign: "center",
                      color: COLORS.muted,
                    }}
                  >
                    {tasks.length === 0 ? "No tasks yet" : "No matching tasks"}
                  </td>
                </tr>
              ) : (
                <>
                  {/* Self-created tasks section */}
                  {groupedTasks().selfTasks.length > 0 && (
                    <>
                      <tr
                        style={{
                          background: "rgba(0,0,0,0.05)",
                          borderBottom: "2px solid rgba(0,0,0,0.1)",
                        }}
                      >
                        <td
                          colSpan={8}
                          style={{
                            padding: "12px 16px",
                            fontWeight: 600,
                            color: COLORS.text,
                            fontSize: 12,
                          }}
                        >
                          My Tasks ({groupedTasks().selfTasks.length})
                        </td>
                      </tr>
                      {groupedTasks().selfTasks.map((task) => (
                        <tr
                          key={task.id}
                          style={{
                            borderBottom: "1px solid rgba(0,0,0,0.03)",
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background =
                              "rgba(255,255,255,0.03)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background =
                              "";
                          }}
                        >
                          <td
                            style={{
                              padding: "12px 16px",
                              color: "#333",
                              cursor: "pointer",
                            }}
                            onClick={() => {
                              setEditingCell({
                                taskId: task.id,
                                field: "title",
                              });
                              setEditValue(task.title);
                            }}
                          >
                            {editingCell?.taskId === task.id &&
                            editingCell?.field === "title" ? (
                              <input
                                autoFocus
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() =>
                                  editValue.trim()
                                    ? handleSaveField(
                                        task.id,
                                        "title",
                                        editValue
                                      )
                                    : setEditingCell(null)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    if (editValue.trim()) {
                                      handleSaveField(
                                        task.id,
                                        "title",
                                        editValue
                                      );
                                    }
                                  } else if (e.key === "Escape") {
                                    setEditingCell(null);
                                  }
                                }}
                                style={{
                                  width: "100%",
                                  padding: "6px 8px",
                                  borderRadius: 4,
                                  border: "1px solid #3b82f6",
                                  background: COLORS.cardBg,
                                  color: COLORS.text,
                                  fontSize: 13,
                                }}
                              />
                            ) : (
                              <div>
                                <div
                                  style={{
                                    fontWeight: 500,
                                    marginBottom: 4,
                                  }}
                                >
                                  {task.title}
                                </div>
                                {task.description && (
                                  <div
                                    style={{
                                      fontSize: 12,
                                      color: COLORS.muted,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                      maxWidth: 300,
                                    }}
                                  >
                                    {task.description}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              color: COLORS.text,
                              cursor: "pointer",
                            }}
                            onClick={() => {
                              setEditingCell({
                                taskId: task.id,
                                field: "assigneeId",
                              });
                              setEditValue(task.assignee?.id?.toString() || "");
                            }}
                          >
                            {editingCell?.taskId === task.id &&
                            editingCell?.field === "assigneeId" ? (
                              <select
                                autoFocus
                                value={editValue}
                                onChange={(e) => {
                                  setEditValue(e.target.value);
                                  handleSaveField(
                                    task.id,
                                    "assigneeId",
                                    e.target.value
                                      ? Number(e.target.value)
                                      : null
                                  );
                                }}
                                onBlur={() => setEditingCell(null)}
                                onKeyDown={(e) => {
                                  if (e.key === "Escape") {
                                    setEditingCell(null);
                                  }
                                }}
                                style={{
                                  width: "100%",
                                  padding: "6px 8px",
                                  borderRadius: 4,
                                  border: "1px solid #3b82f6",
                                  background: COLORS.cardBg,
                                  color: COLORS.text,
                                  fontSize: 12,
                                }}
                              >
                                <option value="">Unassigned</option>
                                {users.map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.name || u.email}
                                  </option>
                                ))}
                              </select>
                            ) : task.assignee ? (
                              <div>
                                {task.assignee.name || task.assignee.email}
                              </div>
                            ) : (
                              <span style={{ color: COLORS.muted }}>
                                Unassigned
                              </span>
                            )}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              textAlign: "center",
                            }}
                            onClick={() => {
                              setEditingCell({
                                taskId: task.id,
                                field: "status",
                              });
                              setEditValue(task.status || "todo");
                            }}
                          >
                            {editingCell?.taskId === task.id &&
                            editingCell?.field === "status" ? (
                              <select
                                autoFocus
                                value={editValue}
                                onChange={(e) => {
                                  setEditValue(e.target.value);
                                  handleSaveField(
                                    task.id,
                                    "status",
                                    e.target.value
                                  );
                                }}
                                onBlur={() => setEditingCell(null)}
                                onKeyDown={(e) => {
                                  if (e.key === "Escape") {
                                    setEditingCell(null);
                                  }
                                }}
                                style={{
                                  width: "100%",
                                  padding: "6px 8px",
                                  borderRadius: 4,
                                  border: "1px solid #3b82f6",
                                  background: COLORS.cardBg,
                                  color: COLORS.text,
                                  fontSize: 12,
                                }}
                              >
                                <option value="todo">To do</option>
                                <option value="inprogress">In Progress</option>
                                <option value="stuck">Overdue</option>
                                <option value="completed">Done</option>
                              </select>
                            ) : (
                              <div
                                style={{
                                  display: "inline-block",
                                  padding: "4px 10px",
                                  borderRadius: 4,
                                  background:
                                    statusColors[task.status || "todo"],
                                  color: "#fff",
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                              >
                                {statusLabels[task.status || "todo"]}
                              </div>
                            )}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              textAlign: "center",
                              color: COLORS.text,
                              cursor: "pointer",
                            }}
                            onClick={() => {
                              setSelectedTaskId(task.id);
                              loadTaskDetails(task.id);
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 4,
                              }}
                            >
                              <span>📎</span>
                              <span style={{ fontSize: 12 }}>
                                {task.attachments?.length || 0}
                              </span>
                            </div>
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              textAlign: "center",
                              color: COLORS.text,
                              cursor: "pointer",
                            }}
                            onClick={() => {
                              setSelectedTaskId(task.id);
                              loadTaskDetails(task.id);
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 4,
                              }}
                            >
                              <span>💬</span>
                              <span style={{ fontSize: 12 }}>
                                {task.comments?.length || 0}
                              </span>
                            </div>
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              textAlign: "center",
                              color: COLORS.text,
                            }}
                            onClick={() => {
                              setEditingCell({
                                taskId: task.id,
                                field: "priority",
                              });
                              setEditValue(task.priority || "medium");
                            }}
                          >
                            {editingCell?.taskId === task.id &&
                            editingCell?.field === "priority" ? (
                              <select
                                autoFocus
                                value={editValue}
                                onChange={(e) => {
                                  setEditValue(e.target.value);
                                  handleSaveField(
                                    task.id,
                                    "priority",
                                    e.target.value
                                  );
                                }}
                                onBlur={() => setEditingCell(null)}
                                onKeyDown={(e) => {
                                  if (e.key === "Escape") {
                                    setEditingCell(null);
                                  }
                                }}
                                style={{
                                  width: "100%",
                                  padding: "6px 8px",
                                  borderRadius: 4,
                                  border: "1px solid #3b82f6",
                                  background: COLORS.cardBg,
                                  color: COLORS.text,
                                  fontSize: 12,
                                }}
                              >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                              </select>
                            ) : task.priority ? (
                              <span
                                style={{
                                  textTransform: "capitalize",
                                  cursor: "pointer",
                                }}
                              >
                                {task.priority}
                              </span>
                            ) : (
                              <span
                                style={{
                                  color: COLORS.muted,
                                  cursor: "pointer",
                                }}
                              >
                                -
                              </span>
                            )}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              textAlign: "center",
                              color: COLORS.text,
                            }}
                            onClick={() => {
                              setEditingCell({
                                taskId: task.id,
                                field: "dueDate",
                              });
                              setEditValue(
                                task.dueDate
                                  ? new Date(task.dueDate)
                                      .toISOString()
                                      .slice(0, 16)
                                  : ""
                              );
                            }}
                          >
                            {editingCell?.taskId === task.id &&
                            editingCell?.field === "dueDate" ? (
                              <input
                                autoFocus
                                type="datetime-local"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() =>
                                  handleSaveField(
                                    task.id,
                                    "dueDate",
                                    editValue || null
                                  )
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleSaveField(
                                      task.id,
                                      "dueDate",
                                      editValue || null
                                    );
                                  }
                                }}
                                style={{
                                  padding: "6px 8px",
                                  borderRadius: 4,
                                  border: "1px solid #3b82f6",
                                  background: COLORS.cardBg,
                                  color: COLORS.text,
                                  fontSize: 12,
                                }}
                              />
                            ) : task.dueDate ? (
                              <span style={{ cursor: "pointer" }}>
                                {new Date(task.dueDate).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "2-digit",
                                    year: "2-digit",
                                  }
                                )}
                              </span>
                            ) : (
                              <span
                                style={{
                                  color: COLORS.muted,
                                  cursor: "pointer",
                                }}
                              >
                                -
                              </span>
                            )}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              textAlign: "center",
                            }}
                          >
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              style={{
                                background: "none",
                                border: "none",
                                color: COLORS.stuck,
                                cursor: "pointer",
                                fontSize: 14,
                                padding: 4,
                              }}
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </>
                  )}

                  {/* Assigned tasks section */}
                  {groupedTasks().assignedTasks.length > 0 && (
                    <>
                      <tr
                        style={{
                          background: "rgba(59, 130, 246, 0.05)",
                          borderBottom: "2px solid rgba(59, 130, 246, 0.2)",
                        }}
                      >
                        <td
                          colSpan={8}
                          style={{
                            padding: "12px 16px",
                            fontWeight: 600,
                            color: "#3b82f6",
                            fontSize: 12,
                          }}
                        >
                          Assigned to Me ({groupedTasks().assignedTasks.length})
                        </td>
                      </tr>
                      {groupedTasks().assignedTasks.map((task) => (
                        <tr
                          key={task.id}
                          style={{
                            borderBottom: "1px solid rgba(0,0,0,0.03)",
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background =
                              "rgba(255,255,255,0.03)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background =
                              "";
                          }}
                        >
                          <td
                            style={{
                              padding: "12px 16px",
                              color: "#333",
                              cursor: "pointer",
                            }}
                            onClick={() => {
                              setEditingCell({
                                taskId: task.id,
                                field: "title",
                              });
                              setEditValue(task.title);
                            }}
                          >
                            {editingCell?.taskId === task.id &&
                            editingCell?.field === "title" ? (
                              <input
                                autoFocus
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() =>
                                  editValue.trim()
                                    ? handleSaveField(
                                        task.id,
                                        "title",
                                        editValue
                                      )
                                    : setEditingCell(null)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    if (editValue.trim()) {
                                      handleSaveField(
                                        task.id,
                                        "title",
                                        editValue
                                      );
                                    }
                                  } else if (e.key === "Escape") {
                                    setEditingCell(null);
                                  }
                                }}
                                style={{
                                  width: "100%",
                                  padding: "6px 8px",
                                  borderRadius: 4,
                                  border: "1px solid #3b82f6",
                                  background: COLORS.cardBg,
                                  color: COLORS.text,
                                  fontSize: 13,
                                }}
                              />
                            ) : (
                              <div>
                                <div
                                  style={{
                                    fontWeight: 500,
                                    marginBottom: 4,
                                  }}
                                >
                                  {task.title}
                                </div>
                                {task.description && (
                                  <div
                                    style={{
                                      fontSize: 12,
                                      color: COLORS.muted,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                      maxWidth: 300,
                                    }}
                                  >
                                    {task.description}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              color: COLORS.text,
                              cursor: "pointer",
                            }}
                            onClick={() => {
                              setEditingCell({
                                taskId: task.id,
                                field: "assigneeId",
                              });
                              setEditValue(task.assignee?.id?.toString() || "");
                            }}
                          >
                            {editingCell?.taskId === task.id &&
                            editingCell?.field === "assigneeId" ? (
                              <select
                                autoFocus
                                value={editValue}
                                onChange={(e) => {
                                  setEditValue(e.target.value);
                                  handleSaveField(
                                    task.id,
                                    "assigneeId",
                                    e.target.value
                                      ? Number(e.target.value)
                                      : null
                                  );
                                }}
                                onBlur={() => setEditingCell(null)}
                                onKeyDown={(e) => {
                                  if (e.key === "Escape") {
                                    setEditingCell(null);
                                  }
                                }}
                                style={{
                                  width: "100%",
                                  padding: "6px 8px",
                                  borderRadius: 4,
                                  border: "1px solid #3b82f6",
                                  background: COLORS.cardBg,
                                  color: COLORS.text,
                                  fontSize: 12,
                                }}
                              >
                                <option value="">Unassigned</option>
                                {users.map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.name || u.email}
                                  </option>
                                ))}
                              </select>
                            ) : task.assignee ? (
                              <div>
                                {task.assignee.name || task.assignee.email}
                              </div>
                            ) : (
                              <span style={{ color: COLORS.muted }}>
                                Unassigned
                              </span>
                            )}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              textAlign: "center",
                            }}
                            onClick={() => {
                              setEditingCell({
                                taskId: task.id,
                                field: "status",
                              });
                              setEditValue(task.status || "todo");
                            }}
                          >
                            {editingCell?.taskId === task.id &&
                            editingCell?.field === "status" ? (
                              <select
                                autoFocus
                                value={editValue}
                                onChange={(e) => {
                                  setEditValue(e.target.value);
                                  handleSaveField(
                                    task.id,
                                    "status",
                                    e.target.value
                                  );
                                }}
                                onBlur={() => setEditingCell(null)}
                                onKeyDown={(e) => {
                                  if (e.key === "Escape") {
                                    setEditingCell(null);
                                  }
                                }}
                                style={{
                                  width: "100%",
                                  padding: "6px 8px",
                                  borderRadius: 4,
                                  border: "1px solid #3b82f6",
                                  background: COLORS.cardBg,
                                  color: COLORS.text,
                                  fontSize: 12,
                                }}
                              >
                                <option value="todo">To do</option>
                                <option value="inprogress">In Progress</option>
                                <option value="stuck">Overdue</option>
                                <option value="completed">Done</option>
                              </select>
                            ) : (
                              <div
                                style={{
                                  display: "inline-block",
                                  padding: "4px 10px",
                                  borderRadius: 4,
                                  background:
                                    statusColors[task.status || "todo"],
                                  color: "#fff",
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                              >
                                {statusLabels[task.status || "todo"]}
                              </div>
                            )}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              textAlign: "center",
                              color: COLORS.text,
                              cursor: "pointer",
                            }}
                            onClick={() => {
                              setSelectedTaskId(task.id);
                              loadTaskDetails(task.id);
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 4,
                              }}
                            >
                              <span>📎</span>
                              <span style={{ fontSize: 12 }}>
                                {task.attachments?.length || 0}
                              </span>
                            </div>
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              textAlign: "center",
                              color: COLORS.text,
                              cursor: "pointer",
                            }}
                            onClick={() => {
                              setSelectedTaskId(task.id);
                              loadTaskDetails(task.id);
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 4,
                              }}
                            >
                              <span>💬</span>
                              <span style={{ fontSize: 12 }}>
                                {task.comments?.length || 0}
                              </span>
                            </div>
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              textAlign: "center",
                              color: COLORS.text,
                            }}
                            onClick={() => {
                              setEditingCell({
                                taskId: task.id,
                                field: "priority",
                              });
                              setEditValue(task.priority || "medium");
                            }}
                          >
                            {editingCell?.taskId === task.id &&
                            editingCell?.field === "priority" ? (
                              <select
                                autoFocus
                                value={editValue}
                                onChange={(e) => {
                                  setEditValue(e.target.value);
                                  handleSaveField(
                                    task.id,
                                    "priority",
                                    e.target.value
                                  );
                                }}
                                onBlur={() => setEditingCell(null)}
                                onKeyDown={(e) => {
                                  if (e.key === "Escape") {
                                    setEditingCell(null);
                                  }
                                }}
                                style={{
                                  width: "100%",
                                  padding: "6px 8px",
                                  borderRadius: 4,
                                  border: "1px solid #3b82f6",
                                  background: COLORS.cardBg,
                                  color: COLORS.text,
                                  fontSize: 12,
                                }}
                              >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                              </select>
                            ) : task.priority ? (
                              <span
                                style={{
                                  textTransform: "capitalize",
                                  cursor: "pointer",
                                }}
                              >
                                {task.priority}
                              </span>
                            ) : (
                              <span
                                style={{
                                  color: COLORS.muted,
                                  cursor: "pointer",
                                }}
                              >
                                -
                              </span>
                            )}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              textAlign: "center",
                              color: COLORS.text,
                            }}
                            onClick={() => {
                              setEditingCell({
                                taskId: task.id,
                                field: "dueDate",
                              });
                              setEditValue(
                                task.dueDate
                                  ? new Date(task.dueDate)
                                      .toISOString()
                                      .slice(0, 16)
                                  : ""
                              );
                            }}
                          >
                            {editingCell?.taskId === task.id &&
                            editingCell?.field === "dueDate" ? (
                              <input
                                autoFocus
                                type="datetime-local"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() =>
                                  handleSaveField(
                                    task.id,
                                    "dueDate",
                                    editValue || null
                                  )
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleSaveField(
                                      task.id,
                                      "dueDate",
                                      editValue || null
                                    );
                                  }
                                }}
                                style={{
                                  padding: "6px 8px",
                                  borderRadius: 4,
                                  border: "1px solid #3b82f6",
                                  background: COLORS.cardBg,
                                  color: COLORS.text,
                                  fontSize: 12,
                                }}
                              />
                            ) : task.dueDate ? (
                              <span style={{ cursor: "pointer" }}>
                                {new Date(task.dueDate).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "2-digit",
                                    year: "2-digit",
                                  }
                                )}
                              </span>
                            ) : (
                              <span
                                style={{
                                  color: COLORS.muted,
                                  cursor: "pointer",
                                }}
                              >
                                -
                              </span>
                            )}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              textAlign: "center",
                            }}
                          >
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              style={{
                                background: "none",
                                border: "none",
                                color: COLORS.stuck,
                                cursor: "pointer",
                                fontSize: 14,
                                padding: 4,
                              }}
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Task Details Panel */}
      {selectedTaskId && taskDetails && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "flex-end",
            zIndex: 1000,
          }}
          onClick={() => setSelectedTaskId(null)}
        >
          <div
            style={{
              width: "400px",
              height: "100%",
              background: COLORS.cardBg,
              borderLeft: "1px solid rgba(0,0,0,0.1)",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: "20px 16px",
                borderBottom: "1px solid rgba(0,0,0,0.1)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2 style={{ margin: 0, color: COLORS.text, fontSize: 16 }}>
                Task Details
              </h2>
              <button
                onClick={() => setSelectedTaskId(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: COLORS.muted,
                  cursor: "pointer",
                  fontSize: 20,
                }}
              >
                ✕
              </button>
            </div>

            {/* Task Info */}
            <div style={{ padding: 16 }}>
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: COLORS.muted,
                    marginBottom: 4,
                    textTransform: "uppercase",
                    fontWeight: 600,
                  }}
                >
                  Title
                </div>
                <div
                  style={{ color: COLORS.text, fontSize: 14, fontWeight: 500 }}
                >
                  {taskDetails.title}
                </div>
              </div>

              {taskDetails.description && (
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: COLORS.muted,
                      marginBottom: 4,
                      textTransform: "uppercase",
                      fontWeight: 600,
                    }}
                  >
                    Description
                  </div>
                  <div style={{ color: COLORS.text, fontSize: 13 }}>
                    {taskDetails.description}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: COLORS.muted,
                    marginBottom: 4,
                    textTransform: "uppercase",
                    fontWeight: 600,
                  }}
                >
                  Status
                </div>
                <div
                  style={{
                    display: "inline-block",
                    padding: "4px 10px",
                    borderRadius: 4,
                    background: statusColors[taskDetails.status || "todo"],
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {statusLabels[taskDetails.status || "todo"]}
                </div>
              </div>

              {taskDetails.priority && (
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: COLORS.muted,
                      marginBottom: 4,
                      textTransform: "uppercase",
                      fontWeight: 600,
                    }}
                  >
                    Priority
                  </div>
                  <div
                    style={{
                      color: COLORS.text,
                      fontSize: 13,
                      textTransform: "capitalize",
                    }}
                  >
                    {taskDetails.priority}
                  </div>
                </div>
              )}

              {taskDetails.dueDate && (
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: COLORS.muted,
                      marginBottom: 4,
                      textTransform: "uppercase",
                      fontWeight: 600,
                    }}
                  >
                    Due Date
                  </div>
                  <div style={{ color: COLORS.text, fontSize: 13 }}>
                    {new Date(taskDetails.dueDate).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "2-digit",
                      year: "numeric",
                    })}
                  </div>
                </div>
              )}

              {taskDetails.assignee && (
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: COLORS.muted,
                      marginBottom: 4,
                      textTransform: "uppercase",
                      fontWeight: 600,
                    }}
                  >
                    Assignee
                  </div>
                  <div style={{ color: COLORS.text, fontSize: 13 }}>
                    {taskDetails.assignee.name || taskDetails.assignee.email}
                  </div>
                </div>
              )}
            </div>

            {/* Attachments Section */}
            <div
              style={{
                borderTop: "1px solid rgba(0,0,0,0.1)",
                padding: "16px",
              }}
            >
              <h3
                style={{
                  margin: "0 0 12px 0",
                  color: COLORS.text,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Attachments ({attachments.length})
              </h3>

              {/* Upload Attachment */}
              <div
                style={{
                  marginBottom: 16,
                  display: "flex",
                  gap: 8,
                }}
              >
                <input
                  type="file"
                  onChange={(e) =>
                    setAttachmentFile(e.target.files?.[0] || null)
                  }
                  disabled={uploadingAttachment}
                  style={{
                    flex: 1,
                    padding: "6px 8px",
                    borderRadius: 4,
                    border: "1px solid rgba(0,0,0,0.1)",
                    background: COLORS.bg,
                    color: COLORS.text,
                    fontSize: 12,
                  }}
                />
                <button
                  onClick={() => handleAddAttachment(selectedTaskId!)}
                  disabled={!attachmentFile || uploadingAttachment}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 4,
                    background:
                      attachmentFile && !uploadingAttachment
                        ? "#3b82f6"
                        : "rgba(59, 130, 246, 0.5)",
                    color: "#fff",
                    border: "none",
                    cursor:
                      attachmentFile && !uploadingAttachment
                        ? "pointer"
                        : "not-allowed",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {uploadingAttachment ? "Uploading..." : "Upload"}
                </button>
              </div>

              {/* Attachments List */}
              <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                {attachments.length === 0 ? (
                  <div
                    style={{
                      color: COLORS.muted,
                      fontSize: 12,
                      textAlign: "center",
                      padding: "20px 0",
                    }}
                  >
                    No attachments yet
                  </div>
                ) : (
                  attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      style={{
                        marginBottom: 10,
                        padding: 10,
                        borderRadius: 4,
                        background: COLORS.bg,
                        borderLeft: "2px solid #3b82f6",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "#3b82f6",
                            textDecoration: "none",
                            fontSize: 12,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            display: "block",
                          }}
                          title={attachment.filename || "Attachment"}
                        >
                          📄 {attachment.filename || "Download"}
                        </a>
                        {attachment.createdAt && (
                          <div
                            style={{
                              fontSize: 11,
                              color: COLORS.muted,
                              marginTop: 4,
                            }}
                          >
                            {new Date(
                              attachment.createdAt
                            ).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() =>
                          handleDeleteAttachment(attachment.id, selectedTaskId!)
                        }
                        style={{
                          background: "none",
                          border: "none",
                          color: COLORS.stuck,
                          cursor: "pointer",
                          padding: "4px 8px",
                          fontSize: 12,
                          marginLeft: 8,
                          flexShrink: 0,
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Comments Section */}
            <div
              style={{
                borderTop: "1px solid rgba(0,0,0,0.1)",
                padding: "16px",
              }}
            >
              <h3
                style={{
                  margin: "0 0 12px 0",
                  color: COLORS.text,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Comments ({comments.length})
              </h3>

              {/* Add Comment */}
              <div
                style={{
                  marginBottom: 16,
                  display: "flex",
                  gap: 8,
                }}
              >
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newComment.trim()) {
                      handleAddComment(selectedTaskId);
                    }
                  }}
                  placeholder="Add a comment..."
                  style={{
                    flex: 1,
                    padding: "8px 10px",
                    borderRadius: 4,
                    border: "1px solid rgba(0,0,0,0.1)",
                    background: COLORS.bg,
                    color: COLORS.text,
                    fontSize: 12,
                  }}
                />
                <button
                  onClick={() => handleAddComment(selectedTaskId)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 4,
                    background: "#3b82f6",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  Add
                </button>
              </div>

              {/* Comments List */}
              <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                {comments.length === 0 ? (
                  <div
                    style={{
                      color: COLORS.muted,
                      fontSize: 12,
                      textAlign: "center",
                      padding: "20px 0",
                    }}
                  >
                    No comments yet
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div
                      key={comment.id}
                      style={{
                        marginBottom: 12,
                        padding: 10,
                        borderRadius: 4,
                        background: COLORS.bg,
                        borderLeft: "2px solid #3b82f6",
                      }}
                    >
                      {editingCommentId === comment.id ? (
                        <div style={{ display: "flex", gap: 8 }}>
                          <input
                            autoFocus
                            type="text"
                            value={editingCommentValue}
                            onChange={(e) =>
                              setEditingCommentValue(e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleEditComment(
                                  comment.id,
                                  selectedTaskId,
                                  editingCommentValue
                                );
                              } else if (e.key === "Escape") {
                                setEditingCommentId(null);
                              }
                            }}
                            style={{
                              flex: 1,
                              padding: "6px 8px",
                              borderRadius: 3,
                              border: "1px solid #3b82f6",
                              background: COLORS.cardBg,
                              color: COLORS.text,
                              fontSize: 12,
                            }}
                          />
                          <button
                            onClick={() =>
                              handleEditComment(
                                comment.id,
                                selectedTaskId,
                                editingCommentValue
                              )
                            }
                            style={{
                              padding: "4px 8px",
                              borderRadius: 3,
                              background: "#10b981",
                              color: "#fff",
                              border: "none",
                              cursor: "pointer",
                              fontSize: 11,
                            }}
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <>
                          <div
                            style={{
                              color: COLORS.text,
                              fontSize: 12,
                              marginBottom: 6,
                            }}
                          >
                            {comment.content}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              fontSize: 11,
                              color: COLORS.muted,
                            }}
                          >
                            {comment.user && (
                              <span>{comment.user.name || "Anonymous"}</span>
                            )}
                            <button
                              onClick={() => {
                                setEditingCommentId(comment.id);
                                setEditingCommentValue(comment.content);
                              }}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#3b82f6",
                                cursor: "pointer",
                                padding: 0,
                                fontSize: 11,
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteComment(comment.id, selectedTaskId)
                              }
                              style={{
                                background: "none",
                                border: "none",
                                color: COLORS.stuck,
                                cursor: "pointer",
                                padding: 0,
                                fontSize: 11,
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <CreateTaskModal
          users={users}
          currentUser={currentUser}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateTask}
        />
      )}
    </div>
  );
}

function CreateTaskModal({
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
  const [assigneeId, setAssigneeId] = useState<number | "">("");
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
        dueDate: dueDate || null,
        assigneeId: assigneeId || null,
        status: "todo",
      };

      // Create task first
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

      // Add initial comment if provided
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

      // Add initial attachment if provided
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
          padding: 24,
          borderRadius: 12,
          boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
          border: "1px solid rgba(0,0,0,0.1)",
        }}
      >
        <div
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
        </div>

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
                padding: 10,
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
                padding: 10,
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
                Assignee
              </label>
              <select
                value={assigneeId}
                onChange={(e) =>
                  setAssigneeId(e.target.value ? Number(e.target.value) : "")
                }
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 6,
                  border: "1px solid rgba(0,0,0,0.1)",
                  background: "rgba(0,0,0,0.03)",
                  color: COLORS.text,
                  fontSize: 13,
                  boxSizing: "border-box",
                }}
              >
                <option value="">Unassigned</option>
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
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                style={{
                  width: "100%",
                  padding: 10,
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
              Due Date
            </label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 6,
                border: "1px solid rgba(0,0,0,0.1)",
                background: "rgba(0,0,0,0.03)",
                color: COLORS.text,
                fontSize: 13,
                boxSizing: "border-box",
              }}
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
                padding: 10,
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
                padding: 10,
                borderRadius: 6,
                border: "1px solid rgba(0,0,0,0.1)",
                background: "rgba(0,0,0,0.03)",
                color: COLORS.text,
                fontSize: 13,
                boxSizing: "border-box",
              }}
            />
            {initialAttachmentFile && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  color: "#10b981",
                }}
              >
                📄 {initialAttachmentFile.name}
              </div>
            )}
          </div>

          {error && (
            <div
              style={{
                padding: 12,
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
