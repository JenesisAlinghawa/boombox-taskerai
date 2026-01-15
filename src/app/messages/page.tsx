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
  MapPin,
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
    <div className="flex h-screen bg-gray-100 gap-4 p-4">
      {/* LEFT SIDEBAR - Channels & Conversations */}
      <div className="w-72 bg-white border border-gray-300 rounded-xl flex flex-col shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Channels Section */}
          <div className="p-4 space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-widest mb-3 px-2">
                Channels
              </h3>
              <button
                onClick={() => setIsChannelModalOpen(true)}
                className="w-full mb-3 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-medium text-sm shadow-sm hover:shadow-md"
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
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm flex items-center gap-2 font-medium ${
                      selectedChannel?.id === channel.id
                        ? "bg-blue-100 text-blue-900 border border-blue-300"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Users size={16} />
                    {channel.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gray-200" />

            {/* Active Conversations */}
            <div>
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-widest mb-3 px-2 flex items-center justify-between">
                Conversations
                <span className="ml-auto bg-gray-200 text-gray-700 text-xs rounded-full px-2 py-0.5 font-normal">
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
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-all flex items-center gap-3 ${
                      selectedDMUser?.id === user.id
                        ? "bg-blue-100 border border-blue-300"
                        : "hover:bg-gray-100"
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
                      <p className="text-xs text-gray-500 truncate">
                        {getStatusDisplay(user)}
                      </p>
                    </div>
                    {user.active && (
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER - Chat Area */}
      <div className="flex-1 bg-white border border-gray-300 rounded-xl flex flex-col shadow-lg overflow-hidden">
        {selectedChannel || selectedDMUser ? (
          <>
            {/* Chat Header */}
            <div className="h-20 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-300 flex items-center justify-between px-6 shadow-sm">
              <div className="flex items-center gap-4">
                {selectedChannel && (
                  <div>
                    <h2 className="font-bold text-gray-900 text-lg">
                      # {selectedChannel.name}
                    </h2>
                    <p className="text-xs text-gray-600">
                      {selectedChannel.members.length} members
                    </p>
                  </div>
                )}
                {selectedDMUser && (
                  <>
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-sm shadow-md">
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
                      <h2 className="font-bold text-gray-900 text-lg">
                        {selectedDMUser.firstName} {selectedDMUser.lastName}
                      </h2>
                      <p className="text-xs text-gray-600">
                        {getStatusDisplay(selectedDMUser)}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500 text-center">
                    <p className="text-lg font-medium mb-2">No messages yet</p>
                    <p className="text-sm">Start the conversation!</p>
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${
                      msg.sender.id === currentUser?.id
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    {msg.sender.id !== currentUser?.id && (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 shadow-sm">
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
                    )}
                    <div
                      className={`max-w-xs ${
                        msg.sender.id === currentUser?.id
                          ? "items-end"
                          : "items-start"
                      } flex flex-col`}
                    >
                      {msg.sender.id !== currentUser?.id && (
                        <p className="text-xs font-semibold text-gray-700 mb-1 px-3">
                          {msg.sender.firstName}
                        </p>
                      )}
                      <div
                        className={`px-4 py-2.5 rounded-2xl shadow-sm border ${
                          msg.sender.id === currentUser?.id
                            ? "bg-blue-600 text-white rounded-br-none border-blue-600"
                            : "bg-white text-gray-900 rounded-bl-none border-gray-200"
                        }`}
                      >
                        <p className="text-sm font-medium break-words">
                          {msg.content}
                        </p>
                      </div>
                      <p
                        className={`text-xs mt-1.5 px-3 ${
                          msg.sender.id === currentUser?.id
                            ? "text-gray-600"
                            : "text-gray-600"
                        }`}
                      >
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {msg.isEdited && " (edited)"}
                      </p>
                    </div>
                    {msg.sender.id === currentUser?.id && (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 shadow-sm">
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
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="border-t border-gray-300 px-6 py-4 bg-white flex items-center gap-3 shadow-sm rounded-b-xl">
              <button className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors text-gray-600">
                <Paperclip size={20} />
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
                placeholder="Type your message..."
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm text-gray-900 placeholder-gray-500"
              />
              <button
                onClick={sendMessage}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all text-sm font-medium flex items-center gap-2 shadow-sm hover:shadow-md"
              >
                Send
                <Send size={16} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-600 text-center">
              <p className="text-lg font-medium mb-2">Select a conversation</p>
              <p className="text-sm text-gray-500">
                Choose a channel or direct message to start
              </p>
            </p>
          </div>
        )}
      </div>

      {/* RIGHT SIDEBAR - Conversation/Channel Profile & Stats */}
      {(selectedChannel || selectedDMUser) && currentUser && (
        <div className="w-80 bg-white border border-gray-300 rounded-xl flex flex-col shadow-lg overflow-hidden">
          {/* Selected User/Channel Profile */}
          <div className="p-6 border-b border-gray-300 bg-gradient-to-b from-blue-50 to-white">
            <h3 className="text-sm font-bold text-gray-900 mb-6">
              {selectedDMUser ? "User Profile" : "Channel Info"}
            </h3>
            <div className="text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4 shadow-lg border-4 border-white">
                {selectedDMUser ? (
                  selectedDMUser.profilePicture ? (
                    <img
                      src={selectedDMUser.profilePicture}
                      alt={selectedDMUser.firstName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    `${selectedDMUser.firstName[0]}${selectedDMUser.lastName[0]}`
                  )
                ) : selectedChannel?.profilePicture ? (
                  <img
                    src={selectedChannel.profilePicture}
                    alt={selectedChannel.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <Users size={40} />
                )}
              </div>
              {selectedDMUser ? (
                <>
                  <p className="text-lg font-bold text-gray-900">
                    {selectedDMUser.firstName} {selectedDMUser.lastName}
                  </p>
                  <p className="text-sm text-gray-600 capitalize mt-1">
                    {selectedDMUser.role}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {selectedDMUser.email}
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <span
                      className={`w-3 h-3 rounded-full ${
                        selectedDMUser.active ? "bg-green-500" : "bg-gray-400"
                      }`}
                    />
                    <span className="text-xs font-medium text-gray-700">
                      {getStatusDisplay(selectedDMUser)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-lg font-bold text-gray-900">
                    {selectedChannel?.name}
                  </p>
                  <p className="text-xs text-gray-600 mt-3 flex items-center justify-center gap-2">
                    <Users size={14} />
                    {selectedChannel?.members.length || 0} members
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {selectedChannel?.description || "No description"}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Task Progress - Only show for DM with permission */}
          {selectedDMUser && canViewUserTaskProgress(currentUser.role) && (
            <div className="p-6 border-b border-gray-300 bg-white overflow-y-auto flex-1">
              <h3 className="text-sm font-bold text-gray-900 mb-6">
                Task Progress
              </h3>
              {loadingUserTasks ? (
                <div className="text-center text-gray-600 text-sm py-8">
                  <p className="text-gray-500">Loading task data...</p>
                </div>
              ) : selectedUserTaskStats.total === 0 ? (
                <div className="text-center text-gray-600 text-sm py-8">
                  <p className="text-gray-500">No tasks assigned</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-center mb-6">
                    <div className="w-32 h-32 rounded-full bg-gradient-conic from-blue-500 via-green-500 to-red-500 p-1.5 flex items-center justify-center shadow-lg">
                      <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-xs text-gray-600 font-medium">
                            Overall
                          </p>
                          <p className="text-2xl font-bold text-gray-900">
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
                  <div className="space-y-3">
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm font-medium text-gray-900">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                          Working on it
                        </span>
                        <span className="text-sm font-bold text-blue-600">
                          {selectedUserTaskStats.inProgress}
                        </span>
                      </div>
                      <div className="mt-2 w-full bg-gray-300 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{
                            width: `${
                              selectedUserTaskStats.total > 0
                                ? Math.round(
                                    (selectedUserTaskStats.inProgress /
                                      selectedUserTaskStats.total) *
                                      100
                                  )
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm font-medium text-gray-900">
                          <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                          Done
                        </span>
                        <span className="text-sm font-bold text-green-600">
                          {selectedUserTaskStats.done}
                        </span>
                      </div>
                      <div className="mt-2 w-full bg-gray-300 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{
                            width: `${
                              selectedUserTaskStats.total > 0
                                ? Math.round(
                                    (selectedUserTaskStats.done /
                                      selectedUserTaskStats.total) *
                                      100
                                  )
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <p className="text-xs font-medium text-gray-700">
                        Total Tasks:{" "}
                        <span className="font-bold text-gray-900">
                          {selectedUserTaskStats.total}
                        </span>
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
