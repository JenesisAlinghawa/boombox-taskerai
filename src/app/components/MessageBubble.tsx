"use client";

import React, { useState } from "react";
import { Edit2, Trash2, Reply, Smile, X, CheckCircle } from "lucide-react";

interface Message {
  id: number;
  content: string;
  attachments?: string[];
  reactions?: Array<{ emoji: string; userId: number }>;
  isEdited: boolean;
  isDeleted?: boolean;
  parentMessageId?: number;
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

  const handleEditSave = () => {
    if (editedContent.trim()) {
      onEdit(message.id, editedContent);
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    onDelete(message.id);
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (message.isDeleted) {
    return (
      <div style={{ display: "flex", gap: "12px", marginBottom: "4px" }}>
        <p
          style={{
            fontSize: "12px",
            color: "rgba(255,255,255,0.4)",
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
      }}
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
        }}
      >
        {message.sender.profilePicture ? (
          <img
            src={message.sender.profilePicture}
            alt={message.sender.firstName}
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              objectFit: "cover",
            }}
          />
        ) : (
          `${message.sender.firstName[0]}${message.sender.lastName[0]}`
        )}
      </div>

      {/* Message Content */}
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
              fontSize: "12px",
              fontWeight: "600",
              color: "#fff",
              fontFamily: "var(--font-inria-sans)",
            }}
          >
            {message.sender.firstName}
          </span>
          <span
            style={{
              fontSize: "11px",
              color: "rgba(255,255,255,0.5)",
              fontFamily: "var(--font-inria-sans)",
            }}
          >
            {formatTime(message.createdAt)}
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
                border: "1px solid rgba(255,255,255,0.2)",
                backgroundColor: "rgba(255,255,255,0.05)",
                color: "#fff",
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
                color: "#fff",
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
                color: "#fff",
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
                fontSize: "14px",
                color: "rgba(255,255,255,0.8)",
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
                  color: "rgba(255,255,255,0.5)",
                  marginTop: "4px",
                  fontFamily: "var(--font-inria-sans)",
                }}
              >
                (edited)
              </p>
            )}

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div
                style={{
                  marginTop: "8px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                {message.attachments.map((attachment, idx) => (
                  <a
                    key={idx}
                    href={attachment}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: "12px",
                      color: "#60a5fa",
                      textDecoration: "underline",
                      display: "block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontFamily: "var(--font-inria-sans)",
                    }}
                  >
                    📎 {attachment.split("/").pop()?.slice(0, 20) || "File"}
                  </a>
                ))}
              </div>
            )}
          </>
        )}

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div
            style={{
              marginTop: "8px",
              display: "flex",
              gap: "6px",
              flexWrap: "wrap",
            }}
          >
            {Array.from(
              new Map(message.reactions.map((r) => [r.emoji, r])).values(),
            ).map((reaction) => {
              const count =
                message.reactions?.filter((r) => r.emoji === reaction.emoji)
                  .length || 0;
              const hasReacted = message.reactions?.some(
                (r) => r.emoji === reaction.emoji && r.userId === currentUserId,
              );
              return (
                <button
                  key={reaction.emoji}
                  onClick={() => onAddReaction(message.id, reaction.emoji)}
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
                        ? "rgba(96, 165, 250, 0.5)"
                        : "rgba(107, 114, 128, 0.3)"),
                    background: hasReacted
                      ? "rgba(96, 165, 250, 0.2)"
                      : "rgba(107, 114, 128, 0.1)",
                    color: "#fff",
                    cursor: "pointer",
                    fontFamily: "var(--font-inria-sans)",
                  }}
                >
                  <span style={{ fontSize: "12px" }}>{reaction.emoji}</span>
                  <span>{count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
