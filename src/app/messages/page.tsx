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
  X,
  Loader,
} from "lucide-react";
import { getCurrentUser } from "@/utils/sessionManager";
import { ChannelCreationModal } from "@/components/ChannelCreationModal";
import { MessageBubble } from "@/app/components/MessageBubble";
import Chatbot from "@/app/components/ui/Chatbot";
import { io, Socket } from "socket.io-client";

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
  reactions?: Array<{ emoji: string; userId: number }>;
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
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);

  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageSearch, setMessageSearch] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

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
  const [editingChannelId, setEditingChannelId] = useState<number | null>(null);
  const [editingChannelName, setEditingChannelName] = useState("");
  const [editingChannelDesc, setEditingChannelDesc] = useState("");

  const canViewUserTaskProgress = (currentUserRole: string): boolean => {
    const highRoles = ["ADMIN", "MANAGER", "LEAD"];
    return highRoles.includes(currentUserRole);
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Initialize Socket.io connection
  useEffect(() => {
    if (!currentUser) return;

    // Connect to Socket.io server
    socketRef.current = io(undefined, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Socket.io connected");
      // Emit user identification
      socket.emit("user:join", {
        userId: currentUser.id,
        userName: `${currentUser.firstName} ${currentUser.lastName}`,
      });
    });

    // Listen for new messages from other users
    socket.on("message:new", (newMessage: Message) => {
      setMessages((prev) => [...prev, newMessage]);
    });

    // Listen for edited messages
    socket.on("message:edited", (editedMessage: Message) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === editedMessage.id ? editedMessage : msg))
      );
    });

    // Listen for deleted messages
    socket.on("message:deleted", (messageId: number) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, isDeleted: true } : msg
        )
      );
    });

    // Listen for reactions
    socket.on(
      "message:reaction",
      (data: { messageId: number; emoji: string; userId: number }) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === data.messageId
              ? {
                  ...msg,
                  reactions: [
                    ...(msg.reactions || []),
                    { emoji: data.emoji, userId: data.userId },
                  ],
                }
              : msg
          )
        );
      }
    );

    socket.on("disconnect", () => {
      console.log("Socket.io disconnected");
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUser]);

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
    } else {
      // Clear messages when nothing is selected
      setMessages([]);
    }
  }, [selectedChannel, selectedDMUser, currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, filteredMessages]);

  useEffect(() => {
    if (!messageSearch.trim()) {
      setFilteredMessages(messages);
    } else {
      const query = messageSearch.toLowerCase();
      setFilteredMessages(
        messages.filter(
          (msg) => msg.content.toLowerCase().includes(query) && !msg.isDeleted
        )
      );
    }
  }, [messages, messageSearch]);

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

  const loadInitialData = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        window.location.href = "/auth/login";
        return;
      }
      setCurrentUser(user as User);

      const channelsRes = await fetch(
        `/api/channels?userId=${(user as any).id}`,
        {
          headers: {
            "x-user-id": String((user as any).id),
          },
        }
      );
      if (channelsRes.ok) {
        const data = await channelsRes.json();
        setChannels(data.channels || []);
      }

      const dmsRes = await fetch("/api/direct-messages", {
        headers: {
          "x-user-id": String((user as any).id),
        },
      });
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
    if (!selectedChannel || !currentUser) return;
    try {
      setMessages([]); // Clear messages while loading
      const res = await fetch(
        `/api/messages?channelId=${selectedChannel.id}&limit=100`,
        {
          headers: {
            "x-user-id": String(currentUser.id),
          },
        }
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
      setMessages([]); // Clear messages while loading
      const res = await fetch(
        `/api/direct-messages?userId=${selectedDMUser.id}`,
        {
          headers: {
            "x-user-id": String(currentUser.id),
          },
        }
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
      const res = await fetch(`/api/tasks?userId=${user.id}`, {
        headers: {
          "x-user-id": String(currentUser.id),
        },
      });

      if (res.ok) {
        const data = await res.json();
        const taskList = Array.isArray(data?.tasks) ? data.tasks : [];

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

    setSendingMessage(true);
    try {
      // Send regular message (channel or DM)
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
              parentMessageId: replyingTo || undefined,
            }),
          }
        );

        if (!res.ok) {
          const errorData = await res.json();
          const errorMsg =
            errorData.details || errorData.error || "Failed to send message";
          console.error("Channel message API error:", errorMsg);
          setError(errorMsg);
          setSendingMessage(false);
          return;
        }

        const data = await res.json();
        const newMessage = data.message;
        setMessages([...messages, newMessage]);

        // Emit real-time event to other clients
        if (socketRef.current) {
          socketRef.current.emit("message:send", {
            channelId: selectedChannel.id,
            message: newMessage,
          });
        }

        setMessageInput("");
        setReplyingTo(null);
        setError("");
        setSendingMessage(false);
      } else if (selectedDMUser && currentUser) {
        const res = await fetch("/api/direct-messages/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": String(currentUser.id),
          },
          body: JSON.stringify({
            recipientId: selectedDMUser.id,
            content: messageInput,
            parentMessageId: replyingTo || undefined,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          const errorMsg =
            errorData.details || errorData.error || "Failed to send message";
          console.error("DM API error:", errorMsg);
          setError(errorMsg);
          setSendingMessage(false);
          return;
        }

        const data = await res.json();
        const newMessage = data.message;
        setMessages([...messages, newMessage]);

        // Emit real-time event
        if (socketRef.current) {
          socketRef.current.emit("message:send", {
            recipientId: selectedDMUser.id,
            message: newMessage,
          });
        }

        setMessageInput("");
        setReplyingTo(null);
        setError("");
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleEditMessage = async (messageId: number, newContent: string) => {
    if (!newContent.trim()) return;

    try {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent }),
      });

      if (!res.ok) {
        throw new Error("Failed to edit message");
      }

      const updatedMessages = messages.map((msg) =>
        msg.id === messageId
          ? { ...msg, content: newContent, isEdited: true }
          : msg
      );
      setMessages(updatedMessages);

      // Emit real-time event
      if (socketRef.current) {
        socketRef.current.emit("message:edit", {
          messageId,
          content: newContent,
        });
      }
    } catch (err) {
      console.error("Error editing message:", err);
      setError("Failed to edit message");
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    try {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete message");
      }

      const updatedMessages = messages.map((msg) =>
        msg.id === messageId ? { ...msg, isDeleted: true } : msg
      );
      setMessages(updatedMessages);

      // Emit real-time event
      if (socketRef.current) {
        socketRef.current.emit("message:delete", { messageId });
      }
    } catch (err) {
      console.error("Error deleting message:", err);
      setError("Failed to delete message");
    }
  };

  const handleAddReaction = async (messageId: number, emoji: string) => {
    if (!currentUser) return;

    try {
      const res = await fetch(`/api/messages/${messageId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction: emoji }),
      });

      if (!res.ok) {
        throw new Error("Failed to add reaction");
      }

      const updatedMessages = messages.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              reactions: [
                ...(msg.reactions || []),
                { emoji, userId: currentUser.id },
              ],
            }
          : msg
      );
      setMessages(updatedMessages);

      // Emit real-time event
      if (socketRef.current) {
        socketRef.current.emit("message:reaction", {
          messageId,
          emoji,
        });
      }
    } catch (err) {
      console.error("Error adding reaction:", err);
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

  const handleEditChannel = async (
    channelId: number,
    newName: string,
    newDesc: string
  ) => {
    if (!newName.trim()) return;
    try {
      const res = await fetch(`/api/channels/${channelId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(currentUser?.id),
        },
        body: JSON.stringify({ name: newName, description: newDesc }),
      });
      if (res.ok) {
        setChannels(
          channels.map((ch) =>
            ch.id === channelId
              ? { ...ch, name: newName, description: newDesc }
              : ch
          )
        );
        if (selectedChannel?.id === channelId) {
          setSelectedChannel({
            ...selectedChannel,
            name: newName,
            description: newDesc,
          });
        }
        setEditingChannelId(null);
      }
    } catch (err) {
      console.error("Error editing channel:", err);
    }
  };

  const handleDeleteChannel = async (channelId: number) => {
    if (!confirm("Are you sure you want to delete this channel?")) return;
    try {
      const res = await fetch(`/api/channels/${channelId}`, {
        method: "DELETE",
        headers: {
          "x-user-id": String(currentUser?.id),
        },
      });
      if (res.ok) {
        setChannels(channels.filter((ch) => ch.id !== channelId));
        setSelectedChannel(null);
        setMessages([]);
      }
    } catch (err) {
      console.error("Error deleting channel:", err);
    }
  };

  const filteredChannels = channels.filter((ch) =>
    ch.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDMs = dmConversations.filter((user) =>
    `${user.firstName} ${user.lastName}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const getReplyingToMessage = (): Message | undefined => {
    return messages.find((msg) => msg.id === replyingTo);
  };

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

        {/* Search Bar */}
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm"
            />
          </div>
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
                      setMessageSearch("");
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
                      setMessageSearch("");
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

              {/* Channel Edit/Delete Buttons */}
              {selectedChannel &&
                currentUser?.id === selectedChannel.creatorId && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingChannelId(selectedChannel.id);
                        setEditingChannelName(selectedChannel.name);
                        setEditingChannelDesc(
                          selectedChannel.description || ""
                        );
                      }}
                      className="p-2 text-gray-600 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Edit channel"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteChannel(selectedChannel.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      title="Delete channel"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
            </div>

            {/* Channel Edit Modal */}
            {editingChannelId === selectedChannel?.id && (
              <div className="px-6 py-3 bg-blue-50 border-b border-blue-200 flex gap-2 items-center">
                <input
                  type="text"
                  value={editingChannelName}
                  onChange={(e) => setEditingChannelName(e.target.value)}
                  placeholder="Channel name"
                  className="flex-1 px-3 py-1.5 border border-blue-300 rounded text-sm focus:ring-2 focus:ring-blue-600"
                />
                <input
                  type="text"
                  value={editingChannelDesc}
                  onChange={(e) => setEditingChannelDesc(e.target.value)}
                  placeholder="Description"
                  className="flex-1 px-3 py-1.5 border border-blue-300 rounded text-sm focus:ring-2 focus:ring-blue-600"
                />
                <button
                  onClick={() =>
                    handleEditChannel(
                      selectedChannel!.id,
                      editingChannelName,
                      editingChannelDesc
                    )
                  }
                  className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingChannelId(null)}
                  className="px-3 py-1.5 bg-gray-300 text-gray-800 rounded text-sm hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Message Search Bar */}
            <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-3 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={messageSearch}
                  onChange={(e) => setMessageSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Messages Container - Using flex-col-reverse for scroll-to-bottom */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50 flex flex-col-reverse"
            >
              <div ref={messagesEndRef} />
              {filteredMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-500 text-center">
                    <p className="text-lg font-medium mb-2">
                      {messageSearch
                        ? "No messages match your search"
                        : "No messages yet"}
                    </p>
                    <p className="text-sm">Start the conversation!</p>
                  </div>
                </div>
              ) : (
                [...filteredMessages].reverse().map((msg) => (
                  <div key={msg.id}>
                    {msg.parentMessageId && (
                      <div className="text-xs text-gray-600 italic mb-2 px-3">
                        <Reply size={12} className="inline mr-1" />
                        {messages
                          .find((m) => m.id === msg.parentMessageId)
                          ?.content.slice(0, 40)}
                        ...
                      </div>
                    )}
                    <MessageBubble
                      message={msg}
                      isCurrentUser={msg.sender.id === currentUser?.id}
                      onEdit={handleEditMessage}
                      onDelete={handleDeleteMessage}
                      onReply={(msgId: number) => setReplyingTo(msgId)}
                      onAddReaction={handleAddReaction}
                      currentUserId={currentUser?.id || 0}
                    />
                  </div>
                ))
              )}
            </div>

            {/* Reply Context */}
            {replyingTo && getReplyingToMessage() && (
              <div className="px-6 py-3 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Reply size={16} className="text-blue-600" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-700">
                      Replying to {getReplyingToMessage()?.sender.firstName}
                    </p>
                    <p className="text-sm text-gray-600 truncate">
                      {getReplyingToMessage()?.content}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="p-1 hover:bg-blue-100 rounded transition-colors"
                >
                  <X size={16} className="text-gray-600" />
                </button>
              </div>
            )}

            {/* Message Input */}
            <div className="border-t border-gray-300 px-6 py-4 bg-white flex items-end gap-3 shadow-sm rounded-b-xl">
              <button className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors text-gray-600 flex-shrink-0">
                <Paperclip size={20} />
              </button>
              <textarea
                value={messageInput}
                onChange={(e) => {
                  setMessageInput(e.target.value);
                  // Auto-grow textarea height based on content
                  e.target.style.height = "auto";
                  const newHeight = Math.min(e.target.scrollHeight, 150);
                  e.target.style.height = newHeight + "px";
                }}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Type your message..."
                disabled={sendingMessage}
                rows={1}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm text-gray-900 placeholder-gray-500 disabled:opacity-50 resize-none overflow-hidden"
              />
              <button
                onClick={sendMessage}
                disabled={sendingMessage || !messageInput.trim()}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all text-sm font-medium flex items-center gap-2 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingMessage ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Sending
                  </>
                ) : (
                  <>
                    Send
                    <Send size={16} />
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-600 text-center">
              <p className="text-lg font-medium mb-2">Select a conversation</p>
              <p className="text-sm text-gray-500">
                Choose a channel or direct message to start
              </p>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT SIDEBAR - Conversation/Channel Profile */}
      {(selectedChannel || selectedDMUser) && currentUser && (
        <div className="w-80 bg-white border border-gray-300 rounded-xl flex flex-col shadow-lg overflow-hidden">
          {/* Profile Section */}
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

          {/* Task Progress */}
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

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 shadow-lg z-50">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Channel Creation Modal */}
      <ChannelCreationModal
        isOpen={isChannelModalOpen}
        onClose={() => setIsChannelModalOpen(false)}
        onSubmit={createChannel}
        currentUserId={currentUser?.id || 0}
      />

      {/* TaskerBot Chatbot */}
      <Chatbot
        teamMembers={dmConversations.map((user) => ({
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
        }))}
      />
    </div>
  );
}
