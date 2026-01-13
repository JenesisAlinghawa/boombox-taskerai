"use client";

import { useState, useEffect, useRef } from "react";
import { getCurrentUser } from "@/utils/sessionManager";

interface Channel {
  id: number;
  name: string;
}

interface TeamMember {
  id: number;
  name: string;
  email: string;
}

interface Message {
  id: number;
  senderId: number;
  senderName: string;
  content: string;
  timestamp: string;
  isOwn?: boolean;
}

const COLORS = {
  primary: "#4a5fc1",
  darkBg: "#1a2332",
  lightBg: "#f5f5f5",
  text: "#1f2937",
  muted: "#6b7280",
  border: "#e5e7eb",
};

interface ChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, memberIds: number[]) => void;
  title: string;
  teamMembers: TeamMember[];
  currentUserId?: number;
}

function ChannelModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  teamMembers,
  currentUserId,
}: ChannelModalProps) {
  const [name, setName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setSelectedMembers([]);
    }
  }, [isOpen]);

  const handleToggleMember = (memberId: number) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSubmit = () => {
    if (name.trim() && selectedMembers.length > 0) {
      onSubmit(name, selectedMembers);
      setName("");
      setSelectedMembers([]);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "8px",
          padding: "24px",
          minWidth: "400px",
          maxHeight: "80vh",
          overflowY: "auto",
          boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: "0 0 16px", color: COLORS.text }}>{title}</h3>

        {/* Group Name Input */}
        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: 600,
              marginBottom: "4px",
              color: COLORS.text,
            }}
          >
            Channel Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter group name"
            style={{
              width: "100%",
              padding: "10px",
              border: `1px solid ${COLORS.border}`,
              borderRadius: "4px",
              fontSize: "14px",
              boxSizing: "border-box",
              outline: "none",
            }}
          />
        </div>

        {/* Members Selection */}
        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: 600,
              marginBottom: "8px",
              color: COLORS.text,
            }}
          >
            Select Members
          </label>
          <div
            style={{
              maxHeight: "200px",
              overflowY: "auto",
              border: `1px solid ${COLORS.border}`,
              borderRadius: "4px",
              padding: "8px",
            }}
          >
            {teamMembers.length === 0 ? (
              <div
                style={{
                  fontSize: "12px",
                  color: COLORS.muted,
                  padding: "8px",
                }}
              >
                No members available
              </div>
            ) : (
              teamMembers.map((member) => (
                <label
                  key={member.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "8px",
                    cursor: "pointer",
                    borderRadius: "4px",
                    marginBottom: "4px",
                    background: selectedMembers.includes(member.id)
                      ? COLORS.lightBg
                      : "transparent",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(member.id)}
                    onChange={() => handleToggleMember(member.id)}
                    style={{ marginRight: "8px", cursor: "pointer" }}
                  />
                  <div>
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: COLORS.text,
                      }}
                    >
                      {member.name}
                    </div>
                    <div style={{ fontSize: "11px", color: COLORS.muted }}>
                      {member.email}
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              background: COLORS.lightBg,
              color: COLORS.text,
              border: `1px solid ${COLORS.border}`,
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || selectedMembers.length === 0}
            style={{
              padding: "8px 16px",
              background:
                !name.trim() || selectedMembers.length === 0
                  ? COLORS.muted
                  : COLORS.primary,
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor:
                !name.trim() || selectedMembers.length === 0
                  ? "not-allowed"
                  : "pointer",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<"channel" | "user" | null>(
    null
  );
  const [view, setView] = useState<"channels" | "conversations">("channels");
  const [messageText, setMessageText] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    id: number;
    type: "channel" | "user";
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load user from session API
    const loadUser = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          setCurrentUser(user);
        }
      } catch (error) {
        console.error("Failed to load user session:", error);
      }
    };

    loadUser();
    fetchChannels();
    fetchTeamMembers();

    // Poll for team members updates every 5 seconds
    const teamMembersInterval = setInterval(fetchTeamMembers, 5000);

    return () => clearInterval(teamMembersInterval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchChannels = async () => {
    try {
      const response = await fetch("/api/channels");
      if (response.ok) {
        const data = await response.json();
        setChannels(data.channels || []);
      }
    } catch (error) {
      console.error("Failed to fetch channels:", error);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch(`/api/teams`, {
        headers: {
          "x-user-id": String(currentUser?.id || 1),
        },
      });
      if (response.ok) {
        const data = await response.json();
        const members = data.team?.members || [];
        setTeamMembers(
          members.map((m: any) => ({
            id: m.id,
            name: m.user?.name,
            email: m.user?.email,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch team members:", error);
    }
  };

  const fetchMessages = async (id: number, type: "channel" | "user") => {
    setLoading(true);
    try {
      const endpoint =
        type === "channel"
          ? `/api/channels/${id}`
          : `/api/direct-messages/${id}`;
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        const msgs = data.messages || [];
        setMessages(
          msgs.map((msg: any) => ({
            ...msg,
            isOwn: msg.senderId === currentUser?.id,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChat = (id: number, type: "channel" | "user") => {
    setSelectedId(id);
    setSelectedType(type);
    fetchMessages(id, type);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedId || !selectedType) return;

    try {
      const endpoint =
        selectedType === "channel"
          ? `/api/channels/${selectedId}/send`
          : `/api/direct-messages/${selectedId}/send`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(currentUser?.id),
        },
        body: JSON.stringify({ content: messageText }),
      });

      if (response.ok) {
        setMessageText("");
        await fetchMessages(selectedId, selectedType);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleCreateChannel = async (name: string, memberIds: number[]) => {
    try {
      const response = await fetch("/api/channels/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(currentUser?.id),
        },
        body: JSON.stringify({ name, memberIds }),
      });

      if (response.ok) {
        fetchChannels();
        setShowChannelModal(false);
      }
    } catch (error) {
      console.error("Failed to create channel:", error);
    }
  };

  const handleUpdateChannel = async (id: number, name: string) => {
    try {
      const response = await fetch(`/api/channels/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(currentUser?.id),
        },
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        fetchChannels();
        setEditingChannel(null);
        setShowChannelModal(false);
      }
    } catch (error) {
      console.error("Failed to update channel:", error);
    }
  };

  const handleDeleteChannel = async (id: number) => {
    if (!confirm("Are you sure you want to delete this channel?")) return;

    try {
      const response = await fetch(`/api/channels/${id}`, {
        method: "DELETE",
        headers: { "x-user-id": String(currentUser?.id) },
      });

      if (response.ok) {
        fetchChannels();
        if (selectedId === id) {
          setSelectedId(null);
          setSelectedType(null);
        }
      }
    } catch (error) {
      console.error("Failed to delete channel:", error);
    }
  };

  const getSelectedName = () => {
    if (selectedType === "channel") {
      return channels.find((c) => c.id === selectedId)?.name || "";
    } else {
      return teamMembers.find((m) => m.id === selectedId)?.name || "";
    }
  };

  return (
    <div
      style={{
        display: "flex",
        height: "calc(100vh - 60px)",
        background: COLORS.lightBg,
      }}
    >
      <ChannelModal
        isOpen={showChannelModal}
        onClose={() => {
          setShowChannelModal(false);
          setEditingChannel(null);
        }}
        onSubmit={(name, memberIds) => {
          if (editingChannel) {
            handleUpdateChannel(editingChannel.id, name);
          } else {
            handleCreateChannel(name, memberIds);
          }
        }}
        title={editingChannel ? "Edit Channel" : "Create New Channel"}
        teamMembers={teamMembers}
        currentUserId={currentUser?.id}
      />

      {/* Left Sidebar */}
      <div
        style={{
          width: 280,
          background: "#ffffff",
          borderRight: `1px solid ${COLORS.border}`,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px",
            borderBottom: `1px solid ${COLORS.border}`,
            position: "sticky",
            top: 0,
            background: "#ffffff",
            zIndex: 10,
          }}
        >
          <h2
            style={{
              margin: "0 0 16px",
              fontSize: "20px",
              fontWeight: 700,
              color: COLORS.text,
            }}
          >
            Messages
          </h2>
        </div>

        {/* Channels Container */}
        <div
          style={{
            padding: "16px",
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          <h3
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: COLORS.text,
              margin: "0 0 12px",
            }}
          >
            Channels
          </h3>
          <button
            onClick={() => {
              setEditingChannel(null);
              setShowChannelModal(true);
            }}
            style={{
              width: "100%",
              padding: "8px 12px",
              marginBottom: "12px",
              background: COLORS.primary,
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            + Create Channel
          </button>

          {channels.length === 0 ? (
            <div
              style={{
                fontSize: "12px",
                color: COLORS.muted,
                textAlign: "center",
                padding: "12px",
              }}
            >
              No channels yet
            </div>
          ) : (
            channels.map((channel) => (
              <div
                key={channel.id}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    id: channel.id,
                    type: "channel",
                  });
                }}
                onClick={() => handleSelectChat(channel.id, "channel")}
                style={{
                  padding: "10px 12px",
                  cursor: "pointer",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 6,
                  background:
                    selectedId === channel.id && selectedType === "channel"
                      ? COLORS.lightBg
                      : "transparent",
                  fontSize: "13px",
                  color: COLORS.text,
                  transition: "all 0.2s",
                }}
              >
                <span style={{ fontSize: "16px" }}>👥</span>
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {channel.name}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Direct Messages Container */}
        <div
          style={{
            padding: "16px",
            flex: 1,
            overflowY: "auto",
          }}
        >
          <h3
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: COLORS.text,
              margin: "0 0 12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            Direct Messages
            <span
              style={{ fontSize: "11px", color: COLORS.muted, fontWeight: 400 }}
            >
              {teamMembers.length}
            </span>
          </h3>

          {teamMembers.length === 0 ? (
            <div
              style={{
                fontSize: "12px",
                color: COLORS.muted,
                textAlign: "center",
                padding: "12px",
              }}
            >
              No team members
            </div>
          ) : (
            teamMembers.map((member) => (
              <button
                key={member.id}
                onClick={() => handleSelectChat(member.id, "user")}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    id: member.id,
                    type: "user",
                  });
                }}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background:
                    selectedId === member.id && selectedType === "user"
                      ? COLORS.lightBg
                      : "transparent",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 6,
                  transition: "all 0.2s",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "#e5e7eb",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: COLORS.text,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {member.name}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
            onClick={() => setContextMenu(null)}
          />
          <div
            style={{
              position: "fixed",
              top: contextMenu.y,
              left: contextMenu.x,
              background: "#fff",
              border: `1px solid ${COLORS.border}`,
              borderRadius: "4px",
              zIndex: 1000,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            {contextMenu.type === "channel" && (
              <>
                <button
                  onClick={() => {
                    setEditingChannel(
                      channels.find((c) => c.id === contextMenu.id) || null
                    );
                    setShowChannelModal(true);
                    setContextMenu(null);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "8px 16px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: "12px",
                    color: COLORS.text,
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    handleDeleteChannel(contextMenu.id);
                    setContextMenu(null);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "8px 16px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: "12px",
                    color: "#ef4444",
                  }}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* Main Chat Area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "#f8f9fa",
        }}
      >
        {selectedId && selectedType ? (
          <>
            {/* Chat Header */}
            <div
              style={{
                padding: "16px 24px",
                borderBottom: `1px solid ${COLORS.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "16px",
                  fontWeight: 600,
                  color: COLORS.text,
                }}
              >
                {getSelectedName()}
              </h3>
            </div>

            {/* Messages */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {loading ? (
                <div style={{ textAlign: "center", color: COLORS.muted }}>
                  Loading messages...
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: "center", color: COLORS.muted }}>
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      display: "flex",
                      gap: 12,
                      justifyContent: msg.isOwn ? "flex-end" : "flex-start",
                      alignItems: "flex-end",
                    }}
                  >
                    {!msg.isOwn && (
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "#d4a574",
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <div
                      style={{
                        maxWidth: "50%",
                        padding: "10px 14px",
                        borderRadius: "12px",
                        background: msg.isOwn ? COLORS.darkBg : "#e5e7eb",
                        color: msg.isOwn ? "#fff" : COLORS.text,
                        fontSize: "13px",
                        lineHeight: "1.4",
                        wordWrap: "break-word",
                      }}
                    >
                      {msg.content}
                    </div>
                    {msg.isOwn && (
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "#c97c5c",
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div
              style={{
                padding: "16px 24px",
                background: "#ffffff",
                borderTop: `1px solid ${COLORS.border}`,
                display: "flex",
                gap: 12,
                alignItems: "center",
              }}
            >
              <button
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "20px",
                }}
              >
                📎
              </button>
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Enter your message here"
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: "6px",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
              <button
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "20px",
                }}
              >
                😊
              </button>
              <button
                onClick={handleSendMessage}
                style={{
                  padding: "8px 20px",
                  background: COLORS.primary,
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >
                Send ➜
              </button>
            </div>
          </>
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: COLORS.muted,
              fontSize: "14px",
            }}
          >
            Select a {view === "channels" ? "channel" : "conversation"} to start
            messaging
          </div>
        )}
      </div>

      {/* Right Sidebar */}
      <div
        style={{
          width: 240,
          background: "#ffffff",
          borderLeft: `1px solid ${COLORS.border}`,
          padding: "16px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* User Profile Container */}
        <div
          style={{
            padding: "16px",
            background: "#f8f9fa",
            borderRadius: "8px",
            border: `1px solid ${COLORS.border}`,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "#c97c5c",
              margin: "0 auto 12px",
            }}
          />
          <h4
            style={{
              margin: "0 0 4px",
              fontSize: "14px",
              fontWeight: 600,
              color: COLORS.text,
            }}
          >
            {currentUser?.name || "User"}
          </h4>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#10b981",
              }}
            />
            <span
              style={{ fontSize: "12px", color: "#10b981", fontWeight: 600 }}
            >
              Active
            </span>
          </div>
          <div
            style={{
              fontSize: "12px",
              color: COLORS.muted,
              wordBreak: "break-all",
            }}
          >
            {currentUser?.email || "user@example.com"}
          </div>
        </div>

        {/* Task Overview Container */}
        <div
          style={{
            padding: "16px",
            background: "#f8f9fa",
            borderRadius: "8px",
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <h4
            style={{
              margin: "0 0 12px",
              fontSize: "12px",
              fontWeight: 600,
              color: COLORS.text,
            }}
          >
            task overview
          </h4>
          <svg
            width="100%"
            height="140"
            viewBox="0 0 140 140"
            style={{ marginBottom: 16 }}
          >
            <circle cx="70" cy="70" r="60" fill="#3b82f6" />
            <circle
              cx="70"
              cy="70"
              r="60"
              fill="#10b981"
              stroke="white"
              strokeWidth="3"
              clipPath="polygon(50% 50%, 50% 0%, 100% 0%)"
            />
            <circle
              cx="70"
              cy="70"
              r="60"
              fill="#ef4444"
              stroke="white"
              strokeWidth="3"
              clipPath="polygon(50% 50%, 100% 0%, 100% 100%, 50% 100%)"
            />
          </svg>
          <div
            style={{
              fontSize: "11px",
              color: COLORS.muted,
              lineHeight: 1.6,
              marginBottom: 12,
            }}
          >
            <div>
              <span style={{ color: "#3b82f6", fontWeight: 600 }}>■</span>{" "}
              working on 20.0%
            </div>
            <div>
              <span style={{ color: "#10b981", fontWeight: 600 }}>■</span> Done
              60.0%
            </div>
            <div>
              <span style={{ color: "#ef4444", fontWeight: 600 }}>■</span> stuck
              20.0%
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-around",
              height: 100,
              gap: 8,
            }}
          >
            <div
              style={{
                width: "25%",
                height: "40%",
                background: "#3b82f6",
                borderRadius: "4px 4px 0 0",
              }}
            />
            <div
              style={{
                width: "25%",
                height: "25%",
                background: "#ef4444",
                borderRadius: "4px 4px 0 0",
              }}
            />
            <div
              style={{
                width: "25%",
                height: "60%",
                background: "#10b981",
                borderRadius: "4px 4px 0 0",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-around",
              marginTop: 8,
              fontSize: "10px",
              color: COLORS.muted,
            }}
          >
            <span>working on it</span>
            <span>stuck</span>
            <span>done</span>
          </div>
        </div>
      </div>
    </div>
  );
}
