"use client";

import React, { useEffect, useState } from "react";
import { getCurrentUser } from "@/utils/sessionManager";
import { useAuthProtection } from "@/app/hooks/useAuthProtection";
import { PageContainer } from "@/app/components/PageContainer";
import { PageContentCon } from "@/app/components/PageContentCon";
import { DatePickerInput } from "@/app/components/DatePickerInput";

type User = {
  id: number;
  name?: string | null;
  email: string;
  active?: boolean;
};

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
  bg: "#transparent",
  cardBg: "#transparent",
  text: "#ffffff",
  muted: "#ffffff",
  todo: "#8b5cf6",
  inProgress: "#f59e0b",
  stuck: "#ef4444",
  done: "#10b981",
  shadow: "#000000",
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
  useAuthProtection(); // Protect this route
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
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

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
    // Fetch all active users for task assignment
    // Use /api/users/assignable endpoint which is available to all authenticated users
    fetch("/api/users/assignable", {
      headers: {
        "x-user-id": String(currentUser.id),
      },
    })
      .then((r) => r.json())
      .then((d) => {
        setUsers(d?.users || []);
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
          (err instanceof Error ? err.message : "Unknown error"),
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
          error.error || `Failed to load task details (${res.status})`,
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
        }`,
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
    newContent: string,
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
        prev.map((c) => (c.id === commentId ? data.comment : c)),
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
    taskId: number,
  ) => {
    if (!confirm("Delete this attachment?")) return;
    try {
      const res = await fetch(
        `/api/tasks/${taskId}/attachments/${attachmentId}`,
        {
          method: "DELETE",
          headers: getHeaders(),
        },
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
      (task) => task.createdById === currentUser?.id,
    );
    const assignedTasks = filtered.filter(
      (task) => task.createdById !== currentUser?.id,
    );
    return { selfTasks, assignedTasks };
  };

  return (
    <PageContainer title="TASKS">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: "10px 16px 10px 16px",
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
            gap: 60,
            padding: "8px 18px 8px 18px",
            borderRadius: 32,
            background: "rgba(59, 130, 246, 0.15)",
            boxShadow: "1px 1px 12px rgba(0, 0, 0, 0.20)",
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
              marginLeft: -50,
              border: "none",
              color: "#ffffff",
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
              padding: "4px 10px 4px 10px",
              borderRadius: 6,
              background: "rgba(59, 130, 246, 0.25)",
              color: "#ffffff",
              boxShadow: "1px 1px 2px rgba(0, 0, 0, 0.20)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            <option value="task">Task</option>
            <option value="assignee">Assignee</option>
            <option value="status">Status</option>
            <option value="priority">Priority</option>
            <option value="duedate">Due Date</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            style={{
              padding: "8px",
              borderRadius: 6,
              background: "transparent",
              color: "#ffffff",
              boxShadow: "1px 1px 12px rgba(0, 0, 0, 0.20)",
              cursor: "pointer",
              fontSize: 10,
              fontWeight: 400,
            }}
          >
            {sortOrder === "asc" ? "↑ ASC" : "↓ DESC"}
          </button>

          {/* View Mode Toggle */}
          <button
            onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")}
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              background:
                viewMode === "grid" ? "#3b82f6" : "rgba(59, 130, 246, 0.3)",
              color: "#ffffff",
              border: "1px solid rgba(59, 130, 246, 0.5)",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
              transition: "all 0.3s ease",
            }}
          >
            {viewMode === "grid" ? "📊 Grid" : "📋 List"}
          </button>
        </div>
      </div>

      {/* Tasks View - List or Grid */}
      <PageContentCon
        style={{
          overflowX: viewMode === "grid" ? "auto" : "auto",
          maxHeight: "calc(100vh - 200px)",
          overflowY: "auto",
        }}
      >
        {viewMode === "list" ? (
          /* LIST VIEW */
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
                    padding: "12px 16px 12px 16px",
                    textAlign: "left",
                    fontWeight: 300,
                    color: COLORS.text,
                  }}
                >
                  Task
                </th>
                <th
                  style={{
                    padding: "12px 16px 12px 16px",
                    textAlign: "left",
                    fontWeight: 300,
                    color: COLORS.text,
                    minWidth: 150,
                  }}
                >
                  Assignee
                </th>
                <th
                  style={{
                    padding: "12px 16px 12px 16px",
                    textAlign: "center",
                    fontWeight: 300,
                    color: COLORS.text,
                    minWidth: 80,
                  }}
                >
                  Status
                </th>
                <th
                  style={{
                    padding: "12px 16px 12px 16px",
                    textAlign: "center",
                    fontWeight: 300,
                    color: COLORS.text,
                    minWidth: 100,
                  }}
                >
                  Attachment
                </th>
                <th
                  style={{
                    padding: "12px 16px 12px 16px",
                    textAlign: "center",
                    fontWeight: 300,
                    color: COLORS.text,
                    minWidth: 100,
                  }}
                >
                  Comment
                </th>
                <th
                  style={{
                    padding: "12px 16px 12px 16px",
                    textAlign: "center",
                    fontWeight: 300,
                    color: COLORS.text,
                    minWidth: 80,
                  }}
                >
                  Priority
                </th>
                <th
                  style={{
                    padding: "12px 16px 12px 16px",
                    textAlign: "center",
                    fontWeight: 300,
                    color: COLORS.text,
                    minWidth: 120,
                  }}
                >
                  Due Date
                </th>
                <th
                  style={{
                    padding: "12px 16px 12px 16px",
                    textAlign: "center",
                    fontWeight: 300,
                    color: COLORS.text,
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
                      padding: "40px 16px 40px 16px",
                      textAlign: "center",
                      color: "#ffffff",
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
                            padding: "12px 16px 12px 16px",
                            fontWeight: 300,
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
                              padding: "12px 16px 12px 16px",
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
                                        editValue,
                                      )
                                    : setEditingCell(null)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    if (editValue.trim()) {
                                      handleSaveField(
                                        task.id,
                                        "title",
                                        editValue,
                                      );
                                    }
                                  } else if (e.key === "Escape") {
                                    setEditingCell(null);
                                  }
                                }}
                                style={{
                                  width: "100%",
                                  padding: "6px 8px 6px 8px",
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
                              padding: "12px 16px 12px 16px",
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
                                      : null,
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
                                  padding: "6px 8px 6px 8px",
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
                              padding: "12px 16px 12px 16px",
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
                                    e.target.value,
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
                                  padding: "6px 8px 6px 8px",
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
                                  padding: "4px 10px 4px 10px",
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
                              padding: "12px 16px 12px 16px",
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
                              padding: "12px 16px 12px 16px",
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
                              padding: "12px 16px 12px 16px",
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
                                    e.target.value,
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
                                  padding: "6px 8px 6px 8px",
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
                              padding: "12px 16px 12px 16px",
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
                                  : "",
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
                                    editValue || null,
                                  )
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleSaveField(
                                      task.id,
                                      "dueDate",
                                      editValue || null,
                                    );
                                  }
                                }}
                                style={{
                                  padding: "6px 8px 6px 8px",
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
                                  },
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
                              padding: "12px 16px 12px 16px",
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
                                padding: "4px 4px 4px 4px",
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
                            padding: "12px 16px 12px 16px",
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
                              padding: "12px 16px 12px 16px",
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
                                        editValue,
                                      )
                                    : setEditingCell(null)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    if (editValue.trim()) {
                                      handleSaveField(
                                        task.id,
                                        "title",
                                        editValue,
                                      );
                                    }
                                  } else if (e.key === "Escape") {
                                    setEditingCell(null);
                                  }
                                }}
                                style={{
                                  width: "100%",
                                  padding: "6px 8px 6px 8px",
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
                              padding: "12px 16px 12px 16px",
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
                                      : null,
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
                                  padding: "6px 8px 6px 8px",
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
                              padding: "12px 16px 12px 16px",
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
                                    e.target.value,
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
                                  padding: "6px 8px 6px 8px",
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
                                  padding: "4px 10px 4px 10px",
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
                              padding: "12px 16px 12px 16px",
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
                              padding: "12px 16px 12px 16px",
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
                              padding: "12px 16px 12px 16px",
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
                                    e.target.value,
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
                                  padding: "6px 8px 6px 8px",
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
                              padding: "12px 16px 12px 16px",
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
                                  : "",
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
                                    editValue || null,
                                  )
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleSaveField(
                                      task.id,
                                      "dueDate",
                                      editValue || null,
                                    );
                                  }
                                }}
                                style={{
                                  padding: "6px 8px 6px 8px",
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
                                  },
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
                              padding: "12px 16px 12px 16px",
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
                                padding: "4px 4px 4px 4px",
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
        ) : (
          /* GRID VIEW */
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 16,
              padding: "16px 0",
            }}
          >
            {getFilteredAndSortedTasks().length === 0 ? (
              <div
                style={{
                  gridColumn: "1 / -1",
                  textAlign: "center",
                  padding: "60px 20px",
                  color: "#ffffff",
                }}
              >
                {tasks.length === 0 ? "No tasks yet" : "No matching tasks"}
              </div>
            ) : (
              getFilteredAndSortedTasks().map((task) => (
                <div
                  key={task.id}
                  onClick={() => {
                    setSelectedTaskId(task.id);
                    loadTaskDetails(task.id);
                  }}
                  style={{
                    background: "rgba(0,0,0,0.1)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    padding: "16px 16px 16px 16px",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "rgba(59, 130, 246, 0.15)";
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "rgba(59, 130, 246, 0.5)";
                    (e.currentTarget as HTMLElement).style.transform =
                      "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "rgba(0,0,0,0.1)";
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "rgba(255,255,255,0.1)";
                    (e.currentTarget as HTMLElement).style.transform =
                      "translateY(0)";
                  }}
                >
                  {/* Card Header - Title */}
                  <div>
                    <h3
                      style={{
                        margin: "0 0 4px 0",
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#ffffff",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {task.title}
                    </h3>
                    {task.description && (
                      <p
                        style={{
                          margin: 0,
                          fontSize: 12,
                          color: "rgba(255,255,255,0.7)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {task.description}
                      </p>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div
                    style={{
                      display: "inline-block",
                      padding: "4px 10px 4px 10px",
                      borderRadius: 4,
                      background: statusColors[task.status || "todo"],
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 600,
                      width: "fit-content",
                    }}
                  >
                    {statusLabels[task.status || "todo"]}
                  </div>

                  {/* Priority & Due Date */}
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingTop: 8,
                      borderTop: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    {task.priority && (
                      <span
                        style={{
                          fontSize: 11,
                          padding: "2px 6px 2px 6px",
                          borderRadius: 3,
                          background:
                            task.priority === "high"
                              ? "rgba(239, 68, 68, 0.2)"
                              : task.priority === "medium"
                                ? "rgba(245, 158, 11, 0.2)"
                                : "rgba(34, 197, 94, 0.2)",
                          color:
                            task.priority === "high"
                              ? "#ef4444"
                              : task.priority === "medium"
                                ? "#f59e0b"
                                : "#22c55e",
                          fontWeight: 600,
                          textTransform: "capitalize",
                        }}
                      >
                        {task.priority}
                      </span>
                    )}
                    {task.dueDate && (
                      <span
                        style={{
                          fontSize: 11,
                          color: "rgba(255,255,255,0.7)",
                          marginLeft: "auto",
                        }}
                      >
                        📅{" "}
                        {new Date(task.dueDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "2-digit",
                        })}
                      </span>
                    )}
                  </div>

                  {/* Assignee */}
                  {task.assignee && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "rgba(255,255,255,0.7)",
                        paddingTop: 4,
                      }}
                    >
                      👤 {task.assignee.name || task.assignee.email}
                    </div>
                  )}

                  {/* Stats Footer */}
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      paddingTop: 8,
                      borderTop: "1px solid rgba(255,255,255,0.1)",
                      fontSize: 11,
                      color: "rgba(255,255,255,0.6)",
                    }}
                  >
                    <span>💬 {task.comments?.length || 0}</span>
                    <span>📎 {task.attachments?.length || 0}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </PageContentCon>

      {/* Task Details Panel */}
      {selectedTaskId && taskDetails && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={() => setSelectedTaskId(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 600,
              maxHeight: "90vh",
              background: COLORS.cardBg,
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.1)",
              overflow: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
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
            <div style={{ padding: "16px 16px 16px 16px" }}>
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
                {taskDetails.createdById === currentUser?.id ? (
                  <input
                    type="text"
                    value={
                      editingCell?.field === "title"
                        ? editValue
                        : taskDetails.title
                    }
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => {
                      if (editingCell?.field === "title" && editValue.trim()) {
                        handleSaveField(taskDetails.id, "title", editValue);
                      }
                      setEditingCell(null);
                    }}
                    onFocus={() => {
                      setEditingCell({
                        taskId: taskDetails.id,
                        field: "title",
                      });
                      setEditValue(taskDetails.title);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && editValue.trim()) {
                        handleSaveField(taskDetails.id, "title", editValue);
                        setEditingCell(null);
                      } else if (e.key === "Escape") {
                        setEditingCell(null);
                      }
                    }}
                    style={{
                      width: "100%",
                      color: COLORS.text,
                      fontSize: 14,
                      fontWeight: 500,
                      padding: "8px 8px 8px 8px",
                      borderRadius: 4,
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                      background: "rgba(0,0,0,0.1)",
                      boxSizing: "border-box",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      color: COLORS.text,
                      fontSize: 14,
                      fontWeight: 500,
                    }}
                  >
                    {taskDetails.title}
                  </div>
                )}
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
                  {taskDetails.createdById === currentUser?.id ? (
                    <textarea
                      value={
                        editingCell?.field === "description"
                          ? editValue
                          : taskDetails.description
                      }
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => {
                        if (
                          editingCell?.field === "description" &&
                          editValue.trim()
                        ) {
                          handleSaveField(
                            taskDetails.id,
                            "description",
                            editValue,
                          );
                        }
                        setEditingCell(null);
                      }}
                      onFocus={() => {
                        setEditingCell({
                          taskId: taskDetails.id,
                          field: "description",
                        });
                        setEditValue(taskDetails.description || "");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setEditingCell(null);
                        }
                      }}
                      style={{
                        width: "100%",
                        minHeight: 80,
                        color: COLORS.text,
                        fontSize: 13,
                        padding: "8px 8px 8px 8px",
                        borderRadius: 4,
                        border: "1px solid rgba(59, 130, 246, 0.3)",
                        background: "rgba(0,0,0,0.1)",
                        boxSizing: "border-box",
                        fontFamily: "inherit",
                      }}
                    />
                  ) : (
                    <div style={{ color: COLORS.text, fontSize: 13 }}>
                      {taskDetails.description}
                    </div>
                  )}
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
                {taskDetails.createdById === currentUser?.id ? (
                  <select
                    value={
                      editingCell?.field === "status"
                        ? editValue
                        : taskDetails.status || "todo"
                    }
                    onChange={(e) => {
                      setEditValue(e.target.value);
                      handleSaveField(taskDetails.id, "status", e.target.value);
                    }}
                    style={{
                      padding: "8px 8px 8px 8px",
                      borderRadius: 4,
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                      background: "rgba(0,0,0,0.1)",
                      color: COLORS.text,
                      fontSize: 13,
                      cursor: "pointer",
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
                      padding: "4px 10px 4px 10px",
                      borderRadius: 4,
                      background: statusColors[taskDetails.status || "todo"],
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {statusLabels[taskDetails.status || "todo"]}
                  </div>
                )}
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
                  {taskDetails.createdById === currentUser?.id ? (
                    <select
                      value={
                        editingCell?.field === "priority"
                          ? editValue
                          : taskDetails.priority || "medium"
                      }
                      onChange={(e) => {
                        setEditValue(e.target.value);
                        handleSaveField(
                          taskDetails.id,
                          "priority",
                          e.target.value,
                        );
                      }}
                      style={{
                        padding: "8px 8px 8px 8px",
                        borderRadius: 4,
                        border: "1px solid rgba(59, 130, 246, 0.3)",
                        background: "rgba(0,0,0,0.1)",
                        color: COLORS.text,
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  ) : (
                    <div
                      style={{
                        color: COLORS.text,
                        fontSize: 13,
                        textTransform: "capitalize",
                      }}
                    >
                      {taskDetails.priority}
                    </div>
                  )}
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
                  {taskDetails.createdById === currentUser?.id ? (
                    <DatePickerInput
                      value={
                        editingCell?.field === "dueDate"
                          ? editValue
                          : taskDetails.dueDate || ""
                      }
                      onChange={(value) => {
                        setEditValue(value);
                        handleSaveField(
                          taskDetails.id,
                          "dueDate",
                          value || null,
                        );
                      }}
                    />
                  ) : (
                    <div style={{ color: COLORS.text, fontSize: 13 }}>
                      {new Date(taskDetails.dueDate).toLocaleDateString(
                        "en-US",
                        {
                          weekday: "short",
                          month: "short",
                          day: "2-digit",
                          year: "numeric",
                        },
                      )}
                    </div>
                  )}
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
                  {taskDetails.createdById === currentUser?.id ? (
                    <select
                      value={
                        editingCell?.field === "assigneeId"
                          ? editValue
                          : taskDetails.assignee?.id || ""
                      }
                      onChange={(e) => {
                        setEditValue(e.target.value);
                        handleSaveField(
                          taskDetails.id,
                          "assigneeId",
                          e.target.value ? Number(e.target.value) : null,
                        );
                      }}
                      style={{
                        width: "100%",
                        padding: "8px 8px 8px 8px",
                        borderRadius: 4,
                        border: "1px solid rgba(59, 130, 246, 0.3)",
                        background: "rgba(0,0,0,0.1)",
                        color: COLORS.text,
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      <option value="">Unassigned</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name || u.email}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ color: COLORS.text, fontSize: 13 }}>
                      {taskDetails.assignee.name || taskDetails.assignee.email}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Attachments Section */}
            <div
              style={{
                borderTop: "1px solid rgba(0,0,0,0.1)",
                padding: "16px 16px 16px 16px",
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
                    padding: "6px 8px 6px 8px",
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
                        padding: "10px 10px 10px 10px",
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
                              attachment.createdAt,
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
                padding: "16px 16px 16px 16px",
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
                    padding: "8px 12px 8px 12px",
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
                        padding: "10px 10px 10px 10px",
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
                                  editingCommentValue,
                                );
                              } else if (e.key === "Escape") {
                                setEditingCommentId(null);
                              }
                            }}
                            style={{
                              flex: 1,
                              padding: "6px 8px 6px 8px",
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
                                editingCommentValue,
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
                                padding: "0px 0px 0px 0px",
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
                                padding: "0px 0px 0px 0px",
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
    </PageContainer>
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

    // Validation - all required except description
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
          padding: "24px 24px 24px 24px",
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
              padding: "0px 0px 0px 0px",
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
                padding: "10px 10px 10px 10px",
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
                padding: "10px 10px 10px 10px",
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
                  padding: "10px 10px 10px 10px",
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
                  padding: "10px 10px 10px 10px",
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
                padding: "10px 10px 10px 10px",
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
                padding: "10px 10px 10px 10px",
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
                padding: "12px 12px 12px 12px",
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
                padding: "10px 16px 10px 16px",
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
                padding: "10px 16px 10px 16px",
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
