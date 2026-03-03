"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getCurrentUser } from "@/utils/sessionManager";
import { useAuthProtection } from "@/app/hooks/useAuthProtection";
import { PageContainer } from "@/app/components/PageContainer";
import { PageContentCon } from "@/app/components/PageContentCon";
import { DatePickerInput } from "@/app/components/DatePickerInput";
import TaskDetailsPanel from "@/app/components/tasks/TaskDetailsPanel";
import TaskRow from "@/app/components/tasks/TaskRow";
import { Plus, X, Paperclip, AlertTriangle } from "lucide-react";
import { useTasks } from "@/hooks/useTasks";
import { ToastProvider, useToast } from "@/app/components/ToastProvider";
import { ConfirmProvider } from "@/app/components/ConfirmProvider";

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
  return (
    <ToastProvider>
      <ConfirmProvider>
        <TasksPageContent />
      </ConfirmProvider>
    </ToastProvider>
  );
}

function TasksPageContent() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const {
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
  } = useTasks(currentUser);

  // react to focus query param when page loads
  const searchParams = useSearchParams();
  useEffect(() => {
    const focus = searchParams.get("focus");
    if (focus) {
      const id = parseInt(focus, 10);
      if (!isNaN(id)) {
        setSelectedTaskId(id);
        loadTaskDetails(id);
      }
    }
  }, [searchParams]);

  const toast = useToast();

  const handleView = (taskId: number) => {
    setSelectedTaskId(taskId);
    loadTaskDetails(taskId);
    setIsEditingTask(false);
  };

  const handleEdit = (taskId: number) => {
    setSelectedTaskId(taskId);
    loadTaskDetails(taskId);
    setIsEditingTask(true);
  };

  const handleContain = (taskId: number) => {
    const url = `${window.location.origin}/tasks/${taskId}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  const handleStatusChange = (taskId: number, newStatus: string) => {
    // make sure we have details before accessing status
    if (
      (newStatus === "completed" || newStatus === "done") &&
      taskDetails &&
      taskDetails.status !== "completed" &&
      taskDetails.status !== "done"
    ) {
      setCompletionConfirmTaskId(taskId);
    }
  };

  const [isEditingTask, setIsEditingTask] = useState(false);
  const [completionConfirmTaskId, setCompletionConfirmTaskId] = useState<
    number | null
  >(null);

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

  // Wrapper for create modal - keep modal open logic at page level
  const onCreate = (createdTask: any) => {
    handleCreateTask(createdTask);
    setShowCreateModal(false);

    // automatically open the newly created task for the owner
    if (createdTask?.id) {
      setSelectedTaskId(createdTask.id);
      loadTaskDetails(createdTask.id);
    }

    toast.success("Task created");
  };

  // Client-side filtering/sorting is provided by the hook via getFilteredAndSortedTasks()

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
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5">
        <div className="text-sm text-white/62">
          {currentUser
            ? `Welcome back, ${currentUser.name || currentUser.email}! Here's your task list.`
            : "Your Tasks"}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white/10 border border-white/20 text-white/62 placeholder-white/40 p-2 rounded-md text-xs w-72"
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-white/40">Sort by</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white/5 text-white/62 p-2 rounded-md text-xs"
            >
              <option value="task">Task</option>
              <option value="assignee">Assignee</option>
              <option value="status">Status</option>
              <option value="priority">Priority</option>
              <option value="duedate">Due Date</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="bg-white/5 text-white/62 p-2 rounded-md text-xs"
              title="Toggle sort direction"
            >
              {sortOrder === "asc" ? "Asc" : "Desc"}
            </button>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <Plus className="mr-1" size={16} />
            New task
          </button>
        </div>
      </div>

      {/* Tasks View - List or Grid */}
      <PageContentCon className="h-[calc(100vh-180px)] overflow-y-auto">
        {/* LIST VIEW */}
        <table className="w-full border-collapse text-sm">
          <thead className="bg-blue-500/40 sticky top-0">
            <tr className="border-b border-black/10">
              <th className="px-4 py-3 text-left font-light text-white">
                Task
              </th>
              <th className="px-4 py-3 text-left font-light text-white min-w-[150px]">
                Assignee
              </th>
              <th className="px-4 py-3 text-center font-light text-white min-w-[80px]">
                Status
              </th>
              <th className="px-4 py-3 text-center font-light text-white min-w-[100px]">
                Attachment
              </th>
              <th className="px-4 py-3 text-center font-light text-white min-w-[100px]">
                Comment
              </th>
              <th className="px-4 py-3 text-center font-light text-white min-w-[80px]">
                Priority
              </th>
              <th className="px-4 py-3 text-center font-light text-white min-w-[120px]">
                Due Date
              </th>
              <th className="px-4 py-3 text-center font-light text-white min-w-[80px]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {getFilteredAndSortedTasks().length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-blue-200">
                  {tasks.length === 0 ? "No tasks yet" : "No matching tasks"}
                </td>
              </tr>
            ) : (
              <>
                {/* Self-created tasks section */}
                {groupedTasks().selfTasks.length > 0 && (
                  <>
                    <tr className="bg-blue-500/20 border-b border-black/10">
                      <td
                        colSpan={8}
                        className="px-4 py-3 font-light text-white text-xs"
                      >
                        My Tasks ({groupedTasks().selfTasks.length})
                      </td>
                    </tr>
                    {groupedTasks().selfTasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        currentUserId={currentUser?.id}
                        onEdit={handleEdit}
                        onContain={handleContain}
                        onOpenDetails={handleView}
                        onDelete={handleDeleteTask}
                      />
                    ))}
                  </>
                )}

                {/* Assigned tasks section */}
                {groupedTasks().assignedTasks.length > 0 && (
                  <>
                    <tr className="bg-blue-500/10 border-b-2 border-blue-400/20">
                      <td
                        colSpan={8}
                        className="px-4 py-3 font-semibold text-blue-400 text-xs"
                      >
                        Assigned to Me ({groupedTasks().assignedTasks.length})
                      </td>
                    </tr>
                    {groupedTasks().assignedTasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        currentUserId={currentUser?.id}
                        onEdit={handleEdit}
                        onContain={handleContain}
                        onOpenDetails={handleView}
                        onDelete={handleDeleteTask}
                      />
                    ))}
                  </>
                )}
              </>
            )}
          </tbody>
        </table>
      </PageContentCon>

      {/* Task Details Panel */}
      {selectedTaskId && taskDetails && (
        <TaskDetailsPanel
          taskDetails={taskDetails}
          isEditingTask={isEditingTask}
          setIsEditingTask={setIsEditingTask}
          currentUser={currentUser}
          users={users}
          onClose={() => setSelectedTaskId(null)}
          onSaveField={handleSaveField}
          loadTaskDetails={loadTaskDetails}
          onStatusChange={handleStatusChange}
          comments={comments}
          newComment={newComment}
          setNewComment={setNewComment}
          handleAddComment={handleAddComment}
          handleDeleteComment={handleDeleteComment}
          attachments={attachments}
          handleAddAttachment={handleAddAttachment}
          handleDeleteAttachment={handleDeleteAttachment}
          uploadingAttachment={uploadingAttachment}
          setAttachmentFile={setAttachmentFile}
          attachmentFile={attachmentFile}
        />
      )}

      {/* Completion Confirmation Modal */}
      {completionConfirmTaskId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center rounded-md z-50">
          <div className="bg-gray-900 border border-white/20 rounded-md p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-white mb-2">
              Task Completion
            </h3>
            <p className="text-sm text-white/60 mb-4">
              Are you sure you're done with this task? Once marked as completed,
              the task will be moved to your Analytics page's Completed Tasks
              section. You can undo this action there if needed.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setCompletionConfirmTaskId(null)}
                className="px-4 py-2 rounded-md bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(
                      `/api/tasks/${completionConfirmTaskId}`,
                      {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: "completed" }),
                      },
                    );
                    if (res.ok) {
                      setCompletionConfirmTaskId(null);
                      loadTaskDetails(completionConfirmTaskId);
                      toast.success(
                        "Task marked as completed! Check Analytics > Completed Tasks.",
                      );
                    }
                  } catch (error) {
                    console.error("Failed to complete task:", error);
                    toast.error("Failed to complete task");
                  }
                }}
                className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors"
              >
                Mark as Completed
              </button>
            </div>
          </div>
        </div>
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
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-[90%] max-w-lg bg-transparent p-6 rounded-lg shadow-xl border border-black/10"
      >
        <PageContentCon className="flex justify-between items-center mb-5 pb-4 border-b border-black/10">
          <h2 className="m-0 text-white text-lg font-semibold">
            Create New Task
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white hover:text-gray-300"
          >
            <X size={20} />
          </button>
        </PageContentCon>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs text-white mb-1 font-medium">
              Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded border border-black/10 bg-black/20 text-white text-sm placeholder-gray-400"
              placeholder="Task title"
            />
          </div>

          <div>
            <label className="block text-xs text-white mb-1 font-medium">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full min-h-[80px] px-3 py-2 rounded border border-black/10 bg-black/20 text-white text-sm placeholder-gray-400 font-sans"
              placeholder="Task description..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white mb-1 font-medium">
                Assignee *
              </label>
              <select
                required
                value={assigneeId || ""}
                onChange={(e) =>
                  setAssigneeId(e.target.value ? Number(e.target.value) : null)
                }
                className="w-full px-3 py-2 rounded border border-black/10 bg-black/20 text-white text-sm"
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
              <label className="block text-xs text-white mb-1 font-medium">
                Priority *
              </label>
              <select
                required
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 rounded border border-black/10 bg-black/20 text-white text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-white mb-1 font-medium">
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
            <label className="block text-xs text-white mb-1 font-medium">
              Add Initial Comment
            </label>
            <textarea
              value={initialComment}
              onChange={(e) => setInitialComment(e.target.value)}
              className="w-full min-h-[60px] px-3 py-2 rounded border border-black/10 bg-black/20 text-white text-sm placeholder-gray-400 font-sans"
              placeholder="Add a comment to this task (optional)..."
            />
          </div>

          <div>
            <label className="block text-xs text-white mb-1 font-medium">
              Add Attachment
            </label>
            <input
              type="file"
              onChange={(e) =>
                setInitialAttachmentFile(e.target.files?.[0] || null)
              }
              className="w-full px-3 py-2 rounded border border-black/10 bg-black/20 text-white text-sm"
            />
            {initialAttachmentFile && (
              <div className="mt-1 flex items-center text-xs text-green-400">
                <Paperclip size={14} className="mr-1" />{" "}
                {initialAttachmentFile.name}
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 rounded bg-red-500/10 text-red-600 text-sm border border-red-400/30 flex items-center">
              <AlertTriangle size={16} className="mr-1" /> {error}
            </div>
          )}

          <div className="flex gap-3 justify-end mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded border border-black/10 text-white text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 rounded text-sm font-semibold text-white ${
                loading ? "bg-blue-500/50 cursor-not-allowed" : "bg-blue-500"
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
