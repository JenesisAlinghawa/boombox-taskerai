"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getCurrentUser } from "@/utils/sessionManager";
import { useAuthProtection } from "@/app/hooks/useAuthProtection";
import { PageContainer } from "@/app/components/page-layouts/MainPageContainerLayoutComponent";
import { PageContentCon } from "@/app/components/page-layouts/PageContentWrapperContainerComponent";
import { DatePickerInput } from "@/app/components/tasks/TaskDueDatePickerInputComponent";
import TaskDetailsPanel from "@/app/components/tasks/TaskDetailsDisplayPanelComponent";
import TaskRow from "@/app/components/tasks/TaskListItemRowComponent";
import TaskPriorityPanel from "@/app/components/tasks/TaskPrioritySelectionPanelComponent";
import CreateTaskModal from "@/app/components/tasks/CreateTaskModal";
import { Plus, X, TrendingUp } from "lucide-react";
import { useTasks } from "@/hooks/useTasks";
import {
  ToastProvider,
  useToast,
} from "@/app/components/providers-popups/ToastNotificationProviderComponent";
import { ConfirmProvider } from "@/app/components/providers-popups/ConfirmationDialogProviderComponent";
import type {
  Task,
  Comment,
  Attachment,
  Employee,
} from "@/app/components/tasks/types";

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
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPriorityPanel, setShowPriorityPanel] = useState(false);

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
  } = useTasks(currentEmployee);

  // react to focus query param when page loads
  const searchParams = useSearchParams();
  useEffect(() => {
    if (!currentEmployee) return; // Wait for user to be loaded
    const focus = searchParams.get("focus");
    if (focus) {
      const id = focus; // focus is already a string from URL
      if (id) {
        setSelectedTaskId(id);
        loadTaskDetails(id);
      }
    }
  }, [searchParams, currentEmployee]);

  const toast = useToast();

  const handleView = (taskId: string) => {
    setSelectedTaskId(taskId);
    loadTaskDetails(taskId);
  };

  const handleEdit = (taskId: string) => {
    setSelectedTaskId(taskId);
    loadTaskDetails(taskId);
  };

  const handleContain = (taskId: string) => {
    const url = `${window.location.origin}/tasks/${taskId}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    if (!currentEmployee) {
      toast.error("You must be logged in to update task status");
      return;
    }

    // Show completion confirmation for completed status
    if (
      (newStatus === "completed" || newStatus === "done") &&
      taskDetails &&
      taskDetails.status !== "completed" &&
      taskDetails.status !== "done"
    ) {
      setCompletionConfirmTaskId(taskId);
      return;
    }

    // Update status directly for non-completion status changes
    try {
      const res = await fetch(`/api/task-management/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(currentEmployee.id),
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)));
        if (selectedTaskId === taskId) {
          loadTaskDetails(taskId);
        }
        toast.success("Task status updated");
      } else {
        const errorData = await res
          .json()
          .catch(() => ({ error: "Unknown error" }));
        console.error("Status update failed:", errorData);
        toast.error(errorData.error || "Failed to update task status");
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update task status");
    }
  };

  const [completionConfirmTaskId, setCompletionConfirmTaskId] = useState<
    string | null
  >(null);

  // Load current user from session manager
  useEffect(() => {
    const loadUser = async () => {
      const user = await getCurrentUser();
      if (user) {
        setCurrentEmployee(user as Employee);
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
  const [taskFilter, setTaskFilter] = useState<"all" | "mine">("all");

  const groupedTasks = () => {
    const filtered = getFilteredAndSortedTasks();

    if (taskFilter === "mine") {
      // only show tasks assigned to the user
      const myTasks = filtered.filter(
        (task) => task.assignee?.id === currentEmployee?.id,
      );
      return { allTasks: myTasks, assignedTasks: [] };
    }

    // For "all", show all tasks created by anyone
    return { allTasks: filtered, assignedTasks: [] };
  };

  // compute counts independent of the filter so header buttons show correct numbers
  const filteredAll = getFilteredAndSortedTasks();
  const ownCount = filteredAll.filter(
    (task) => task.assignee?.id === currentEmployee?.id,
  ).length;

  return (
    <PageContainer title="TASKS">
      {/* Toolbar */}
      <div className="flex items-center justify-between mt-5 mb-5">
        <div className="ml-6 text-sm text-black/80 font-medium">
          {currentEmployee
            ? `Welcome back, ${currentEmployee.name || currentEmployee.email}! Here's your task list.`
            : "Your Tasks"}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-blue-100/30 backdrop-blur-md border border-black/10 text-black/80 placeholder-black/40 px-3 py-2 rounded-sm text-sm w-72"
          />
          <div className="flex items-center gap-2">
            <label className="text-sm text-black/60">Sort by</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-blue-100/30 backdrop-blur-md border border-black/10 text-black/80 px-3 py-2 rounded-sm text-sm"
            >
              <option value="task">Task</option>
              <option value="assignee">Assignee</option>
              <option value="status">Status</option>
              <option value="priority">Priority</option>
              <option value="duedate">Due Date</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="bg-blue-100/30 backdrop-blur-md border border-black/10 text-black/80 px-3 py-2 rounded-sm text-xs hover:bg-blue-100/50 transition-colors"
              title="Toggle sort direction"
            >
              {sortOrder === "asc" ? "Asc" : "Desc"}
            </button>
          </div>
          <button
            onClick={() => setShowPriorityPanel(true)}
            className="flex items-center gap-1 px-4 py-2 rounded-sm bg-purple-600/50 text-white text-xs font-semibold hover:bg-purple-600/70 transition-colors border border-purple-400/30"
          >
            <TrendingUp size={16} />
            <span>Optimize</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1 px-4 py-2 rounded-sm bg-blue-600 text-white text-xs hover:bg-blue-700 transition-colors border border-blue-400/30"
          >
            <Plus size={16} />
            <span>New task</span>
          </button>
        </div>
      </div>

      {/* Tasks View */}
      <PageContentCon className="h-[calc(100vh-120px)] overflow-y-auto">
        {/* Filter Tabs */}
        <div className="sticky top-0 z-10 bg-transparent p-0 mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTaskFilter("all")}
              className={`px-6 py-2 rounded-sm text-xs font-medium cursor-pointer transition-all duration-200 ${
                taskFilter === "all"
                  ? "bg-blue-100 backdrop-blur-md border border-black/20 text-black/80"
                  : "bg-blue-100/30 backdrop-blur-md border border-black/10 text-black/60 hover:bg-blue-100/50 hover:border-black/20"
              }`}
            >
              Team's Tasks
            </button>
            <button
              onClick={() => setTaskFilter("mine")}
              className={`px-6 py-2 rounded-sm text-xs font-medium cursor-pointer transition-all duration-200 ${
                taskFilter === "mine"
                  ? "bg-blue-100 backdrop-blur-md border border-black/20 text-black/80"
                  : "bg-blue-100/30 backdrop-blur-md border border-black/10 text-black/60 hover:bg-blue-100/50 hover:border-black/20"
              }`}
            >
              Your Tasks ({ownCount})
            </button>
          </div>
        </div>
        <div className="bg-blue-100 backdrop-blur-md rounded-sm border border-black/10 overflow-hidden transition-all duration-200 hover:border-black/50">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-blue-200/50 sticky top-0">
              <tr className="border-b border-black/10">
                <th className="px-4 py-3 text-left font-semibold text-black/80">
                  Task
                </th>
                <th className="px-4 py-3 text-left font-semibold text-black/80 min-w-[150px]">
                  Assignee
                </th>
                <th className="px-4 py-3 text-center font-semibold text-black/80 min-w-[80px]">
                  Status
                </th>
                <th className="px-4 py-3 text-center font-semibold text-black/80 min-w-[100px]">
                  Attachment
                </th>
                <th className="px-4 py-3 text-center font-semibold text-black/80 min-w-[100px]">
                  Comment
                </th>
                <th className="px-4 py-3 text-center font-semibold text-black/80 min-w-[80px]">
                  Priority
                </th>
                <th className="px-4 py-3 text-center font-semibold text-black/80 min-w-[120px]">
                  Due Date
                </th>
                <th className="px-4 py-3 text-center font-semibold text-black/80 min-w-[80px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {getFilteredAndSortedTasks().length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-black">
                    {tasks.length === 0 ? "No tasks yet" : "No matching tasks"}
                  </td>
                </tr>
              ) : (
                <>
                  {/* All tasks when not filtered */}
                  {taskFilter === "all" &&
                    groupedTasks().allTasks.length > 0 && (
                      <>
                        {groupedTasks().allTasks.map((task: Task) => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            currentUserId={currentEmployee?.id}
                            onEdit={handleEdit}
                            onContain={handleContain}
                            onOpenDetails={handleView}
                            onDelete={handleDeleteTask}
                            onStatusChange={handleStatusChange}
                          />
                        ))}
                      </>
                    )}

                  {/* My assigned tasks when filtered */}
                  {taskFilter === "mine" &&
                    groupedTasks().allTasks.length > 0 && (
                      <>
                        {groupedTasks().allTasks.map((task: Task) => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            currentUserId={currentEmployee?.id}
                            onEdit={handleEdit}
                            onContain={handleContain}
                            onOpenDetails={handleView}
                            onDelete={handleDeleteTask}
                            onStatusChange={handleStatusChange}
                          />
                        ))}
                      </>
                    )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </PageContentCon>

      {/* Task Details Panel */}
      {selectedTaskId && taskDetails && (
        <TaskDetailsPanel
          taskDetails={taskDetails}
          currentEmployee={currentEmployee}
          users={users}
          onClose={() => setSelectedTaskId(null)}
          comments={comments}
          newComment={newComment}
          setNewComment={setNewComment}
          handleAddComment={handleAddComment}
          handleDeleteComment={handleDeleteComment}
          attachments={attachments}
        />
      )}

      {/* Completion Confirmation Modal */}
      {completionConfirmTaskId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center rounded-sm z-50">
          <div className="bg-blue-100/95 backdrop-blur-lg border border-black/20 rounded-sm p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-black/80 mb-2">
              Task Completion
            </h3>
            <p className="text-sm text-black/60 mb-4">
              Are you sure you're done with this task? Once marked as completed,
              the task will be moved to your Analytics page's Completed Tasks
              section. You can undo this action there if needed.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setCompletionConfirmTaskId(null)}
                className="px-4 py-2 rounded-sm bg-blue-100/50 border border-black/10 text-black/80 hover:bg-blue-100/70 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(
                      `/api/task-management/${completionConfirmTaskId}`,
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
                className="px-4 py-2 rounded-sm bg-green-600 text-white hover:bg-green-700 transition-colors font-medium"
              >
                Mark as Completed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Priority Panel */}
      <TaskPriorityPanel
        tasks={tasks}
        isOpen={showPriorityPanel}
        onClose={() => setShowPriorityPanel(false)}
      />

      {/* Create Task Modal */}
      {showCreateModal && (
        <CreateTaskModal
          users={users}
          currentEmployee={currentEmployee}
          onClose={() => setShowCreateModal(false)}
          onCreate={onCreate}
        />
      )}
    </PageContainer>
  );
}
