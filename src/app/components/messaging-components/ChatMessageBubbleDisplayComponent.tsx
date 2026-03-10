"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  Edit2,
  Trash2,
  Reply,
  Smile,
  X,
  CheckCircle,
  Download,
} from "lucide-react";

interface Message {
  id: number;
  content: string;
  attachments?: string[];
  reactions?: Array<{ emoji: string; userId: number }>;
  isEdited: boolean;
  isDeleted?: boolean;
  parentMessageId?: number;
  _count?: {
    replies: number;
  };
  parentMessage?: {
    id: number;
    content: string;
    createdAt: string;
    sender: {
      id: number;
      firstName: string;
      lastName: string;
      profilePicture?: string;
    };
  };
  createdAt: string;
  sender: {
    id: number;
    firstName: string;
    lastName: string;
    profilePicture?: string;
  };
}

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  onEdit: (messageId: number, newContent: string) => void;
  onDelete: (messageId: number) => void;
  onReply: (messageId: number) => void;
  onAddReaction: (messageId: number, emoji: string) => void;
  currentUserId: number;
}

const EMOJI_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "👏"];

export function MessageBubble({
  message,
  isCurrentUser,
  onEdit,
  onDelete,
  onReply,
  onAddReaction,
  currentUserId,
}: MessageBubbleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleEditSave = useCallback(() => {
    if (editedContent.trim()) {
      onEdit(message.id, editedContent);
      setIsEditing(false);
    }
  }, [editedContent, message.id, onEdit]);

  const handleDelete = useCallback(() => {
    onDelete(message.id);
  }, [message.id, onDelete]);

  const formatTime = useCallback((date: string) => {
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }, []);

  const formattedTime = useMemo(
    () => formatTime(message.createdAt),
    [formatTime, message.createdAt],
  );

  const handleDownloadAttachment = useCallback((url: string, name: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  if (message.isDeleted) {
    return (
      <div style={{ display: "flex", gap: "12px", marginBottom: "4px" }}>
        <p
          style={{
            fontSize: "12px",
            color: "rgba(0,0,0,0.4)",
            fontStyle: "italic",
          }}
        >
          Message unsent
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        gap: "12px",
        marginBottom: "4px",
        flexDirection: isCurrentUser ? "row-reverse" : "row",
        position: "relative",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Avatar */}
      <div
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #798CC3 0%, #5a6fa3 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "12px",
          color: "#fff",
          fontWeight: "600",
          flexShrink: 0,
          position: "relative",
          border: "2px solid rgba(0,0,0,0.1)",
          overflow: "hidden",
        }}
      >
        {message.sender.profilePicture &&
        message.sender.profilePicture.trim() ? (
          <img
            src={message.sender.profilePicture}
            alt={message.sender.firstName}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
            }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : null}
        <span
          style={{
            display:
              message.sender.profilePicture &&
              message.sender.profilePicture.trim()
                ? "none"
                : "block",
          }}
        >
          {message.sender.firstName?.[0]}
          {message.sender.lastName?.[0]}
        </span>
      </div>

      {/* Message Content */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          alignItems: "flex-start",
          flexDirection: isCurrentUser ? "row" : "row-reverse",
        }}
      >
        {/* Hover Action Buttons - Left side for receiver, right side for sender */}
        {isHovered && !isEditing && (
          <div
            style={{
              display: "flex",
              gap: "2px",
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "flex-start",
              marginTop: "22px",
            }}
          >
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="Add reaction"
              style={{
                padding: "2px 4px",
                borderRadius: "4px",
                background: "rgba(0,0,0,0.05)",
                border: "1px solid rgba(0,0,0,0.1)",
                cursor: "pointer",
                color: "rgba(0,0,0,0.6)",
                display: "flex",
                alignItems: "center",
                gap: "2px",
                fontSize: "10px",
                fontFamily: "var(--font-inria-sans)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(0,0,0,0.1)";
                e.currentTarget.style.color = "rgba(0,0,0,0.9)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(0,0,0,0.05)";
                e.currentTarget.style.color = "rgba(0,0,0,0.6)";
              }}
            >
              <Smile size={12} />
            </button>
            <button
              onClick={() => onReply(message.id)}
              title="Reply"
              style={{
                padding: "2px 4px",
                borderRadius: "4px",
                background: "rgba(0,0,0,0.05)",
                border: "1px solid rgba(0,0,0,0.1)",
                cursor: "pointer",
                color: "rgba(0,0,0,0.6)",
                display: "flex",
                alignItems: "center",
                gap: "2px",
                fontSize: "10px",
                fontFamily: "var(--font-inria-sans)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(0,0,0,0.1)";
                e.currentTarget.style.color = "rgba(0,0,0,0.9)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(0,0,0,0.05)";
                e.currentTarget.style.color = "rgba(0,0,0,0.6)";
              }}
            >
              <Reply size={12} />
            </button>
            {isCurrentUser && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  title="Edit"
                  style={{
                    padding: "2px 4px",
                    borderRadius: "4px",
                    background: "rgba(0,0,0,0.05)",
                    border: "1px solid rgba(0,0,0,0.1)",
                    cursor: "pointer",
                    color: "rgba(0,0,0,0.6)",
                    display: "flex",
                    alignItems: "center",
                    fontSize: "10px",
                    fontFamily: "var(--font-inria-sans)",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(0,0,0,0.1)";
                    e.currentTarget.style.color = "rgba(0,0,0,0.9)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(0,0,0,0.05)";
                    e.currentTarget.style.color = "rgba(0,0,0,0.6)";
                  }}
                >
                  <Edit2 size={12} />
                </button>
                <button
                  onClick={handleDelete}
                  title="Delete"
                  style={{
                    padding: "2px 4px",
                    borderRadius: "4px",
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    cursor: "pointer",
                    color: "rgba(239, 68, 68, 0.7)",
                    display: "flex",
                    alignItems: "center",
                    fontSize: "10px",
                    fontFamily: "var(--font-inria-sans)",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "rgba(239, 68, 68, 0.15)";
                    e.currentTarget.style.color = "rgba(239, 68, 68, 1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
                    e.currentTarget.style.color = "rgba(239, 68, 68, 0.7)";
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </>
            )}
          </div>
        )}

        {/* Message Bubble Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: isCurrentUser ? "flex-end" : "flex-start",
            maxWidth: "600px",
          }}
        >
          {/* Name + Timestamp Row */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "center",
              marginBottom: "4px",
              flexDirection: isCurrentUser ? "row-reverse" : "row",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: "600",
                color: "#000",
                fontFamily: "var(--font-inria-sans)",
              }}
            >
              {message.sender.firstName}
            </span>
            <span
              style={{
                fontSize: "10px",
                color: "rgba(0,0,0,0.5)",
                fontFamily: "var(--font-inria-sans)",
              }}
            >
              {formattedTime}
            </span>
          </div>

          {/* Message Text */}
          {isEditing ? (
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                type="text"
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                style={{
                  flex: 1,
                  padding: "6px 10px",
                  fontSize: "12px",
                  borderRadius: "6px",
                  border: "1px solid rgba(0,0,0,0.2)",
                  backgroundColor: "rgba(0,0,0,0.05)",
                  color: "#000",
                  fontFamily: "var(--font-inria-sans)",
                }}
                autoFocus
              />
              <button
                onClick={handleEditSave}
                style={{
                  padding: "4px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#000",
                }}
                title="Save"
              >
                <CheckCircle size={14} />
              </button>
              <button
                onClick={() => {
                  setEditedContent(message.content);
                  setIsEditing(false);
                }}
                style={{
                  padding: "4px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#000",
                }}
                title="Cancel"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <>
              <p
                style={{
                  fontSize: "13px",
                  color: "#000",
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontFamily: "var(--font-inria-sans)",
                  lineHeight: "1.4",
                }}
              >
                {message.content}
              </p>
              {message.isEdited && (
                <p
                  style={{
                    fontSize: "11px",
                    color: "rgba(0,0,0,0.5)",
                    marginTop: "4px",
                    fontFamily: "var(--font-inria-sans)",
                  }}
                >
                  (edited)
                </p>
              )}

              {/* Attachments - Display Media */}
              {message.attachments && message.attachments.length > 0 && (
                <div
                  style={{
                    marginTop: "8px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {message.attachments.map((attachment, idx) => {
                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(
                      attachment,
                    );
                    const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(attachment);
                    const isAudio = /\.(mp3|wav|ogg|m4a|flac)$/i.test(
                      attachment,
                    );
                    const fileName = attachment.split("/").pop() || "File";
                    const displayName =
                      fileName.length > 35
                        ? fileName.substring(0, 32) + "..."
                        : fileName;

                    return (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                        }}
                      >
                        {isImage && (
                          <div
                            style={{
                              position: "relative",
                              width: "fit-content",
                            }}
                          >
                            <img
                              src={attachment}
                              alt={fileName}
                              style={{
                                maxWidth: "300px",
                                maxHeight: "300px",
                                borderRadius: "8px",
                                cursor: "pointer",
                                display: "block",
                              }}
                              onClick={() => window.open(attachment, "_blank")}
                              title="Click to view full size"
                            />
                            <button
                              onClick={() =>
                                handleDownloadAttachment(attachment, fileName)
                              }
                              style={{
                                position: "absolute",
                                bottom: "6px",
                                right: "6px",
                                padding: "6px 10px",
                                backgroundColor: "rgba(0, 0, 0, 0.6)",
                                color: "#fff",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "12px",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                fontFamily: "var(--font-inria-sans)",
                                transition: "all 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "rgba(0, 0, 0, 0.8)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "rgba(0, 0, 0, 0.6)";
                              }}
                              title="Download image"
                            >
                              <Download size={12} />
                              Download
                            </button>
                          </div>
                        )}
                        {isVideo && (
                          <div
                            style={{
                              position: "relative",
                              width: "fit-content",
                            }}
                          >
                            <video
                              src={attachment}
                              controls
                              style={{
                                maxWidth: "300px",
                                maxHeight: "300px",
                                borderRadius: "8px",
                                display: "block",
                                backgroundColor: "#000",
                              }}
                            />
                            <button
                              onClick={() =>
                                handleDownloadAttachment(attachment, fileName)
                              }
                              style={{
                                position: "absolute",
                                bottom: "6px",
                                right: "6px",
                                padding: "6px 10px",
                                backgroundColor: "rgba(0, 0, 0, 0.6)",
                                color: "#fff",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "12px",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                fontFamily: "var(--font-inria-sans)",
                                transition: "all 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "rgba(0, 0, 0, 0.8)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "rgba(0, 0, 0, 0.6)";
                              }}
                              title="Download video"
                            >
                              <Download size={12} />
                              Download
                            </button>
                          </div>
                        )}
                        {isAudio && (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "6px",
                              padding: "8px",
                              backgroundColor: "rgba(0, 0, 0, 0.05)",
                              borderRadius: "8px",
                            }}
                          >
                            <audio
                              src={attachment}
                              controls
                              style={{
                                maxWidth: "300px",
                                height: "32px",
                              }}
                            />
                            <button
                              onClick={() =>
                                handleDownloadAttachment(attachment, fileName)
                              }
                              style={{
                                padding: "4px 8px",
                                backgroundColor: "#60a5fa",
                                color: "#fff",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "11px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "4px",
                                fontFamily: "var(--font-inria-sans)",
                                transition: "all 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "#3b82f6";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "#60a5fa";
                              }}
                              title="Download audio"
                            >
                              <Download size={11} />
                              Download
                            </button>
                          </div>
                        )}
                        {!isImage && !isVideo && !isAudio && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              padding: "8px 10px",
                              background: "rgba(96, 165, 250, 0.1)",
                              borderRadius: "6px",
                              border: "1px solid rgba(96, 165, 250, 0.3)",
                              fontFamily: "var(--font-inria-sans)",
                              width: "fit-content",
                            }}
                          >
                            <span style={{ fontSize: "14px" }}>📎</span>
                            <span
                              style={{
                                fontSize: "12px",
                                color: "#000",
                                flex: 1,
                              }}
                              title={fileName}
                            >
                              {displayName}
                            </span>
                            <a
                              href={attachment}
                              download={fileName}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "4px 8px",
                                backgroundColor: "#60a5fa",
                                color: "#fff",
                                borderRadius: "4px",
                                textDecoration: "none",
                                fontSize: "11px",
                                fontFamily: "var(--font-inria-sans)",
                                transition: "all 0.2s",
                                cursor: "pointer",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "#3b82f6";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "#60a5fa";
                              }}
                              title={`Download ${fileName}`}
                            >
                              <Download size={11} />
                              Download
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Reactions - Positioned at Bottom */}
              {message.reactions && message.reactions.length > 0 && (
                <div
                  style={{
                    marginTop: "6px",
                    display: "flex",
                    gap: "4px",
                    flexWrap: "wrap",
                    justifyContent: isCurrentUser ? "flex-end" : "flex-start",
                  }}
                >
                  {Array.from(
                    new Map(
                      message.reactions.map((r) => [r.emoji, r]),
                    ).values(),
                  ).map((reaction) => {
                    const count =
                      message.reactions?.filter(
                        (r) => r.emoji === reaction.emoji,
                      ).length || 0;
                    const hasReacted = message.reactions?.some(
                      (r) =>
                        r.emoji === reaction.emoji &&
                        r.userId === currentUserId,
                    );
                    return (
                      <button
                        key={reaction.emoji}
                        onClick={() =>
                          // only fire if user hasn't already reacted with this emoji
                          !hasReacted &&
                          onAddReaction(message.id, reaction.emoji)
                        }
                        disabled={hasReacted}
                        style={{
                          padding: "4px 8px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          border:
                            "1px solid " +
                            (hasReacted
                              ? "rgba(59, 130, 246, 0.5)"
                              : "rgba(0, 0, 0, 0.2)"),
                          background: hasReacted
                            ? "rgba(59, 130, 246, 0.1)"
                            : "rgba(0, 0, 0, 0.1)",
                          color: "#000",
                          cursor: hasReacted ? "default" : "pointer",
                          fontFamily: "var(--font-inria-sans)",
                        }}
                      >
                        <span style={{ fontSize: "12px" }}>
                          {reaction.emoji}
                        </span>
                        <span>{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Replies indicator */}
              {message._count && message._count.replies > 0 && (
                <div
                  style={{
                    marginTop: "6px",
                    fontSize: "11px",
                    color: "rgba(59, 130, 246, 0.8)",
                    fontFamily: "var(--font-inria-sans)",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    cursor: "pointer",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: "rgba(59, 130, 246, 0.1)",
                    width: "fit-content",
                  }}
                  onClick={() => {
                    // Scroll to first reply
                    const firstReply = document.querySelector(
                      `[data-parent-id="${message.id}"]`,
                    );
                    if (firstReply) {
                      firstReply.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                    }
                  }}
                  title="Click to view replies"
                >
                  <Reply size={12} />
                  <span>
                    {message._count.replies}{" "}
                    {message._count.replies === 1 ? "reply" : "replies"}
                  </span>
                </div>
              )}
            </>
          )}

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div
              style={{
                display: "flex",
                gap: "2px",
                marginTop: "4px",
                flexWrap: "wrap",
                padding: "4px",
                background: "rgba(0,0,0,0.05)",
                borderRadius: "4px",
                maxWidth: "140px",
              }}
            >
              {EMOJI_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    const already = message.reactions?.some(
                      (r) => r.emoji === emoji && r.userId === currentUserId,
                    );
                    if (!already) {
                      onAddReaction(message.id, emoji);
                    }
                    setShowEmojiPicker(false);
                  }}
                  style={{
                    padding: "2px 4px",
                    background: "rgba(0,0,0,0.1)",
                    border: "1px solid rgba(0,0,0,0.15)",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "14px",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(0,0,0,0.15)";
                    e.currentTarget.style.transform = "scale(1.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(0,0,0,0.1)";
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
