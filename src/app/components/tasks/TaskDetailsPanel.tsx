import React, { useEffect } from "react";
import type { Task, User } from "./types";

interface Props {
  taskDetails: Task;
  isEditingTask: boolean;
  setIsEditingTask: (v: boolean) => void;
  currentUser: User | null;
  users: User[];
  onClose: () => void;
  onSaveField: (taskId: number, field: string, value: any) => void;
  loadTaskDetails: (taskId: number) => void;
  onStatusChange?: (taskId: number, newStatus: string) => void;
  comments?: Task["comments"];
  newComment?: string;
  setNewComment?: (s: string) => void;
  handleAddComment?: (taskId: number) => Promise<void>;
  handleDeleteComment?: (commentId: number, taskId: number) => Promise<void>;
  attachments?: Task["attachments"];
  handleAddAttachment?: (taskId: number) => Promise<void>;
  handleDeleteAttachment?: (
    attachmentId: number,
    taskId: number,
  ) => Promise<void>;
  uploadingAttachment?: boolean;
  setAttachmentFile?: (f: File | null) => void;
  attachmentFile?: File | null;
}

export default function TaskDetailsPanel({
  taskDetails,
  isEditingTask,
  setIsEditingTask,
  currentUser,
  users,
  onClose,
  onSaveField,
  loadTaskDetails,
  onStatusChange,
  comments,
  newComment,
  setNewComment,
  handleAddComment,
  handleDeleteComment,
  attachments,
  handleAddAttachment,
  handleDeleteAttachment,
  uploadingAttachment,
  setAttachmentFile,
  attachmentFile,
}: Props) {
  const statusColors: Record<string, string> = {
    todo: "#8b5cf6",
    inprogress: "#f59e0b",
    stuck: "#ef4444",
    completed: "#10b981",
  };
  const statusLabels: Record<string, string> = {
    todo: "To do",
    inprogress: "In Progress",
    stuck: "Overdue",
    completed: "Done",
  };
  const status = taskDetails.status || "todo";
  const isOwner = currentUser?.id === taskDetails.createdById;

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
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black/50 flex justify-center items-center z-[1000] p-5"
      onClick={() => onClose()}
    >
      <div
        className="w-[min(96%,900px)] max-w-[900px] max-h-[90vh] bg-slate-900 rounded-lg border border-black/10 overflow-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-black/10 flex justify-between items-center">
          <div className="flex flex-col gap-1">
            <div className="text-lg font-bold text-white">
              {taskDetails.title}
            </div>
            <div className="text-xs text-slate-400">Task Details</div>
          </div>

          <div className="flex gap-2 items-center">
            {isOwner && isEditingTask ? (
              <>
                <button
                  onClick={() => {
                    if (taskDetails?.id) {
                      loadTaskDetails(taskDetails.id);
                    }
                    setIsEditingTask(false);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-white/10 bg-blue-950 text-white text-sm cursor-pointer hover:bg-blue-900 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (taskDetails?.id) loadTaskDetails(taskDetails.id);
                    setIsEditingTask(false);
                  }}
                  className="px-3 py-1.5 rounded-lg border-none bg-blue-600 text-white text-sm font-bold cursor-pointer shadow-lg hover:bg-blue-700 transition-all"
                >
                  Save
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditingTask(true)}
                title="Edit task"
                className="bg-none border-none text-slate-400 cursor-pointer text-lg p-1.5 hover:text-slate-300 transition-colors"
              >
                ✎
              </button>
            )}

            <button
              onClick={() => onClose()}
              className="bg-none border-none text-slate-400 cursor-pointer text-xl hover:text-slate-300 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
            {/* Main Content */}
            <div className="flex flex-col gap-3">
              {/* Assignee */}
              <div className="flex gap-3 items-center">
                <div className="min-w-[120px] text-xs font-bold uppercase bg-white/10 p-2.5 rounded-lg text-slate-400">
                  Assignee
                </div>
                <div className="flex-1">
                  {isEditingTask && isOwner ? (
                    <select
                      value={String(taskDetails.assignee?.id || "")}
                      onChange={(e) => {
                        const val = e.target.value
                          ? Number(e.target.value)
                          : null;
                        onSaveField(taskDetails.id, "assigneeId", val);
                      }}
                      className="w-full px-2 py-2 rounded-lg bg-blue-950 text-white border border-white/10"
                    >
                      <option value="">Unassigned</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name || u.email}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-white">
                      {taskDetails.assignee ? (
                        `${taskDetails.assignee.name || taskDetails.assignee.email}`
                      ) : (
                        <span className="text-slate-400">Unassigned</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <div className="text-xs mb-2 text-slate-400">Description</div>
                <div className="bg-blue-950 p-3 rounded-lg text-white border border-white/5 leading-relaxed whitespace-pre-wrap">
                  {taskDetails.description || "—"}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="flex flex-col gap-3">
              {/* Status */}
              <div>
                <div className="text-xs mb-2 text-slate-400">Status</div>
                {isEditingTask && isOwner ? (
                  <select
                    value={status}
                    onChange={(e) => {
                      const newStatus = e.target.value;
                      if (
                        (newStatus === "completed" || newStatus === "done") &&
                        status !== "completed" &&
                        status !== "done"
                      ) {
                        onStatusChange?.(taskDetails.id, newStatus);
                      } else {
                        onSaveField(taskDetails.id, "status", newStatus);
                      }
                    }}
                    className="w-full px-2 py-2 rounded-lg bg-blue-950 text-white border border-white/10"
                  >
                    <option value="todo">To Do</option>
                    <option value="inprogress">In Progress</option>
                    <option value="stuck">Stuck</option>
                    <option value="completed">Completed</option>
                    <option value="done">Done</option>
                  </select>
                ) : (
                  <div
                    className="inline-block px-3 py-2 rounded-lg text-white font-bold text-sm min-w-[110px] text-center"
                    style={{ backgroundColor: statusColors[status] }}
                  >
                    {statusLabels[status]}
                  </div>
                )}
              </div>

              {/* Due Date */}
              <div>
                <div className="text-xs mb-2 text-slate-400">Due</div>
                <div className="bg-blue-950 p-3 rounded-lg text-white border border-white/5">
                  {taskDetails.dueDate
                    ? new Date(taskDetails.dueDate).toLocaleString()
                    : "—"}
                </div>
              </div>
            </div>
          </div>

          {/* Meta, Comments & Attachments */}
          <div className="mt-5">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
              {/* Left Column - Meta & Comments */}
              <div>
                {/* Created By */}
                <div className="flex gap-3 items-center mb-2">
                  <div className="text-xs text-slate-400">Created By</div>
                  <div className="text-white font-semibold">
                    {taskDetails.createdBy
                      ? taskDetails.createdBy.name ||
                        taskDetails.createdBy.email
                      : "-"}
                  </div>
                </div>

                {/* Created At */}
                <div className="flex gap-3 items-center mb-2">
                  <div className="text-xs text-slate-400">Created At</div>
                  <div className="bg-blue-950 px-2 py-2 rounded-lg text-white border border-white/5 text-sm">
                    {taskDetails.createdAt
                      ? new Date(taskDetails.createdAt).toLocaleString()
                      : "-"}
                  </div>
                </div>

                {/* Comments */}
                <div className="mt-3">
                  <div className="text-xs text-slate-400 mb-2">Comments</div>
                  <div className="max-h-[220px] overflow-auto p-2 rounded-lg bg-white/5">
                    {(comments && comments.length > 0
                      ? comments
                      : taskDetails.comments
                    )?.length ? (
                      (comments && comments.length > 0
                        ? comments
                        : taskDetails.comments)!.map((c) => (
                        <div
                          key={c.id}
                          className="p-2 border-b border-white/5 text-white"
                        >
                          <div className="text-sm font-semibold">
                            {c.user ? c.user.name || c.user.email : "Unknown"}
                          </div>
                          <div className="text-sm mt-1.5">{c.content}</div>
                          <div className="text-xs text-slate-400 mt-1.5">
                            {c.createdAt
                              ? new Date(c.createdAt).toLocaleString()
                              : ""}
                          </div>
                          {handleDeleteComment ? (
                            <button
                              onClick={() =>
                                handleDeleteComment(c.id, taskDetails.id)
                              }
                              className="bg-none border-none text-red-400 cursor-pointer mt-1.5 text-xs hover:text-red-300"
                            >
                              Delete
                            </button>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-400">No comments</div>
                    )}

                    {handleAddComment && setNewComment ? (
                      <div className="flex gap-2 mt-3">
                        <input
                          placeholder="Write a comment..."
                          value={newComment || ""}
                          onChange={(e) => setNewComment(e.target.value)}
                          className="flex-1 px-2 py-2 rounded-md border border-white/10 bg-transparent text-white placeholder-slate-400"
                        />
                        <button
                          onClick={() => handleAddComment(taskDetails.id)}
                          className="px-2.5 py-2 rounded-md bg-blue-600 text-white border-none cursor-pointer hover:bg-blue-700 transition-colors text-sm"
                        >
                          Add
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Right Column - Attachments */}
              <div>
                <div className="text-xs text-slate-400 mb-2">Attachments</div>
                <div className="max-h-[300px] overflow-auto p-2 rounded-lg bg-white/5">
                  {(attachments && attachments.length > 0
                    ? attachments
                    : taskDetails.attachments
                  )?.length ? (
                    (attachments && attachments.length > 0
                      ? attachments
                      : taskDetails.attachments)!.map((a) => (
                      <div
                        key={a.id}
                        className="p-2 border-b border-white/5 text-white"
                      >
                        <div className="text-sm">{a.filename || a.url}</div>
                        <div className="text-xs text-slate-400 mt-1.5">
                          {a.createdAt
                            ? new Date(a.createdAt).toLocaleString()
                            : ""}
                        </div>
                        {handleDeleteAttachment ? (
                          <div className="mt-1.5">
                            <button
                              onClick={() =>
                                handleDeleteAttachment(a.id, taskDetails.id)
                              }
                              className="bg-none border-none text-red-400 cursor-pointer text-xs hover:text-red-300"
                            >
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-400">No attachments</div>
                  )}

                  {handleAddAttachment && setAttachmentFile ? (
                    <div className="flex gap-2 mt-3 items-center">
                      <input
                        type="file"
                        onChange={(e) =>
                          setAttachmentFile(
                            e.target.files ? e.target.files[0] : null,
                          )
                        }
                        className="flex-1"
                      />
                      <button
                        onClick={() => handleAddAttachment(taskDetails.id)}
                        disabled={uploadingAttachment}
                        className="px-2.5 py-2 rounded-md bg-blue-600 text-white border-none cursor-pointer hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
                      >
                        {uploadingAttachment ? "Uploading..." : "Upload"}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
