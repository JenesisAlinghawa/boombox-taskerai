import { useEffect, useState } from "react";
import type { Attachment, Comment, Task, User } from "@/app/components/tasks/types";
import { useToast } from "@/app/components/ToastProvider";
import { useConfirm } from "@/app/components/ConfirmProvider";

export function useTasks(currentUser: User | null) {
  const toast = useToast();
  // Hook-based confirm; ensure `ConfirmProvider` wraps the page
  const confirm = useConfirm();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
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

  useEffect(() => {
    if (!currentUser) return;
    fetch("/api/tasks", {
      headers: { "x-user-id": String(currentUser.id) },
    })
      .then((r) => r.json())
      .then((d) => setTasks(Array.isArray(d?.tasks) ? d.tasks : []))
      .catch(console.error);

    fetch("/api/users/assignable", {
      headers: { "x-user-id": String(currentUser.id) },
    })
      .then((r) => r.json())
      .then((d) => setUsers(d?.users || []))
      .catch(console.error);
  }, [currentUser]);

  const getHeaders = (additional?: Record<string, string>) => ({
    "Content-Type": "application/json",
    ...(currentUser && { "x-user-id": String(currentUser.id) }),
    ...(additional || {}),
  });

  const handleCreateTask = async (createdTask: any) => {
    setTasks((prev) => [createdTask, ...prev]);
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

      // On non-OK parse server error body for better feedback
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const msg = errBody?.error || `Failed to update (status ${res.status})`;
        throw new Error(msg);
      }

      const data = await res.json();

      // Update local list optimistically
      setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)));

      // If details panel is open for this task, refresh it from server to ensure consistency
      if (selectedTaskId === taskId) {
        try {
          const detailsRes = await fetch(`/api/tasks/${taskId}`, { headers: getHeaders() });
          if (detailsRes.ok) {
            const detailsData = await detailsRes.json();
            setTaskDetails(detailsData.task);
            setComments(detailsData.task.comments || []);
            setAttachments(detailsData.task.attachments || []);
          } else {
            // fallback: use returned data
            setTaskDetails(data.task);
          }
        } catch (e) {
          // ignore details fetch failure and use returned data
          setTaskDetails(data.task);
        }
      }

      // Refresh entire tasks list to ensure server-side derived values (counts, etc.) are up to date
      try {
        const listRes = await fetch('/api/tasks', { headers: getHeaders() });
        if (listRes.ok) {
          const listData = await listRes.json();
          if (Array.isArray(listData?.tasks)) {
            setTasks(listData.tasks);
          }
        }
      } catch (e) {
        // ignore list refresh failure
      }

      toast.success("Task updated");
    } catch (err) {
      console.error("Error updating task:", err);
      toast.error(err instanceof Error ? err.message : "Failed to update task");
    }
  };

  const handleDeleteTask = async (id: number) => {
    const confirmed = await confirm({ message: "Delete this task?" });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error: ${res.status}`);
      }
      setTasks((prev) => prev.filter((t) => t.id !== id));
      if (selectedTaskId === id) {
        setSelectedTaskId(null);
        setTaskDetails(null);
      }
      toast.success("Task deleted");
    } catch (err) {
      console.error("Error deleting task:", err);
      toast.error(
        "Failed to delete task: " + (err instanceof Error ? err.message : "Unknown error"),
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
        throw new Error(error.error || `Failed to load task details (${res.status})`);
      }
      const data = await res.json();
      setTaskDetails(data.task);
      setComments(data.task.comments || []);
      setAttachments(data.task.attachments || []);
    } catch (err) {
      console.error("Error loading task details:", err);
      toast.error(`Error: ${err instanceof Error ? err.message : "Failed to load task details"}`);
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
      toast.success("Comment added");
    } catch (err) {
      console.error("Error adding comment:", err);
      toast.error("Failed to add comment");
    }
  };

  const handleDeleteComment = async (commentId: number, taskId: number) => {
    const confirmed = await confirm({ message: "Delete this comment?" });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments/${commentId}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete comment");
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      toast.success("Comment deleted");
    } catch (err) {
      console.error("Error deleting comment:", err);
      toast.error("Failed to delete comment");
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
      setComments((prev) => prev.map((c) => (c.id === commentId ? data.comment : c)));
      setEditingCommentId(null);
    } catch (err) {
      console.error("Error updating comment:", err);
      toast.error("Failed to update comment");
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
      toast.success("Attachment uploaded");
    } catch (err) {
      console.error("Error uploading attachment:", err);
      toast.error("Failed to upload attachment");
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleDeleteAttachment = async (
    attachmentId: number,
    taskId: number,
  ) => {
    const confirmed = await confirm({ message: "Delete this attachment?" });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}/attachments/${attachmentId}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete attachment");
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      toast.success("Attachment deleted");
    } catch (err) {
      console.error("Error deleting attachment:", err);
      toast.error("Failed to delete attachment");
    }
  };

  const getFilteredAndSortedTasks = () => {
    const filtered = tasks
      .filter(
        (task) =>
          task.status !== "completed" && task.status !== "done"
      )
      .filter((task) => {
        const query = searchQuery.toLowerCase();
        const title = task.title.toLowerCase();
        const assignee = task.assignee?.name?.toLowerCase() || task.assignee?.email?.toLowerCase() || "";
        const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "";
        return title.includes(query) || assignee.includes(query) || dueDate.includes(query);
      });

    const sorted = filtered.sort((a, b) => {
      const order = sortOrder === "asc" ? 1 : -1;
      if (sortBy === "task") return a.title.localeCompare(b.title) * order;
      if (sortBy === "dueDate") return (new Date(a.dueDate || "").getTime() - new Date(b.dueDate || "").getTime()) * order;
      return 0;
    });

    return sorted;
  };

  return {
    tasks,
    setTasks,
    users,
    selectedTaskId,
    setSelectedTaskId,
    taskDetails,
    setTaskDetails,
    comments,
    setComments,
    newComment,
    setNewComment,
    editingCommentId,
    setEditingCommentId,
    editingCommentValue,
    setEditingCommentValue,
    attachments,
    setAttachments,
    attachmentFile,
    setAttachmentFile,
    uploadingAttachment,
    setUploadingAttachment,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    viewMode,
    setViewMode,
    handleCreateTask,
    handleSaveField,
    handleDeleteTask,
    loadTaskDetails,
    handleAddComment,
    handleDeleteComment,
    handleEditComment,
    handleAddAttachment,
    handleDeleteAttachment,
    getFilteredAndSortedTasks,
  };
}
