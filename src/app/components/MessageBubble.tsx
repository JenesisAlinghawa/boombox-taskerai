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
  const [showActions, setShowActions] = useState(false);

  const handleEditSave = () => {
    if (editedContent.trim()) {
      onEdit(message.id, editedContent);
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    onDelete(message.id);
    setShowActions(false);
  };

  if (message.isDeleted) {
    return (
      <div
        className={`flex gap-3 ${
          isCurrentUser ? "justify-end" : "justify-start"
        }`}
      >
        <p className="text-xs text-gray-400 italic">Message unsent</p>
      </div>
    );
  }

  return (
    <div
      className={`flex gap-3 group ${
        isCurrentUser ? "justify-end" : "justify-start"
      }`}
    >
      {/* Avatar - Left side for others */}
      {!isCurrentUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 shadow-sm">
          {message.sender.profilePicture ? (
            <img
              src={message.sender.profilePicture}
              alt={message.sender.firstName}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            `${message.sender.firstName[0]}${message.sender.lastName[0]}`
          )}
        </div>
      )}

      {/* Message Content */}
      <div
        className={`flex flex-col max-w-2xl ${
          isCurrentUser ? "items-end" : "items-start"
        }`}
      >
        {/* Sender Name - Show for received messages only */}
        {!isCurrentUser && (
          <p className="text-xs font-semibold text-gray-700 mb-1 px-3">
            {message.sender.firstName}
          </p>
        )}

        {/* Message Bubble */}
        <div
          className={`px-4 py-2.5 rounded-2xl shadow-sm border relative group/bubble break-words w-fit max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg ${
            isCurrentUser
              ? "bg-blue-600 text-white rounded-br-none border-blue-600"
              : "bg-white text-gray-900 rounded-bl-none border-gray-200"
          }`}
        >
          {isEditing ? (
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="flex-1 px-2 py-1 text-sm rounded border border-gray-300 text-gray-900"
                autoFocus
              />
              <button
                onClick={handleEditSave}
                className="p-1 hover:bg-opacity-80 transition-all"
                title="Save"
              >
                <CheckCircle size={16} />
              </button>
              <button
                onClick={() => {
                  setEditedContent(message.content);
                  setIsEditing(false);
                }}
                className="p-1 hover:bg-opacity-80 transition-all"
                title="Cancel"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium break-words whitespace-pre-wrap">
                {message.content}
              </p>
              {message.isEdited && (
                <p
                  className={`text-xs mt-1 ${
                    isCurrentUser ? "text-blue-100" : "text-gray-500"
                  }`}
                >
                  (edited)
                </p>
              )}

              {/* Attachments */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {message.attachments.map((attachment, idx) => (
                    <a
                      key={idx}
                      href={attachment}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-xs underline block truncate ${
                        isCurrentUser ? "text-blue-100" : "text-blue-600"
                      }`}
                    >
                      📎 {attachment.split("/").pop()?.slice(0, 20) || "File"}
                    </a>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Action Buttons - Show on hover */}
          {!isEditing && (
            <div className="absolute -bottom-8 left-0 flex gap-0.5 opacity-0 group-hover/bubble:opacity-100 transition-opacity">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1 bg-white text-gray-600 rounded shadow-sm hover:bg-gray-50 transition-colors border border-gray-300"
                title="React"
              >
                <Smile size={12} />
              </button>
              <button
                onClick={() => onReply(message.id)}
                className="p-1 bg-white text-gray-600 rounded shadow-sm hover:bg-gray-50 transition-colors border border-gray-300"
                title="Reply"
              >
                <Reply size={12} />
              </button>
              {isCurrentUser && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1 bg-white text-gray-600 rounded shadow-sm hover:bg-gray-50 transition-colors border border-gray-300"
                    title="Edit"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={handleDelete}
                    className="p-1 bg-white text-red-600 rounded shadow-sm hover:bg-red-50 transition-colors border border-red-300"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div className="mt-2 flex gap-1 bg-white p-2 rounded-lg shadow-md border border-gray-200">
            {EMOJI_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onAddReaction(message.id, emoji);
                  setShowEmojiPicker(false);
                }}
                className="p-1 hover:bg-gray-100 rounded transition-colors text-lg"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Reactions - Display directly below bubble, overlapping like Discord */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="-mt-3 flex flex-wrap gap-1 px-2 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg">
            {Array.from(
              new Map(message.reactions.map((r) => [r.emoji, r])).values()
            ).map((reaction) => {
              const count =
                message.reactions?.filter((r) => r.emoji === reaction.emoji)
                  .length || 0;
              const hasReacted = message.reactions?.some(
                (r) => r.emoji === reaction.emoji && r.userId === currentUserId
              );
              return (
                <button
                  key={reaction.emoji}
                  onClick={() => onAddReaction(message.id, reaction.emoji)}
                  className={`px-1.5 py-0.5 rounded-full text-xs flex items-center gap-0.5 transition-all whitespace-nowrap ${
                    hasReacted
                      ? "bg-blue-100 border border-blue-300 text-gray-900"
                      : "bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-900"
                  }`}
                >
                  <span className="text-sm">{reaction.emoji}</span>
                  <span className="text-xs font-semibold">{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Timestamp */}
        <p
          className={`text-xs mt-1 px-2 opacity-70 ${
            isCurrentUser ? "text-blue-200" : "text-gray-500"
          }`}
        >
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })}
        </p>
      </div>

      {/* Avatar - Right side for current user */}
      {isCurrentUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 shadow-sm">
          {message.sender.profilePicture ? (
            <img
              src={message.sender.profilePicture}
              alt={message.sender.firstName}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            `${message.sender.firstName[0]}${message.sender.lastName[0]}`
          )}
        </div>
      )}
    </div>
  );
}
