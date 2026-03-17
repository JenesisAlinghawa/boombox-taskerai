"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Paperclip, Smile } from "lucide-react";
import { MediaAttachment } from "@/app/components/shared-attachments/MediaAttachmentComponent";
import { MentionInput } from "@/app/components/shared-mentions/MentionInputComponent";
import { MentionText } from "@/app/components/shared-mentions/MentionTextComponent";
import {
  parseMentions,
  resolveMentions,
  ParsedMention,
  MentionData,
} from "@/utils/mentionUtils";
import type { Task, User } from "./types";

const EMOJI_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "👏"];

// Memoized CommentThread component to prevent focus loss on replies
const MemoizedCommentThread = React.memo(function CommentThread({
  comment,
  currentUser,
  commentReactions,
  setCommentReactions,
  showEmojiPicker,
  setShowEmojiPicker,
  handleDeleteComment,
  taskId,
  onReply,
  replyingTo,
  setReplyingTo,
  replyContent,
  setReplyContent,
  replyMentions,
  setReplyMentions,
  isSubmittingReply,
  setIsSubmittingReply,
  availableUsers,
  taskDetails,
  depth = 0,
}: {
  comment: any;
  currentUser: User | null;
  commentReactions: Record<number, Array<{ emoji: string; userId: string }>>;
  setCommentReactions: React.Dispatch<
    React.SetStateAction<
      Record<number, Array<{ emoji: string; userId: string }>>
    >
  >;
  showEmojiPicker: number | null;
  setShowEmojiPicker: React.Dispatch<React.SetStateAction<number | null>>;
  handleDeleteComment?: (commentId: number, taskId: string) => Promise<void>;
  taskId: string;
  onReply?: (commentId: number, content: string) => Promise<void>;
  replyingTo: number | null;
  setReplyingTo: React.Dispatch<React.SetStateAction<number | null>>;
  replyContent: Record<number, string>;
  setReplyContent: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  replyMentions: Record<number, ParsedMention[]>;
  setReplyMentions: React.Dispatch<
    React.SetStateAction<Record<number, ParsedMention[]>>
  >;
  isSubmittingReply: boolean;
  setIsSubmittingReply: React.Dispatch<React.SetStateAction<boolean>>;
  availableUsers: MentionData[];
  taskDetails: Task;
  depth?: number;
}) {
  const reactions = commentReactions[comment.id] || [];
  const maxDepth = 3;

  const handleReplyChange = useCallback(
    (value: string) => {
      setReplyContent((prev) => ({
        ...prev,
        [comment.id]: value,
      }));
    },
    [comment.id, setReplyContent],
  );

  const handleReplyMentionsChange = useCallback(
    (mentions: ParsedMention[]) => {
      setReplyMentions((prev) => ({
        ...prev,
        [comment.id]: mentions,
      }));
    },
    [comment.id, setReplyMentions],
  );

  return (
    <div
      className={`${depth > 0 ? "ml-8 border-l-2 border-gray-200 pl-4" : ""}`}
    >
      <div className="pb-3 border-b border-gray-200 last:border-b-0 last:pb-0 group">
        {/* Comment Header with Avatar */}
        <div className="flex gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center font-semibold text-xs flex-shrink-0 overflow-hidden">
            {comment.user?.profilePicture ? (
              <img
                src={comment.user.profilePicture}
                alt={comment.user.name || comment.user.email}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-gray-700">
                {(comment.user?.name ||
                  comment.user?.email ||
                  "?")[0].toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm text-gray-800">
              {comment.user
                ? comment.user.name || comment.user.email
                : "Unknown"}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {comment.createdAt
                ? new Date(comment.createdAt).toLocaleString()
                : ""}
            </div>
          </div>
        </div>

        {/* Comment Content */}
        <div className="ml-11 mb-2">
          <div className="text-sm text-gray-700 whitespace-pre-wrap">
            {comment.content}
          </div>
        </div>

        {/* Reactions Display */}
        {reactions.length > 0 && (
          <div className="ml-11 mb-2 flex flex-wrap gap-2">
            {Array.from(
              new Map(reactions.map((r) => [r.emoji, r])).values(),
            ).map((reaction) => {
              const count = reactions.filter(
                (r) => r.emoji === reaction.emoji,
              ).length;
              const hasReacted = reactions.some(
                (r) =>
                  r.emoji === reaction.emoji && r.userId === currentUser?.id,
              );
              return (
                <button
                  key={reaction.emoji}
                  onClick={() => {
                    if (!hasReacted) {
                      setCommentReactions((prev) => ({
                        ...prev,
                        [comment.id]: [
                          ...(prev[comment.id] || []),
                          {
                            emoji: reaction.emoji,
                            userId: currentUser?.id || "",
                          },
                        ],
                      }));
                    }
                  }}
                  disabled={hasReacted}
                  className={`px-2 py-1 rounded-full text-xs border transition-colors ${
                    hasReacted
                      ? "bg-blue-100 border-blue-300"
                      : "bg-gray-100 border-gray-300 hover:bg-gray-200"
                  } ${hasReacted ? "cursor-default" : "cursor-pointer"}`}
                >
                  {reaction.emoji} {count}
                </button>
              );
            })}
          </div>
        )}

        {/* Action Buttons */}
        <div className="ml-11 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {depth === 0 && onReply && (
            <button
              onClick={() =>
                setReplyingTo(replyingTo === comment.id ? null : comment.id)
              }
              className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
            >
              Reply
            </button>
          )}
          <button
            onClick={() =>
              setShowEmojiPicker(
                showEmojiPicker === comment.id ? null : comment.id,
              )
            }
            className="p-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
            title="Add reaction"
          >
            <Smile size={14} />
          </button>
          {handleDeleteComment && currentUser?.id === comment.userId && (
            <button
              onClick={() => handleDeleteComment(comment.id, taskId)}
              className="px-2 py-1 text-xs rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
            >
              Delete
            </button>
          )}
        </div>

        {/* Emoji Picker */}
        {showEmojiPicker === comment.id && (
          <div className="ml-11 mt-2 flex flex-wrap gap-1 p-2 bg-white border border-gray-200 rounded-lg">
            {EMOJI_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  const hasReacted = reactions.some(
                    (r) => r.emoji === emoji && r.userId === currentUser?.id,
                  );
                  if (!hasReacted) {
                    setCommentReactions((prev) => ({
                      ...prev,
                      [comment.id]: [
                        ...(prev[comment.id] || []),
                        {
                          emoji,
                          userId: currentUser?.id || "",
                        },
                      ],
                    }));
                  }
                  setShowEmojiPicker(null);
                }}
                className="text-xl p-1 hover:bg-gray-100 rounded transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Reply Input */}
        {replyingTo === comment.id && onReply && (
          <div className="ml-11 mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <MentionInput
              value={replyContent[comment.id] || ""}
              onChange={handleReplyChange}
              onMentionsChange={handleReplyMentionsChange}
              placeholder={`Reply to ${comment.user?.name || comment.user?.email || "this comment"}...`}
              availableUsers={availableUsers}
              currentUserId={currentUser?.id}
              rows={2}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={async () => {
                  const content = replyContent[comment.id] || "";
                  if (isSubmittingReply || !content.trim()) return;
                  setIsSubmittingReply(true);
                  try {
                    const resolvedMentions = await resolveMentions(
                      replyMentions[comment.id] || [],
                      availableUsers,
                    );

                    await onReply(comment.id, content);

                    const mentionedUserIds = resolvedMentions
                      .map((m) => m.userId)
                      .filter((id) => id !== currentUser?.id);

                    for (const userId of mentionedUserIds) {
                      await fetch("/api/notification-handlers", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          receiverId: userId,
                          type: "mention",
                          data: {
                            title: "You were mentioned",
                            message: `${currentUser?.name || currentUser?.email} mentioned you in a task comment reply`,
                            relatedId: taskDetails.id,
                            relatedType: "task",
                            mentionerId: currentUser?.id,
                            mentionerName:
                              currentUser?.name || currentUser?.email,
                          },
                        }),
                      });
                    }

                    setReplyContent((prev) => ({
                      ...prev,
                      [comment.id]: "",
                    }));
                    setReplyMentions((prev) => ({
                      ...prev,
                      [comment.id]: [],
                    }));
                    setReplyingTo(null);
                  } finally {
                    setIsSubmittingReply(false);
                  }
                }}
                disabled={
                  isSubmittingReply || !(replyContent[comment.id] || "").trim()
                }
                className="px-4 py-1.5 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmittingReply ? "Replying..." : "Reply"}
              </button>
              <button
                onClick={() => {
                  setReplyingTo(null);
                  setReplyContent((prev) => ({
                    ...prev,
                    [comment.id]: "",
                  }));
                  setReplyMentions((prev) => ({
                    ...prev,
                    [comment.id]: [],
                  }));
                }}
                className="px-4 py-1.5 rounded bg-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Render Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-4 space-y-4">
          {comment.replies.map((reply: any) => (
            <MemoizedCommentThread
              key={reply.id}
              comment={reply}
              currentUser={currentUser}
              commentReactions={commentReactions}
              setCommentReactions={setCommentReactions}
              showEmojiPicker={showEmojiPicker}
              setShowEmojiPicker={setShowEmojiPicker}
              handleDeleteComment={handleDeleteComment}
              taskId={taskId}
              onReply={onReply}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              replyContent={replyContent}
              setReplyContent={setReplyContent}
              replyMentions={replyMentions}
              setReplyMentions={setReplyMentions}
              isSubmittingReply={isSubmittingReply}
              setIsSubmittingReply={setIsSubmittingReply}
              availableUsers={availableUsers}
              taskDetails={taskDetails}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
});

interface Props {
  taskDetails: Task;
  currentEmployee: User | null;
  users: User[];
  onClose: () => void;
  comments?: Task["comments"];
  newComment?: string;
  setNewComment?: (s: string) => void;
  handleAddComment?: (taskId: string) => Promise<void>;
  handleDeleteComment?: (commentId: number, taskId: string) => Promise<void>;
  handleReply?: (commentId: number, content: string) => Promise<void>;
  handleStatusChange?: (taskId: string, newStatus: string) => void;
  attachments?: Task["attachments"];
  handleDeleteAttachment?: (
    taskId: string,
    attachmentId: number,
  ) => Promise<void>;
}

export default function TaskDetailsPanel({
  taskDetails,
  currentEmployee: currentUser,
  users,
  onClose,
  comments,
  newComment,
  setNewComment,
  handleAddComment,
  handleDeleteComment,
  handleReply,
  handleStatusChange,
  attachments,
  handleDeleteAttachment,
}: Props) {
  const [commentReactions, setCommentReactions] = useState<
    Record<number, Array<{ emoji: string; userId: string }>>
  >({});
  const [showEmojiPicker, setShowEmojiPicker] = useState<number | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState<Record<number, string>>({});
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [replyMentions, setReplyMentions] = useState<
    Record<number, ParsedMention[]>
  >({});

  // Organize comments into parent-child structure
  const organizeComments = (comments: any[]) => {
    const commentMap = new Map();
    const rootComments: any[] = [];

    // First pass: create map of all comments
    comments.forEach((comment) => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Second pass: organize into tree
    comments.forEach((comment) => {
      if (comment.parentCommentId) {
        const parent = commentMap.get(comment.parentCommentId);
        if (parent) {
          parent.replies.push(commentMap.get(comment.id));
        }
      } else {
        rootComments.push(commentMap.get(comment.id));
      }
    });

    return rootComments;
  };

  // Prepare available users for mentions (memoized to prevent re-renders)
  const availableUsers = useMemo(
    () =>
      users.map((user) => ({
        id: user.id,
        name:
          user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : user.email,
        email: user.email,
        profilePicture: user.profilePicture || undefined,
      })),
    [users],
  );

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

  // Check if current user can change status
  const isAssignedToCurrentUser =
    currentUser &&
    (taskDetails.assignees?.some((a) => a.assignee?.id === currentUser.id) ||
      taskDetails.assignee?.id === currentUser.id);

  const canChangeStatus =
    currentUser &&
    (isAssignedToCurrentUser ||
      currentUser.id === taskDetails.createdById ||
      currentUser.role === "ADMIN" ||
      currentUser.role === "OWNER");

  // Organize comments for display
  const allComments =
    comments && comments.length > 0 ? comments : taskDetails.comments || [];
  const organizedComments = organizeComments(
    allComments.filter((c) => c && typeof c.id === "number" && !isNaN(c.id)),
  );

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
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="
          w-full max-w-3xl max-h-[92vh] overflow-y-auto
          bg-white border border-gray-200 rounded-xl shadow-xl
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-white flex justify-between items-center sticky top-0 z-10">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-lg font-medium text-gray-900">View Task</h2>
            <p className="text-xs text-gray-600">Review task details</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-2xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Current User Profile Card */}
          {currentUser && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
              <div className="text-sm font-medium text-gray-700 mb-3">You</div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {currentUser.profilePicture ? (
                    <img
                      src={currentUser.profilePicture}
                      alt={currentUser.name || "User"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-700 font-semibold">
                      {(currentUser.name || "?")[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {currentUser.name || currentUser.email}
                  </p>
                  <p className="text-xs text-gray-600">{currentUser.email}</p>
                  {currentUser.role && (
                    <p className="text-xs text-gray-500 mt-1">
                      {currentUser.role.charAt(0).toUpperCase() +
                        currentUser.role.slice(1).toLowerCase()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Assignees + Title + Description Section */}
          <div className="flex gap-6">
            {/* Left: Assignees */}
            <div className="flex-shrink-0">
              <div className="text-sm font-medium text-gray-700 mb-3">
                Assigned by:
              </div>
              {taskDetails.assignees && taskDetails.assignees.length > 0 ? (
                <div className="flex flex-wrap gap-4">
                  {taskDetails.assignees.map((assignment) => (
                    <div
                      key={assignment.assignee?.id}
                      className="flex flex-col items-center gap-1.5"
                    >
                      <div>
                        {assignment.assignee?.profilePicture ? (
                          <img
                            src={assignment.assignee.profilePicture}
                            alt={
                              assignment.assignee.name ||
                              assignment.assignee.email
                            }
                            className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 text-gray-700 rounded-full flex items-center justify-center font-medium text-base">
                            {(assignment.assignee?.name ||
                              assignment.assignee?.email ||
                              "?")[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="text-xs font-medium text-gray-800 text-center max-w-[100px] truncate">
                        {assignment.assignee?.name ||
                          assignment.assignee?.email}
                      </div>
                    </div>
                  ))}
                </div>
              ) : taskDetails.assignee ? (
                <div className="flex flex-col items-center gap-1.5">
                  <div>
                    {taskDetails.assignee.profilePicture ? (
                      <img
                        src={taskDetails.assignee.profilePicture}
                        alt={
                          taskDetails.assignee.name ||
                          taskDetails.assignee.email
                        }
                        className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 text-gray-700 rounded-full flex items-center justify-center font-medium text-base">
                        {(taskDetails.assignee.name ||
                          taskDetails.assignee.email ||
                          "?")[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="text-xs font-medium text-gray-800 text-center max-w-[100px] truncate">
                    {taskDetails.assignee.name || taskDetails.assignee.email}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-600">No assignees</div>
              )}
              {taskDetails.createdBy && (
                <div className="text-xs text-gray-600 mt-4">
                  Created by{" "}
                  {taskDetails.createdBy.name || taskDetails.createdBy.email}
                </div>
              )}
            </div>

            {/* Right: Title and Description */}
            <div className="flex-1 space-y-4">
              {/* Title */}
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1.5">
                  Title
                </div>
                <div className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 text-sm font-medium">
                  {taskDetails.title}
                </div>
              </div>

              {/* Description */}
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1.5">
                  Description
                </div>
                <div className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 text-sm whitespace-pre-wrap">
                  {taskDetails.description || "No description provided"}
                </div>
              </div>
            </div>
          </div>

          {/* Grid: Status, Priority, Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Status - Interactive if permission */}
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1.5">
                Status
              </div>
              {canChangeStatus ? (
                <select
                  value={status}
                  onChange={(e) => {
                    if (handleStatusChange) {
                      handleStatusChange(taskDetails.id, e.target.value);
                    }
                  }}
                  disabled={!handleStatusChange}
                  className={`w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm cursor-pointer hover:border-gray-300 transition-colors ${
                    !handleStatusChange ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <option value="todo">To do</option>
                  <option value="inprogress">In Progress</option>
                  <option value="stuck">Stuck</option>
                  <option value="done">Done</option>
                </select>
              ) : (
                <div
                  className={`inline-block px-4 py-2.5 rounded-lg text-sm font-medium ${getStatusColor(status)}`}
                >
                  {statusLabels[status] ||
                    status.charAt(0).toUpperCase() + status.slice(1)}
                </div>
              )}
            </div>

            {/* Priority */}
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1.5">
                Priority
              </div>
              {taskDetails.priority ? (
                <div
                  className={`inline-block px-4 py-2.5 rounded-lg text-sm font-medium ${getPriorityColor(taskDetails.priority)}`}
                >
                  {taskDetails.priority.charAt(0).toUpperCase() +
                    taskDetails.priority.slice(1)}
                </div>
              ) : (
                <div className="text-gray-600 text-sm">—</div>
              )}
            </div>

            {/* Due Date */}
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1.5">
                Due Date
              </div>
              <div className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 text-sm">
                {taskDetails.dueDate
                  ? new Date(taskDetails.dueDate).toLocaleString()
                  : "No due date"}
              </div>
            </div>
          </div>

          {/* Attachments */}
          {(attachments && attachments.length > 0) ||
          (taskDetails.attachments && taskDetails.attachments.length > 0) ? (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Paperclip size={16} className="text-gray-600" />
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
                        currentUser?.id === taskDetails.createdById ||
                        taskDetails.assignees?.some(
                          (a) => a.assignee?.id === currentUser?.id,
                        ) ||
                        currentUser?.id === taskDetails.assignee?.id
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
          {organizedComments && organizedComments.length > 0 ? (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-3">
                Comments
              </div>
              <div className="px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 text-sm max-h-auto overflow-y-auto space-y-4">
                {organizedComments.map((comment) => (
                  <MemoizedCommentThread
                    key={comment.id}
                    comment={comment}
                    currentUser={currentUser}
                    commentReactions={commentReactions}
                    setCommentReactions={setCommentReactions}
                    showEmojiPicker={showEmojiPicker}
                    setShowEmojiPicker={setShowEmojiPicker}
                    handleDeleteComment={handleDeleteComment}
                    taskId={taskDetails.id}
                    onReply={handleReply}
                    replyingTo={replyingTo}
                    setReplyingTo={setReplyingTo}
                    replyContent={replyContent}
                    setReplyContent={setReplyContent}
                    replyMentions={replyMentions}
                    setReplyMentions={setReplyMentions}
                    isSubmittingReply={isSubmittingReply}
                    setIsSubmittingReply={setIsSubmittingReply}
                    availableUsers={availableUsers}
                    taskDetails={taskDetails}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {/* Add Comment */}
          {handleAddComment && setNewComment ? (
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Add Comment
                </label>
                <textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="
                    w-full min-h-[80px] px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm
                    placeholder-gray-400 focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300/50
                    shadow-sm resize-y
                  "
                />
              </div>
              <button
                onClick={async () => {
                  if (isSubmittingComment || !newComment?.trim()) return;
                  setIsSubmittingComment(true);
                  try {
                    await handleAddComment(taskDetails.id);
                  } finally {
                    setIsSubmittingComment(false);
                  }
                }}
                disabled={isSubmittingComment || !newComment?.trim()}
                className="
                  self-end px-6 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium
                  hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-sm
                "
              >
                {isSubmittingComment ? "Posting..." : "Post Comment"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
