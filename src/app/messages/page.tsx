"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Plus,
  Search,
  Users,
  MessageSquare,
  Clock,
  Paperclip,
  MoreVertical,
  Edit2,
  Trash2,
  Reply,
  Smile,
  AlertCircle,
  BarChart3,
  PieChart,
} from "lucide-react";
import { getCurrentUser } from "@/utils/sessionManager";
import { ChannelCreationModal } from "@/components/ChannelCreationModal";

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  profilePicture?: string;
  role: string;
  active: boolean;
  lastActive?: Date;
}

interface Channel {
  id: number;
  name: string;
  description?: string;
  profilePicture?: string;
  members: Array<{ user: User }>;
  creatorId: number;
}

interface Message {
  id: number;
  content: string;
  attachments?: string[];
  reactions?: any[];
  isEdited: boolean;
  isDeleted?: boolean;
  parentMessageId?: number;
  createdAt: string;
  sender: User;
}

type ViewType = "channels" | "dms";

export default function MessagesPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<ViewType>("channels");
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [selectedDMUser, setSelectedDMUser] = useState<User | null>(null);

  const [channels, setChannels] = useState<Channel[]>([]);
  const [dmConversations, setDmConversations] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [selectedUserTasks, setSelectedUserTasks] = useState<any[]>([]);
  const [selectedUserTaskStats, setSelectedUserTaskStats] = useState({
    todo: 0,
    inProgress: 0,
    stuck: 0,
    done: 0,
    total: 0,
  });
  const [loadingUserTasks, setLoadingUserTasks] = useState(false);
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);

  // Role-based permissions check
  const canViewUserTaskProgress = (currentUserRole: string): boolean => {
    const highRoles = ["ADMIN", "MANAGER", "LEAD"];
    return highRoles.includes(currentUserRole);
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const createChannel = async (data: {
    name: string;
    description: string;
    memberIds: number[];
    profilePictureFile?: File;
  }) => {
    if (!currentUser) return;

    try {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("description", data.description);
      formData.append("memberIds", JSON.stringify(data.memberIds));
      if (data.profilePictureFile) {
        formData.append("profilePicture", data.profilePictureFile);
      }

      const res = await fetch("/api/channels", {
        method: "POST",
        headers: {
          "x-user-id": String(currentUser.id),
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setChannels((prev) => (data?.channel ? [data.channel, ...prev] : prev));
        setActiveView("channels");
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to create channel");
      }
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    if (selectedChannel) {
      fetchChannelMessages();
      setSelectedUserTasks([]);
      setSelectedUserTaskStats({
        todo: 0,
        inProgress: 0,
        stuck: 0,
        done: 0,
        total: 0,
      });
    } else if (selectedDMUser) {
      fetchDMMessages();
      // Load task progress for the selected user if current user has permission
      if (currentUser && canViewUserTaskProgress(currentUser.role)) {
        fetchUserTaskProgress(selectedDMUser);
      } else {
        setSelectedUserTasks([]);
        setSelectedUserTaskStats({
          todo: 0,
          inProgress: 0,
          stuck: 0,
          done: 0,
          total: 0,
        });
      }
    }
  }, [selectedChannel, selectedDMUser, currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadInitialData = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        window.location.href = "/auth/login";
        return;
      }
      setCurrentUser(user as User);

      // Fetch channels for the current user
      const channelsRes = await fetch(
        `/api/channels?userId=${(user as any).id}`
      );
      if (channelsRes.ok) {
        const data = await channelsRes.json();
        setChannels(data.channels || []);
      }

      // Fetch DM conversations
      const dmsRes = await fetch("/api/direct-messages");
      if (dmsRes.ok) {
        const data = await dmsRes.json();
        setDmConversations(data.conversations || []);
      }
    } catch (err) {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const fetchChannelMessages = async () => {
    if (!selectedChannel) return;
    try {
      const res = await fetch(
        `/api/messages?channelId=${selectedChannel.id}&limit=100`
      );
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      setError("Failed to fetch messages");
    }
  };

  const fetchDMMessages = async () => {
    if (!selectedDMUser || !currentUser) return;
    try {
      const res = await fetch(
        `/api/direct-messages?userId=${selectedDMUser.id}`
      );
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      setError("Failed to fetch messages");
    }
  };

  const fetchUserTaskProgress = async (user: User) => {
    if (!currentUser || !canViewUserTaskProgress(currentUser.role)) {
      return;
    }

    setLoadingUserTasks(true);
    try {
      // Fetch tasks for this specific user
      const res = await fetch(`/api/tasks?userId=${user.id}`, {
        headers: {
          "x-user-id": String(currentUser.id),
        },
      });

      if (res.ok) {
        const data = await res.json();
        const taskList = Array.isArray(data?.tasks) ? data.tasks : [];

        // Filter tasks assigned to or created by the selected user
        const userTasks = taskList.filter(
          (t: any) => t.assigneeId === user.id || t.createdById === user.id
        );

        const stats = {
          todo: userTasks.filter((t: any) => t.status === "todo").length,
          inProgress: userTasks.filter((t: any) => t.status === "inprogress")
            .length,
          stuck: userTasks.filter((t: any) => t.status === "stuck").length,
          done: userTasks.filter((t: any) => t.status === "completed").length,
          total: userTasks.length,
        };

        setSelectedUserTasks(userTasks);
        setSelectedUserTaskStats(stats);
      }
    } catch (err) {
      console.error("Failed to fetch user task progress:", err);
    } finally {
      setLoadingUserTasks(false);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim()) return;

    try {
      if (selectedChannel && currentUser) {
        const res = await fetch(
          `/api/channels/${selectedChannel.id}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              channelId: selectedChannel.id,
              content: messageInput,
              userId: currentUser.id,
            }),
          }
        );

        if (!res.ok) {
          const errorData = await res.json();
          setError(errorData.error || "Failed to send message");
          console.error("Send message error:", errorData);
          return;
        }

        const data = await res.json();
        setMessages([...messages, data.message]);
        setMessageInput("");
        setError("");
      } else if (selectedDMUser && currentUser) {
        const res = await fetch("/api/direct-messages/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipientId: selectedDMUser.id,
            content: messageInput,
            senderId: currentUser.id,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          setError(errorData.error || "Failed to send message");
          console.error("Send DM error:", errorData);
          return;
        }

        const data = await res.json();
        setMessages([...messages, data.message]);
        setMessageInput("");
        setError("");
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message");
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getStatusDisplay = (user: User) => {
    if (user.active) return "Online";
    if (user.lastActive) {
      const minutes = Math.floor(
        (Date.now() - new Date(user.lastActive).getTime()) / (1000 * 60)
      );
      if (minutes < 1) return "Just now";
      if (minutes < 60) return `${minutes}m ago`;
      return `${Math.floor(minutes / 60)}h ago`;
    }
    return "Offline";
  };

  const filteredChannels = channels.filter((ch) =>
    ch.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDMs = dmConversations.filter((user) =>
    `${user.firstName} ${user.lastName}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar - Channels & Conversations */}
      <div className="w-72 border-r border-gray-200 flex flex-col bg-white overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        </div>

        {/* Channels Section */}
        <div className="flex-1 overflow-y-auto">
          {/* Channels */}
          <div className="px-4 py-4">
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
              Channels
            </h3>
            <button
              onClick={() => setIsChannelModalOpen(true)}
              className="w-full mb-3 px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              + New Channel
            </button>
            <div className="space-y-2">
              {filteredChannels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => {
                    setSelectedChannel(channel);
                    setSelectedDMUser(null);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm flex items-center gap-2 ${
                    selectedChannel?.id === channel.id
                      ? "bg-gray-100"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <Users size={16} className="text-gray-400" />
                  <span className="font-medium text-gray-900">
                    {channel.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Active Conversations */}
          <div className="px-4 py-4 border-t border-gray-200">
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3 flex items-center justify-between">
              Active Conversations
              <span className="ml-auto bg-gray-200 text-gray-700 text-xs rounded-full px-2 py-0.5">
                {dmConversations.length}
              </span>
            </h3>
            <div className="space-y-2">
              {filteredDMs.map((user) => (
                <button
                  key={user.id}
                  onClick={() => {
                    setSelectedDMUser(user);
                    setSelectedChannel(null);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-3 ${
                    selectedDMUser?.id === user.id
                      ? "bg-gray-100"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    {user.profilePicture ? (
                      <img
                        src={user.profilePicture}
                        alt={user.firstName}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      `${user.firstName[0]}${user.lastName[0]}`
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.firstName} {user.lastName}
                    </p>
                  </div>
                  {user.active && (
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* (Archived conversations removed) */}
        </div>
      </div>

      {/* Center - Messages */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {selectedChannel || selectedDMUser ? (
          <>
            {/* Header */}
            <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6 bg-white">
              <div className="flex items-center gap-4">
                {selectedChannel && (
                  <>
                    <div>
                      <h2 className="font-semibold text-gray-900">
                        {selectedChannel.name}
                      </h2>
                      <p className="text-xs text-gray-500">
                        {selectedChannel.members.length} members
                      </p>
                    </div>
                  </>
                )}
                {selectedDMUser && (
                  <>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                      {selectedDMUser.profilePicture ? (
                        <img
                          src={selectedDMUser.profilePicture}
                          alt={selectedDMUser.firstName}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        `${selectedDMUser.firstName[0]}${selectedDMUser.lastName[0]}`
                      )}
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">
                        {selectedDMUser.firstName} {selectedDMUser.lastName}
                      </h2>
                      <p className="text-xs text-gray-500">
                        {getStatusDisplay(selectedDMUser)}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${
                      msg.sender.id === currentUser?.id
                        ? "flex-row-reverse"
                        : "flex-row"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                      {msg.sender.profilePicture ? (
                        <img
                          src={msg.sender.profilePicture}
                          alt={msg.sender.firstName}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        `${msg.sender.firstName[0]}${msg.sender.lastName[0]}`
                      )}
                    </div>
                    <div
                      className={
                        msg.sender.id === currentUser?.id
                          ? "text-right"
                          : "text-left"
                      }
                    >
                      {msg.sender.id !== currentUser?.id && (
                        <p className="text-xs font-semibold text-gray-600 mb-1">
                          {msg.sender.firstName}
                        </p>
                      )}
                      <div
                        className={`px-4 py-2 rounded-lg inline-block ${
                          msg.sender.id === currentUser?.id
                            ? "bg-blue-600 text-white rounded-br-none"
                            : "bg-white text-gray-900 rounded-bl-none"
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                      </div>
                      <p
                        className={`text-xs mt-1 ${
                          msg.sender.id === currentUser?.id
                            ? "text-gray-500"
                            : "text-gray-500"
                        }`}
                      >
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {msg.isEdited && " (edited)"}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 px-6 py-4 bg-white flex items-center gap-3">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Paperclip size={20} className="text-gray-600" />
              </button>
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Enter your message here"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm"
              />
              <button
                onClick={sendMessage}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                Send
                <Send size={16} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>Select a channel or conversation to start messaging</p>
          </div>
        )}
      </div>

      {/* Right Sidebar - User Profile & Stats */}
      {currentUser && (
        <div className="w-80 border-l border-gray-200 bg-white overflow-y-auto">
          {/* Selected User Profile - Only show when DM user is selected and user has permission */}
          {selectedDMUser && canViewUserTaskProgress(currentUser.role) && (
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                {selectedDMUser.firstName} {selectedDMUser.lastName}'s Profile
              </h3>
              <div className="text-center mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">
                  {selectedDMUser.profilePicture ? (
                    <img
                      src={selectedDMUser.profilePicture}
                      alt={selectedDMUser.firstName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    `${selectedDMUser.firstName[0]}${selectedDMUser.lastName[0]}`
                  )}
                </div>
                <p className="text-sm text-gray-600">{selectedDMUser.email}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedDMUser.role}
                </p>
              </div>
            </div>
          )}

          {/* Task Progress Pie Chart */}
          {selectedDMUser && canViewUserTaskProgress(currentUser.role) && (
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Task Progress
              </h3>
              {loadingUserTasks ? (
                <div className="text-center text-gray-500 text-sm">
                  Loading task data...
                </div>
              ) : selectedUserTaskStats.total === 0 ? (
                <div className="text-center text-gray-500 text-sm">
                  No tasks assigned
                </div>
              ) : (
                <>
                  <div className="flex justify-center">
                    <div className="w-32 h-32 rounded-full bg-gradient-conic from-blue-500 via-green-500 to-red-500 p-1 flex items-center justify-center">
                      <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-xs text-gray-500">Overall</p>
                          <p className="text-lg font-bold text-gray-900">
                            {selectedUserTaskStats.total > 0
                              ? Math.round(
                                  (selectedUserTaskStats.done /
                                    selectedUserTaskStats.total) *
                                    100
                                )
                              : 0}
                            %
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        Working on it
                      </span>
                      <span className="text-gray-600">
                        {selectedUserTaskStats.total > 0
                          ? Math.round(
                              (selectedUserTaskStats.inProgress /
                                selectedUserTaskStats.total) *
                                100
                            )
                          : 0}
                        % ({selectedUserTaskStats.inProgress})
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        Done
                      </span>
                      <span className="text-gray-600">
                        {selectedUserTaskStats.total > 0
                          ? Math.round(
                              (selectedUserTaskStats.done /
                                selectedUserTaskStats.total) *
                                100
                            )
                          : 0}
                        % ({selectedUserTaskStats.done})
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        Stuck
                      </span>
                      <span className="text-gray-600">
                        {selectedUserTaskStats.total > 0
                          ? Math.round(
                              (selectedUserTaskStats.stuck /
                                selectedUserTaskStats.total) *
                                100
                            )
                          : 0}
                        % ({selectedUserTaskStats.stuck})
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-gray-400" />
                        To do
                      </span>
                      <span className="text-gray-600">
                        {selectedUserTaskStats.total > 0
                          ? Math.round(
                              (selectedUserTaskStats.todo /
                                selectedUserTaskStats.total) *
                                100
                            )
                          : 0}
                        % ({selectedUserTaskStats.todo})
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Task Status Bar Chart */}
          {selectedDMUser &&
            canViewUserTaskProgress(currentUser.role) &&
            selectedUserTaskStats.total > 0 && (
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">
                  Task Status Breakdown
                </h3>
                <div className="flex justify-center gap-2">
                  {selectedUserTaskStats.todo > 0 && (
                    <div className="flex flex-col items-center">
                      <div
                        className="w-12 rounded-sm bg-gray-400"
                        style={{
                          height: `${
                            (selectedUserTaskStats.todo /
                              selectedUserTaskStats.total) *
                            80
                          }px`,
                        }}
                      />
                      <p className="text-xs text-gray-600 mt-2">To do</p>
                    </div>
                  )}
                  {selectedUserTaskStats.inProgress > 0 && (
                    <div className="flex flex-col items-center">
                      <div
                        className="w-12 rounded-sm bg-blue-500"
                        style={{
                          height: `${
                            (selectedUserTaskStats.inProgress /
                              selectedUserTaskStats.total) *
                            80
                          }px`,
                        }}
                      />
                      <p className="text-xs text-gray-600 mt-2">In Progress</p>
                    </div>
                  )}
                  {selectedUserTaskStats.stuck > 0 && (
                    <div className="flex flex-col items-center">
                      <div
                        className="w-12 rounded-sm bg-red-500"
                        style={{
                          height: `${
                            (selectedUserTaskStats.stuck /
                              selectedUserTaskStats.total) *
                            80
                          }px`,
                        }}
                      />
                      <p className="text-xs text-gray-600 mt-2">Stuck</p>
                    </div>
                  )}
                  {selectedUserTaskStats.done > 0 && (
                    <div className="flex flex-col items-center">
                      <div
                        className="w-12 rounded-sm bg-green-500"
                        style={{
                          height: `${
                            (selectedUserTaskStats.done /
                              selectedUserTaskStats.total) *
                            80
                          }px`,
                        }}
                      />
                      <p className="text-xs text-gray-600 mt-2">Done</p>
                    </div>
                  )}
                </div>
              </div>
            )}

          {/* Placeholder when no conversation selected */}
          {!selectedDMUser && (
            <div className="p-6 text-center text-gray-500 text-sm">
              <p>Open a conversation to view task progress</p>
            </div>
          )}

          {/* Permission denied message */}
          {selectedDMUser && !canViewUserTaskProgress(currentUser.role) && (
            <div className="p-6 text-center text-gray-500 text-sm">
              <p>
                You don't have permission to view this user's task progress.
              </p>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="fixed bottom-4 right-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle size={20} className="text-red-600" />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <ChannelCreationModal
        isOpen={isChannelModalOpen}
        onClose={() => setIsChannelModalOpen(false)}
        onSubmit={createChannel}
        currentUserId={currentUser?.id || 0}
      />
    </div>
  );
}
