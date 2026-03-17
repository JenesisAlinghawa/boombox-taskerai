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
import {
  ConfirmProvider,
  useConfirm,
} from "@/app/components/providers-popups/ConfirmationDialogProviderComponent";
import TaskGroupedDisplay from "@/app/components/tasks/TaskGroupedDisplayComponent";
import TaskSummary from "@/app/components/dashboard/DoThisFirst";
import type {
  Task,
  Comment,
  Attachment,
  User,
} from "@/app/components/tasks/types";

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
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
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
    handleReply,
    handleAddAttachment,
    handleDeleteAttachment,
    getFilteredAndSortedTasks,
    taskLoadError,
    usersLoadError,
  } = useTasks(currentUser);

  // react to focus query param when page loads
  const searchParams = useSearchParams();
  useEffect(() => {
    if (!currentUser) return; // Wait for user to be loaded
    const focus = searchParams.get("focus");
    if (focus) {
      const id = focus; // focus is already a string from URL
      if (id) {
        setSelectedTaskId(id);
        loadTaskDetails(id);
      }
    }
  }, [searchParams, currentUser]);

  // Listen for task deletion events from TaskerBot or other sources
  useEffect(() => {
    const handleTaskDeleted = (event: Event) => {
      const customEvent = event as CustomEvent;
      const deletedTaskId = customEvent.detail?.taskId;

      if (!deletedTaskId) return;

      // Remove the deleted task from the tasks list
      setTasks((prev) => prev.filter((t) => t.id !== deletedTaskId));

      // Clear task details if viewing the deleted task
      if (selectedTaskId === deletedTaskId) {
        setSelectedTaskId(null);
        setTaskDetails(null);
      }
    };

    window.addEventListener("taskDeleted", handleTaskDeleted);
    return () => window.removeEventListener("taskDeleted", handleTaskDeleted);
  }, [setTasks, setSelectedTaskId, setTaskDetails, selectedTaskId]);

  const toast = useToast();
  const confirm = useConfirm();

  const handleView = (taskId: string) => {
    setSelectedTaskId(taskId);
    loadTaskDetails(taskId);
  };

  const handleEdit = async (taskId: string) => {
    // If user is task creator, admin/owner, ask for confirmation
    const isTaskCreator =
      taskDetails && currentUser && currentUser.id === taskDetails.createdById;
    const isAdminOrOwner =
      currentUser &&
      (currentUser.role === "ADMIN" || currentUser.role === "OWNER");

    if (isTaskCreator || isAdminOrOwner) {
      const confirmed = await confirm({
        message: "Confirm editing this task?",
      });
      if (!confirmed) return;
    }

    setEditingTaskId(taskId);
    loadTaskDetails(taskId);
    setShowEditModal(true);
  };

  const handleContain = (taskId: string) => {
    const url = `${window.location.origin}/tasks/${taskId}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  const [completionConfirmTaskId, setCompletionConfirmTaskId] = useState<
    string | null
  >(null);
  const [revertConfirmTaskId, setRevertConfirmTaskId] = useState<string | null>(
    null,
  );
  const [revertFromStatus, setRevertFromStatus] = useState<string | null>(null);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    if (!currentUser) {
      toast.error("You must be logged in to update task status");
      return;
    }

    // If user is task creator, admin/owner, ask for confirmation
    const isTaskCreator =
      taskDetails && currentUser.id === taskDetails.createdById;
    const isAdminOrOwner =
      currentUser.role === "ADMIN" || currentUser.role === "OWNER";

    if (isTaskCreator || isAdminOrOwner) {
      const confirmed = await confirm({
        message: "Confirm changing task status?",
      });
      if (!confirmed) return;
    }

    const currentStatus = (taskDetails?.status || "todo").toLowerCase();
    const isCurrentlyDone =
      currentStatus === "done" || currentStatus === "completed";
    const isMarkingDone =
      newStatus.toLowerCase() === "done" ||
      newStatus.toLowerCase() === "completed";
    const isRevertingFromDone = isCurrentlyDone && !isMarkingDone;

    // Show confirmation for marking Done
    if (isMarkingDone && !isCurrentlyDone) {
      setCompletionConfirmTaskId(taskId);
      return;
    }

    // Show confirmation for reverting from Done
    if (isRevertingFromDone) {
      setRevertConfirmTaskId(taskId);
      setRevertFromStatus(currentStatus);
      return;
    }

    // Perform the status change
    await updateTaskStatus(taskId, newStatus);
  };

  const updateTaskStatus = async (
    taskId: string,
    newStatus: string,
    autoComment?: string,
  ) => {
    try {
      const body: any = { status: newStatus };

      if (autoComment) {
        body.autoComment = autoComment;
      }

      const res = await fetch(`/api/task-management/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(currentUser?.id),
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)));
        if (selectedTaskId === taskId) {
          loadTaskDetails(taskId);
        }
        toast.success("Task status updated");
      } else {
        let errorData;
        try {
          errorData = await res.json();
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
          errorData = { error: `Server error: ${res.status}` };
        }
        const errorMsg = errorData?.error || "Failed to update task status";
        const details = errorData?.details ? ` (${errorData.details})` : "";
        console.error(
          "Status update failed:",
          res.status,
          errorMsg + details,
          errorData,
        );
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update task status");
    }
  };

  // Load current user from session manager
  useEffect(() => {
    const loadUser = async () => {
      const user = await getCurrentUser();
      if (user) {
        setCurrentUser(user as User);
      }
    };
    loadUser();
  }, []);

  // Wrapper for create modal - keep modal open logic at page level
  const onCreate = (createdTask: any) => {
    handleCreateTask(createdTask);
    setShowCreateModal(false);

    if (createdTask?.id) {
      setSelectedTaskId(createdTask.id);
      loadTaskDetails(createdTask.id);
    }

    toast.success("Task created");
  };

  const onEditSave = (updatedTask: any) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)),
    );
    setShowEditModal(false);
    setEditingTaskId(null);

    if (selectedTaskId === updatedTask.id) {
      loadTaskDetails(updatedTask.id);
    }

    toast.success("Task updated");
  };

  const [taskFilter, setTaskFilter] = useState<"all" | "mine">("all");

  const groupedTasks = () => {
    const filtered = getFilteredAndSortedTasks();

    if (taskFilter === "mine") {
      const myTasks = filtered.filter(
        (task) =>
          task.assignees?.some((a) => a.assignee?.id === currentUser?.id) ||
          task.assignee?.id === currentUser?.id,
      );
      return { allTasks: myTasks, assignedTasks: [] };
    }

    return { allTasks: filtered, assignedTasks: [] };
  };

  const filteredAll = getFilteredAndSortedTasks();
  const ownCount = filteredAll.filter(
    (task) =>
      task.assignees?.some((a) => a.assignee?.id === currentUser?.id) ||
      task.assignee?.id === currentUser?.id,
  ).length;

  return (
    <PageContainer title="Tasks">
      {/* Toolbar – compact, matches dashboard cards */}
      <div className="flex items-center justify-between mt-4 mb-4 px-2">
        <div className="text-sm text-gray-700 font-medium">
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
            className="
              px-3 py-2 rounded-lg bg-white border border-gray-200
              text-gray-700 text-sm placeholder-gray-400 outline-none
              focus:border-blue-300 focus:ring-1 focus:ring-blue-300/50
              shadow-sm w-64
            "
          />
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Sort by</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="
                px-3 py-2 rounded-lg bg-white border border-gray-200
                text-gray-700 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300/50
                shadow-sm
              "
            >
              <option value="task">Task</option>
              <option value="assignee">Assignee</option>
              <option value="status">Status</option>
              <option value="priority">Priority</option>
              <option value="duedate">Due Date</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="
                px-3 py-2 rounded-lg bg-white border border-gray-200
                text-gray-700 text-xs hover:bg-gray-50 transition-colors
                shadow-sm
              "
              title="Toggle sort direction"
            >
              {sortOrder === "asc" ? "Asc" : "Desc"}
            </button>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="
              flex items-center gap-1.5 px-4 py-2 rounded-lg
              bg-blue-600 text-white text-sm font-medium
              hover:bg-blue-700 transition-colors shadow-sm
            "
          >
            <Plus size={16} />
            <span>New task</span>
          </button>
        </div>
      </div>

      {/* Tasks View */}
      <PageContentCon className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Error Display */}
        {(taskLoadError || usersLoadError) && (
          <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 font-medium">
              Error loading data:
            </p>
            {taskLoadError && (
              <p className="text-sm text-red-600 mt-1">
                Tasks: {taskLoadError}
              </p>
            )}
            {usersLoadError && (
              <p className="text-sm text-red-600 mt-1">
                Users: {usersLoadError}
              </p>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* User Not Loaded Display */}
        {!taskLoadError && !usersLoadError && !currentUser && (
          <div className="m-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-700 font-medium">
              Loading tasks...
            </p>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 px-4 pt-4">
          <button
            onClick={() => setTaskFilter("all")}
            className={`
              px-5 py-2 rounded-lg text-sm font-medium transition-all
              ${
                taskFilter === "all"
                  ? "bg-blue-100 text-blue-800 border border-blue-200 shadow-sm"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
              }
            `}
          >
            Team's Tasks ({tasks.length})
          </button>
          <button
            onClick={() => setTaskFilter("mine")}
            className={`
              px-5 py-2 rounded-lg text-sm font-medium transition-all
              ${
                taskFilter === "mine"
                  ? "bg-blue-100 text-blue-800 border border-blue-200 shadow-sm"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
              }
            `}
          >
            Your Tasks ({ownCount})
          </button>
        </div>

        {/* Task Groups Display */}
        <div className="flex-1 px-4 py-3 overflow-auto flex flex-col gap-4">
          {/* Do This First Section - Always show if component is ready */}
          {currentUser && (
            <div className="max-h-44">
              <TaskSummary
                tasks={getFilteredAndSortedTasks()}
                currentUser={currentUser}
                userRole={currentUser.role as "ADMIN" | "OWNER" | "EMPLOYEE" | undefined}
                filterMode={taskFilter === "mine" ? "my-tasks" : "team-tasks"}
              />
            </div>
          )}

          {/* Task List */}
          <div className="flex-1 overflow-auto">
            <TaskGroupedDisplay
              tasks={getFilteredAndSortedTasks()}
              currentUser={currentUser}
              filterByAssignee={taskFilter === "mine"}
              onEdit={handleEdit}
              onView={handleView}
              onDelete={handleDeleteTask}
              onStatusChange={handleStatusChange}
              onContain={handleContain}
            />
          </div>
        </div>
      </PageContentCon>

      {/* Task Details Panel */}
      {selectedTaskId && taskDetails && (
        <TaskDetailsPanel
          taskDetails={taskDetails}
          currentEmployee={currentUser}
          users={users}
          onClose={() => setSelectedTaskId(null)}
          comments={comments}
          newComment={newComment}
          setNewComment={setNewComment}
          handleAddComment={handleAddComment}
          handleDeleteComment={handleDeleteComment}
          handleReply={handleReply}
          handleStatusChange={handleStatusChange}
          attachments={attachments}
        />
      )}

      {/* Completion Confirmation Modal */}
      {completionConfirmTaskId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Task Completion
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you're done with this task? Once marked as completed,
              the task will be moved to your Analytics page's Completed Tasks
              section. You can undo this action there if needed.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setCompletionConfirmTaskId(null)}
                className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const comment = `Status changed to Done by ${currentUser?.name || currentUser?.email || "System"}`;
                  await updateTaskStatus(
                    completionConfirmTaskId!,
                    "done",
                    comment,
                  );
                  setCompletionConfirmTaskId(null);
                }}
                className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Mark as Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revert From Done Confirmation Modal */}
      {revertConfirmTaskId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Reopen Task
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Reopen this task? It will move back to To Do. This is reversible
              anytime.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setRevertConfirmTaskId(null);
                  setRevertFromStatus(null);
                }}
                className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const comment = `Reverted to To Do from ${revertFromStatus} by ${currentUser?.name || currentUser?.email || "System"}`;
                  await updateTaskStatus(revertConfirmTaskId!, "todo", comment);
                  setRevertConfirmTaskId(null);
                  setRevertFromStatus(null);
                }}
                className="px-5 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Reopen Task
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
          currentEmployee={currentUser}
          onClose={() => setShowCreateModal(false)}
          onCreate={onCreate}
        />
      )}

      {/* Edit Task Modal */}
      {showEditModal && taskDetails && (
        <CreateTaskModal
          users={users}
          currentEmployee={currentUser}
          onClose={() => {
            setShowEditModal(false);
            setEditingTaskId(null);
          }}
          onCreate={onEditSave}
          editingTask={taskDetails}
        />
      )}
    </PageContainer>
  );
}
