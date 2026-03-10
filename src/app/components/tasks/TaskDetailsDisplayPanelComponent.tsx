import React, { useEffect } from "react";
import { Paperclip } from "lucide-react";
import { MediaAttachment } from "@/app/components/shared-attachments/MediaAttachmentComponent";
import type { Task, Employee } from "./types";

interface Props {
  taskDetails: Task;
  currentEmployee: Employee | null;
  users: Employee[];
  onClose: () => void;
  comments?: Task["comments"];
  newComment?: string;
  setNewComment?: (s: string) => void;
  handleAddComment?: (taskId: string) => Promise<void>;
  handleDeleteComment?: (commentId: number, taskId: string) => Promise<void>;
  attachments?: Task["attachments"];
  handleDeleteAttachment?: (
    taskId: string,
    attachmentId: number,
  ) => Promise<void>;
}

export default function TaskDetailsPanel({
  taskDetails,
  currentEmployee,
  users,
  onClose,
  comments,
  newComment,
  setNewComment,
  handleAddComment,
  handleDeleteComment,
  attachments,
  handleDeleteAttachment,
}: Props) {
  const statusLabels: Record<string, string> = {
    todo: "To do",
    inprogress: "In Progress",
    stuck: "Stuck",
    overdue: "Overdue",
    completed: "Done",
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "todo":
        return "bg-purple-500 text-white";
      case "inprogress":
        return "bg-amber-500 text-white";
      case "stuck":
      case "overdue":
        return "bg-red-500 text-white";
      case "completed":
      case "done":
        return "bg-green-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "low":
        return "bg-blue-500 text-white";
      case "medium":
        return "bg-orange-500 text-white";
      case "high":
        return "bg-red-600 text-white";
      default:
        return "text-black/60";
    }
  };

  const status = taskDetails.status || "todo";

  // Close modal on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-5"
      onClick={onClose}
    >
      <div
        className="w-[min(96%,700px)] max-h-[90vh] bg-blue-100/95 backdrop-blur-lg rounded-sm border border-black/20 overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-black/10 flex justify-between items-center sticky top-0 bg-blue-100/95 z-10">
          <div className="flex flex-col gap-1">
            <div className="text-lg font-bold text-black/80">View Task</div>
            <div className="text-xs text-black/60">Review task details</div>
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
              <div className="w-full px-3 py-2 rounded-sm border border-black/10 bg-blue-100/50 text-black/80 text-sm">
                {taskDetails.title}
              </div>
            </div>

            {/* Description */}
            <div>
              <div className="text-xs mb-2 text-black/60 font-semibold">
                Description
              </div>
              <div className="w-full min-h-[80px] px-3 py-2 rounded-sm border border-black/10 bg-blue-100/50 text-black/80 text-sm whitespace-pre-wrap">
                {taskDetails.description || "-"}
              </div>
            </div>

            {/* Grid: Assignee, Status, Priority, Due Date */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
              {/* Left Column */}
              <div className="flex flex-col gap-3">
                {/* Assignee */}
                <div>
                  <div className="text-xs mb-2 text-black/60 font-semibold">
                    Assignee
                  </div>
                  <div className="w-full px-3 py-2 rounded-sm border border-black/10 bg-blue-100/50 text-black/80 text-sm">
                    {taskDetails.assignee
                      ? `${taskDetails.assignee.name || taskDetails.assignee.email}`
                      : "Unassigned"}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <div className="text-xs mb-2 text-black/60 font-semibold">
                    Status
                  </div>
                  <div
                    className={`inline-block px-30 py-1 rounded-sm text-sm ${getStatusColor(status)}`}
                  >
                    {statusLabels[status] ||
                      status.charAt(0).toUpperCase() + status.slice(1)}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="flex flex-col gap-3">
                {/* Priority */}
                <div>
                  <div className="text-xs mb-2 text-black/60 font-semibold">
                    Priority
                  </div>
                  {taskDetails.priority ? (
                    <div
                      className={`inline-block px-41 py-1 rounded-sm text-sm ${getPriorityColor(taskDetails.priority)}`}
                    >
                      {taskDetails.priority.charAt(0).toUpperCase() +
                        taskDetails.priority.slice(1)}
                    </div>
                  ) : (
                    <div className="text-black/60 text-sm">—</div>
                  )}
                </div>

                {/* Due Date */}
                <div>
                  <div className="text-xs mb-2 text-black/60 font-semibold">
                    Due Date
                  </div>
                  <div className="w-full px-3 py-2 rounded-sm border border-black/10 bg-blue-100/50 text-black/80 text-sm">
                    {taskDetails.dueDate
                      ? new Date(taskDetails.dueDate).toLocaleString()
                      : "-"}
                  </div>
                </div>
              </div>
            </div>

            {/* Attachments */}
            {(attachments && attachments.length > 0) ||
            (taskDetails.attachments && taskDetails.attachments.length > 0) ? (
              <div>
                <div className="text-xs mb-3 text-black/60 font-semibold flex items-center gap-1">
                  <Paperclip size={14} className="text-blue-600" />
                  Attachments (
                  {
                    (
                      (attachments && attachments.length > 0
                        ? attachments
                        : taskDetails.attachments) || []
                    ).length
                  }
                  )
                </div>
                <div className="space-y-3">
                  {(attachments && attachments.length > 0
                    ? attachments
                    : taskDetails.attachments
                  )
                    ?.filter((a) => typeof a.id === "number" && !isNaN(a.id))
                    .map((a) => (
                      <MediaAttachment
                        key={a.id}
                        url={a.url}
                        filename={a.filename || undefined}
                        createdAt={a.createdAt}
                        showDownloadButton={true}
                        showViewButton={true}
                        showDeleteButton={
                          currentEmployee?.id === taskDetails.createdById ||
                          currentEmployee?.id === taskDetails.assignee?.id
                        }
                        onDelete={
                          handleDeleteAttachment
                            ? () =>
                                handleDeleteAttachment(
                                  taskDetails.id,
                                  a.id as number,
                                )
                            : undefined
                        }
                        isTaskAttachment={true}
                      />
                    ))}
                </div>
              </div>
            ) : null}

            {/* Comments Section */}
            {(comments && comments.length > 0) ||
            (taskDetails.comments && taskDetails.comments.length > 0) ? (
              <div>
                <div className="text-xs mb-2 text-black/60 font-semibold">
                  Comments
                </div>
                <div className="px-3 py-2 rounded-sm border border-black/10 bg-blue-100/50 text-black/80 text-sm max-h-[200px] overflow-y-auto space-y-3">
                  {(comments && comments.length > 0
                    ? comments
                    : taskDetails.comments
                  )
                    ?.filter(
                      (c) => c && typeof c.id === "number" && !isNaN(c.id),
                    )
                    .map((c) => (
                      <div
                        key={c.id}
                        className="pb-3 border-b border-black/10 last:border-b-0 last:pb-0"
                      >
                        <div className="font-semibold text-xs text-black/80">
                          {c.user ? c.user.name || c.user.email : "Unknown"}
                        </div>
                        <div className="text-xs mt-1 text-black/80">
                          {c.content}
                        </div>
                        <div className="text-xs text-black/50 mt-1">
                          {c.createdAt
                            ? new Date(c.createdAt).toLocaleString()
                            : ""}
                        </div>
                        {handleDeleteComment &&
                          currentEmployee?.id === c.userId && (
                            <button
                              onClick={() =>
                                handleDeleteComment(c.id, taskDetails.id)
                              }
                              className="mt-2 px-2 py-1 rounded-sm bg-red-500/10 text-red-600 border border-red-400/30 text-xs hover:bg-red-500/20 transition-colors"
                            >
                              Delete
                            </button>
                          )}
                      </div>
                    ))}
                </div>
              </div>
            ) : null}

            {/* Add Comment */}
            {handleAddComment && setNewComment ? (
              <div className="flex flex-col gap-3">
                <div>
                  <div className="text-xs mb-2 text-black/60 font-semibold">
                    Add Comment
                  </div>
                  <textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="w-full min-h-[60px] px-3 py-2 rounded-sm border border-black/10 bg-blue-100/50 text-black/80 text-sm placeholder-black/40 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <button
                  onClick={() => handleAddComment(taskDetails.id)}
                  className="ml-auto w-fit px-12 py-2 rounded-sm bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors"
                >
                  Post Comment
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
