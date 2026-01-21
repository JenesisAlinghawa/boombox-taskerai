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
import { useAuthProtection } from "@/app/hooks/useAuthProtection";
import CreateChannelModal from "@/app/components/messaging/CreateChannelModal";
import { MessageBubble } from "@/app/components/MessageBubble";
import { PageContainer } from "@/app/components/PageContainer";
import { PageContentCon } from "@/app/components/PageContentCon";
import { io, Socket } from "socket.io-client";
import {
  buildTaskGraph,
  findCriticalPath,
  findOptimalPath,
  formatPath,
  hasCircularDependencies,
  type TaskNode as DijkstraTaskNode,
} from "@/utils/dijkstra";

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

// Channel List Item Component
const ChannelListItem = React.memo(function ChannelListItem({
  channel,
  onSelect,
}: {
  channel: Channel;
  onSelect: (channel: Channel) => void;
}) {
  const [showTooltip, setShowTooltip] = React.useState(false);

  return (
    <div
      onClick={() => onSelect(channel)}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "4px 4px 4px 4px",
        cursor: "pointer",
        borderRadius: "8px",
        background: "transparent",
        position: "relative",
        width: "fit-content",
      }}
    >
      <div
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          background: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "16px",
          color: "#798CC3",
          fontWeight: "600",
          flexShrink: 0,
          position: "relative",
        }}
      >
        {channel.profilePicture ? (
          <img
            src={channel.profilePicture}
            alt={channel.name}
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              objectFit: "cover",
            }}
          />
        ) : (
          channel.name[0].toUpperCase()
        )}
      </div>
      {showTooltip && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            marginBottom: "8px",
            background: "rgba(0, 0, 0, 0.9)",
            color: "#fff",
            padding: "6px 10px 6px 10px",
            borderRadius: "6px",
            fontSize: "13px",
            fontFamily: "var(--font-inria-sans)",
            whiteSpace: "nowrap",
            zIndex: 1000,
            pointerEvents: "none",
            animation: "fadeIn 0.2s",
          }}
        >
          {channel.name}
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              borderLeft: "4px solid transparent",
              borderRight: "4px solid transparent",
              borderTop: "4px solid rgba(0, 0, 0, 0.9)",
            }}
          />
        </div>
      )}
    </div>
  );
});

// User List Item Component
const UserListItem = React.memo(function UserListItem({
  user,
  isOnline,
  onSelect,
}: {
  user: User;
  isOnline: boolean;
  onSelect: (user: User) => void;
}) {
  const [showTooltip, setShowTooltip] = React.useState(false);

  return (
    <div
      onClick={() => onSelect(user)}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "4px 4px 4px 4px",
        cursor: "pointer",
        borderRadius: "8px",
        background: "transparent",
        position: "relative",
        width: "fit-content",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "32px",
          height: "32px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "16px",
            color: "#798CC3",
            fontWeight: "600",
            position: "relative",
          }}
        >
          {user.profilePicture ? (
            <img
              src={user.profilePicture}
              alt={user.firstName}
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          ) : (
            `${user.firstName[0]}${user.lastName[0]}`
          )}
        </div>
        <div
          style={{
            position: "absolute",
            bottom: "-2px",
            right: "-2px",
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            background: isOnline ? "#10b981" : "#6b7280",
            border: "2px solid rgba(13, 27, 42, 1)",
            boxShadow: "0 0 0 1px rgba(30, 41, 59, 0.8)",
          }}
        />
      </div>
      {showTooltip && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            marginBottom: "8px",
            background: "rgba(0, 0, 0, 0.9)",
            color: "#fff",
            padding: "6px 10px 6px 10px",
            borderRadius: "6px",
            fontSize: "13px",
            fontFamily: "var(--font-inria-sans)",
            whiteSpace: "nowrap",
            zIndex: 1000,
            pointerEvents: "none",
            animation: "fadeIn 0.2s",
          }}
        >
          {user.firstName} {user.lastName}
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              borderLeft: "4px solid transparent",
              borderRight: "4px solid transparent",
              borderTop: "4px solid rgba(0, 0, 0, 0.9)",
            }}
          />
        </div>
      )}
    </div>
  );
});

export default function MessagesPage() {
  useAuthProtection(); // Protect this route
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
  const [activeUserIds, setActiveUserIds] = useState<string[]>([]);

  const canViewUserTaskProgress = (currentUserRole: string): boolean => {
    const highRoles = ["ADMIN", "MANAGER", "LEAD"];
    return highRoles.includes(currentUserRole);
  };

  // Debug: Log activeUserIds changes
  useEffect(() => {
    console.log("⚡ activeUserIds updated:", activeUserIds);
  }, [activeUserIds]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    console.log("Initializing socket connection...");
    socketRef.current = io(undefined, {
      path: "/socket.io/",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Socket.io connected");
      socket.emit("user:join", {
        userId: String(currentUser.id),
        userName: `${currentUser.firstName} ${currentUser.lastName}`,
      });
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    socket.on("users:active", (userIds: string[]) => {
      console.log("Active users received:", userIds);
      console.log("Current user ID:", String(currentUser.id));
      console.log(
        "Is current user online?",
        userIds.includes(String(currentUser.id)),
      );
      setActiveUserIds(userIds);
    });

    socket.on("message:new", (newMessage: Message) => {
      setMessages((prev) => [...prev, newMessage]);
    });

    socket.on("message:edited", (editedMessage: Message) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === editedMessage.id ? editedMessage : msg)),
      );
    });

    socket.on("message:deleted", (messageId: number) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, isDeleted: true } : msg,
        ),
      );
    });

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
              : msg,
          ),
        );
      },
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
          (msg) => msg.content.toLowerCase().includes(query) && !msg.isDeleted,
        ),
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

      // Set loading to false immediately so UI shows
      setLoading(false);

      // Fetch channels and DMs in parallel with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const [channelsRes, dmsRes] = await Promise.all([
          fetch(`/api/channels?userId=${(user as any).id}`, {
            headers: {
              "x-user-id": String((user as any).id),
            },
            signal: controller.signal,
          }),
          fetch("/api/direct-messages", {
            headers: {
              "x-user-id": String((user as any).id),
            },
            signal: controller.signal,
          }),
        ]);

        clearTimeout(timeoutId);

        if (channelsRes.ok) {
          const data = await channelsRes.json();
          setChannels(data.channels || []);
        }

        if (dmsRes.ok) {
          const data = await dmsRes.json();
          const conversations = (data.conversations || []).filter(
            (u: any) => u && u.firstName && u.lastName,
          );
          setDmConversations(conversations);
        }
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        if (fetchErr.name !== "AbortError") {
          setError("Failed to load channels and conversations");
        }
      }
    } catch (err) {
      setError("Failed to load data");
      setLoading(false);
    }
  };

  const fetchChannelMessages = async () => {
    if (!selectedChannel || !currentUser) return;
    try {
      setMessages([]);
      const res = await fetch(
        `/api/messages?channelId=${selectedChannel.id}&limit=50`,
        {
          headers: {
            "x-user-id": String(currentUser.id),
          },
        },
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
      setMessages([]);
      const res = await fetch(
        `/api/direct-messages?userId=${selectedDMUser.id}`,
        {
          headers: {
            "x-user-id": String(currentUser.id),
          },
        },
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
          (t: any) => t.assigneeId === user.id || t.createdById === user.id,
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

  const handleOptimizationQuery = async (
    query: string,
  ): Promise<string | null> => {
    const lowerQuery = query.toLowerCase();
    const optimizationKeywords = [
      "optimize",
      "shortest path",
      "critical path",
      "fastest way",
      "best sequence",
      "task sequence",
    ];

    // Check if this is an optimization query
    const isOptimizationQuery = optimizationKeywords.some((keyword) =>
      lowerQuery.includes(keyword),
    );

    if (!isOptimizationQuery || !currentUser) {
      return null;
    }

    try {
      // Fetch current user's tasks
      const tasksRes = await fetch("/api/tasks", {
        headers: {
          "x-user-id": String(currentUser.id),
        },
      });

      if (!tasksRes.ok) {
        return null;
      }

      const tasksData = await tasksRes.json();
      const tasks = Array.isArray(tasksData?.tasks) ? tasksData.tasks : [];

      if (tasks.length === 0) {
        return "📋 No tasks found to optimize.";
      }

      // Build Dijkstra graph from tasks
      const dijkstraTasks = tasks.map((task: any) => ({
        id: task.id,
        title: task.title,
        duration: task.dueDate
          ? Math.max(
              1,
              Math.ceil(
                (new Date(task.dueDate).getTime() - new Date().getTime()) /
                  (1000 * 60 * 60 * 24),
              ),
            )
          : 1,
        priority: task.priority || "medium",
        dependencies: [], // Placeholder for future dependency support
      }));

      const graph = buildTaskGraph(dijkstraTasks as DijkstraTaskNode[]);

      // Check for circular dependencies
      if (hasCircularDependencies(graph)) {
        return "⚠️ Circular dependency detected in your task graph. Please review task dependencies.";
      }

      // Calculate critical path
      const criticalResult = findCriticalPath(graph);
      const pathString = formatPath(criticalResult);

      // Generate natural language response
      const taskCount = criticalResult.path.length;
      const totalDays = criticalResult.totalDuration.toFixed(1);

      let response = `🚀 **Task Optimization Results**\n\n`;
      response += `The fastest way to complete your tasks is:\n`;
      response += `**${pathString}**\n\n`;
      response += `This critical path contains ${taskCount} task${taskCount !== 1 ? "s" : ""} and will take approximately **${totalDays} days** to complete.\n\n`;
      response += `**Detailed Sequence:**\n`;

      criticalResult.steps.forEach((step, index) => {
        response += `${index + 1}. **${step.taskName}** (${step.duration.toFixed(1)}d) - Cumulative: ${step.cumulativeDuration.toFixed(1)}d\n`;
      });

      return response;
    } catch (error) {
      console.error("Error processing optimization query:", error);
      return "❌ Failed to analyze task optimization. Please try again.";
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim()) return;

    setSendingMessage(true);
    try {
      // Check if this is an optimization query and get AI response
      const optimizationResponse = await handleOptimizationQuery(messageInput);

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
          },
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

        // If this was an optimization query, add bot response
        if (optimizationResponse) {
          setTimeout(() => {
            const botMessage = {
              id: Math.random(),
              content: optimizationResponse,
              sender: {
                id: 0,
                email: "TaskBot",
                firstName: "Task",
                lastName: "Bot",
                role: "bot",
                active: true,
              },
              createdAt: new Date().toISOString(),
              isEdited: false,
            };
            setMessages((prev) => [...prev, botMessage]);
          }, 500);
        }

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

        // If this was an optimization query, add bot response
        if (optimizationResponse) {
          setTimeout(() => {
            const botMessage = {
              id: Math.random(),
              content: optimizationResponse,
              sender: {
                id: 0,
                email: "TaskBot",
                firstName: "Task",
                lastName: "Bot",
                role: "bot",
                active: true,
              },
              createdAt: new Date().toISOString(),
              isEdited: false,
            };
            setMessages((prev) => [...prev, botMessage]);
          }, 500);
        }

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !sendingMessage) {
      e.preventDefault();
      sendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getStatusDisplay = (user: User) => {
    const isOnline = activeUserIds.includes(String(user.id));
    if (isOnline) return "Online";
    if (user.lastActive) {
      const minutes = Math.floor(
        (Date.now() - new Date(user.lastActive).getTime()) / (1000 * 60),
      );
      if (minutes < 1) return "Just now";
      if (minutes < 60) return `${minutes}m ago`;
      return `${Math.floor(minutes / 60)}h ago`;
    }
    return "Offline";
  };

  const formatMessageTime = (date: string): string => {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
      return messageDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return `Yesterday ${messageDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })}`;
    } else {
      return messageDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    }
  };

  const shouldShowTimestamp = (
    currentMsg: Message,
    currentIndex: number,
    allMessages: Message[],
  ): boolean => {
    if (currentIndex === 0) return false;

    for (let i = currentIndex - 1; i >= 0; i--) {
      if (allMessages[i].sender.id === currentMsg.sender.id) {
        const currentTime = new Date(currentMsg.createdAt).getTime();
        const prevTime = new Date(allMessages[i].createdAt).getTime();
        const gapMinutes = (currentTime - prevTime) / (1000 * 60);
        return gapMinutes >= 7;
      }
    }

    return false;
  };

  const addReaction = async (messageId: number, emoji: string) => {
    if (!currentUser || (!selectedChannel && !selectedDMUser)) return;

    try {
      const endpoint = selectedChannel
        ? `/api/channels/${selectedChannel.id}/messages/${messageId}/reactions`
        : `/api/direct-messages/${messageId}/reactions`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji, userId: currentUser.id }),
      });

      if (!res.ok) throw new Error("Failed to add reaction");

      const data = await res.json();
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? data.message : msg)),
      );
    } catch (err) {
      console.error("Error adding reaction:", err);
    }
  };

  const deleteMessage = async (messageId: number) => {
    if (!confirm("Delete this message?")) return;
    if (!currentUser || (!selectedChannel && !selectedDMUser)) return;

    try {
      const endpoint = selectedChannel
        ? `/api/channels/${selectedChannel.id}/messages/${messageId}`
        : `/api/direct-messages/${messageId}`;

      const res = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error("Failed to delete message");

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, isDeleted: true } : msg,
        ),
      );
    } catch (err) {
      console.error("Error deleting message:", err);
      alert("Failed to delete message");
    }
  };

  const editMessage = async (messageId: number, newContent: string) => {
    if (
      !newContent.trim() ||
      !currentUser ||
      (!selectedChannel && !selectedDMUser)
    )
      return;

    try {
      const endpoint = selectedChannel
        ? `/api/channels/${selectedChannel.id}/messages/${messageId}`
        : `/api/direct-messages/${messageId}`;

      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent }),
      });

      if (!res.ok) throw new Error("Failed to edit message");

      const data = await res.json();
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? data.message : msg)),
      );
    } catch (err) {
      console.error("Error editing message:", err);
      alert("Failed to edit message");
    }
  };

  const handleEditChannel = async (
    channelId: number,
    newName: string,
    newDesc: string,
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
              : ch,
          ),
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
    ch.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredDMs = dmConversations.filter((user) =>
    `${user.firstName} ${user.lastName}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase()),
  );

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
        }}
      >
        <Loader className="animate-spin" size={40} />
      </div>
    );
  }

  return (
    <PageContainer title="MESSAGES">
      <style>{`
        ::-webkit-scrollbar {
          width: 4px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        @media (max-width: 1200px) {
          #right-sidebar {
            display: none;
          }
        }
      `}</style>
      <div style={{ display: "flex", height: "100%", gap: "12px" }}>
        {/* Left Sidebar */}
        <div
          style={{
            width: "56px",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {/* Channels Container */}
          <PageContentCon
            style={{
              height: "40%",
              minHeight: "200px",
              maxHeight: "320px",
              overflow: "visible",
              display: "flex",
              flexDirection: "column",
              paddingTop: "16px",
              paddingLeft: "8px",
              paddingRight: "8px",
              paddingBottom: "16px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "12px",
              backdropFilter: "blur(4px)",
            }}
          >
            {/* Channels Section */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "16px",
                  paddingBottom: "12px",
                  borderBottom: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <h2
                  style={{
                    fontSize: "11px",
                    fontWeight: "400",
                    margin: 0,
                    color: "#fff",
                    fontFamily: "var(--font-inria-sans)",
                    letterSpacing: "0.3px",
                  }}
                >
                  Channels
                </h2>
                <button
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "rgba(255,255,255,0.6)",
                    padding: "0px 0px 0px 0px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MoreVertical size={20} />
                </button>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  overflowY: "auto",
                  overflowX: "hidden",
                  flex: 1,
                }}
              >
                {filteredChannels.map((channel) => (
                  <ChannelListItem
                    key={channel.id}
                    channel={channel}
                    onSelect={(ch) => {
                      setSelectedChannel(ch);
                      setSelectedDMUser(null);
                    }}
                  />
                ))}
              </div>
            </div>
          </PageContentCon>

          {/* Conversations Container */}
          <PageContentCon
            style={{
              flex: 1,
              minHeight: "200px",
              maxHeight: "420px",
              overflow: "visible",
              display: "flex",
              flexDirection: "column",
              paddingTop: "16px",
              paddingLeft: "8px",
              paddingRight: "8px",
              paddingBottom: "16px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "12px",
              backdropFilter: "blur(4px)",
            }}
          >
            {/* Conversation Section */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "16px",
                  paddingBottom: "12px",
                  borderBottom: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <h2
                  style={{
                    fontSize: "11px",
                    fontWeight: "400",
                    margin: 0,
                    color: "#fff",
                    fontFamily: "var(--font-inria-sans)",
                    letterSpacing: "0.3px",
                  }}
                >
                  TEAM
                </h2>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  overflowY: "auto",
                  overflowX: "hidden",
                  flex: 1,
                }}
              >
                {filteredDMs
                  .filter((u) => u && u.firstName && u.lastName)
                  .map((user) => {
                    const isOnline = activeUserIds.includes(String(user.id));
                    console.log(
                      `User ${user.firstName} (ID: ${user.id}) - Online: ${isOnline}`,
                    );
                    return (
                      <UserListItem
                        key={user.id}
                        user={user}
                        isOnline={isOnline}
                        onSelect={(u) => {
                          setSelectedDMUser(u);
                          setSelectedChannel(null);
                        }}
                      />
                    );
                  })}
              </div>
            </div>
          </PageContentCon>
        </div>

        {/* Main Chat Area */}
        <PageContentCon
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {selectedChannel || selectedDMUser ? (
            <>
              {/* Header */}
              <div
                style={{
                  paddingBottom: "16px",
                  borderBottom: "1px solid rgba(255,255,255,0.1)",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: "#798CC3",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      color: "#fff",
                      fontWeight: "600",
                    }}
                  >
                    {selectedDMUser
                      ? `${selectedDMUser.firstName[0]}${selectedDMUser.lastName[0]}`
                      : selectedChannel
                        ? selectedChannel.name[0].toUpperCase()
                        : ""}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "16px",
                        fontWeight: "400",
                        color: "#fff",
                        fontFamily: "var(--font-inria-sans)",
                      }}
                    >
                      {selectedDMUser
                        ? `${selectedDMUser.firstName} ${selectedDMUser.lastName}`
                        : selectedChannel
                          ? selectedChannel.name
                          : ""}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "rgba(255,255,255,0.6)",
                        fontFamily: "var(--font-inria-sans)",
                      }}
                    >
                      {selectedDMUser
                        ? getStatusDisplay(selectedDMUser)
                        : selectedChannel
                          ? selectedChannel.description || "No description"
                          : ""}
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "16px 20px 16px 20px",
                  marginTop: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {filteredMessages.map((msg, index) => {
                  const showTimestamp = shouldShowTimestamp(
                    msg,
                    index,
                    filteredMessages,
                  );
                  return (
                    <div key={msg.id}>
                      {showTimestamp && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "16px 0",
                            gap: "12px",
                          }}
                        >
                          <div
                            style={{
                              flex: 1,
                              height: "1px",
                              background: "rgba(255,255,255,0.1)",
                            }}
                          />
                          <p
                            style={{
                              fontSize: "11px",
                              color: "rgba(255,255,255,0.5)",
                              margin: 0,
                              fontFamily: "var(--font-inria-sans)",
                            }}
                          >
                            {formatMessageTime(msg.createdAt)}
                          </p>
                          <div
                            style={{
                              flex: 1,
                              height: "1px",
                              background: "rgba(255,255,255,0.1)",
                            }}
                          />
                        </div>
                      )}
                      <MessageBubble
                        message={msg}
                        isCurrentUser={msg.sender.id === currentUser?.id}
                        onAddReaction={(messageId, emoji) =>
                          addReaction(messageId, emoji)
                        }
                        onDelete={(messageId) => deleteMessage(messageId)}
                        onEdit={(messageId, newContent) =>
                          editMessage(messageId, newContent)
                        }
                        onReply={(messageId) => setReplyingTo(messageId)}
                        currentUserId={currentUser?.id || 0}
                      />
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div
                style={{
                  paddingTop: "16px",
                  borderTop: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {replyingTo && (
                  <div
                    style={{
                      padding: "12px 12px 12px 12px",
                      background: "rgba(255,255,255,0.05)",
                      borderRadius: "8px",
                      marginBottom: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <Reply size={16} />
                    <span
                      style={{
                        fontSize: "12px",
                        opacity: 0.7,
                        fontFamily: "var(--font-inria-sans)",
                      }}
                    >
                      Replying to message
                    </span>
                    <button
                      onClick={() => setReplyingTo(null)}
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "#fff",
                        marginLeft: "auto",
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
                <div
                  style={{ display: "flex", gap: "12px", alignItems: "center" }}
                >
                  <button
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "rgba(255,255,255,0.6)",
                      padding: "0px 0px 0px 0px",
                    }}
                  >
                    <Paperclip size={20} />
                  </button>
                  <input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    style={{
                      flex: 1,
                      padding: "12px 16px 12px 16px",
                      borderRadius: "24px",
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      color: "#fff",
                      fontSize: "14px",
                      outline: "none",
                      fontFamily: "var(--font-inria-sans)",
                    }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sendingMessage}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: sendingMessage ? "not-allowed" : "pointer",
                      color: "#fff",
                      opacity: sendingMessage ? 0.5 : 1,
                    }}
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              Select a channel or conversation
            </div>
          )}
        </PageContentCon>

        {/* Right Sidebar */}
        <div id="right-sidebar">
          <PageContentCon
            style={{
              width: "240px",
              flexShrink: 0,
              overflow: "auto",
              height: "100%",
            }}
          >
            {selectedChannel || selectedDMUser ? (
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 20,
                    padding: "16px 16px 16px 16px",
                    borderRadius: "12px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: "50%",
                      background: "#798CC3",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      color: "#fff",
                      fontWeight: "600",
                    }}
                  >
                    {selectedDMUser
                      ? `${selectedDMUser.firstName[0]}${selectedDMUser.lastName[0]}`
                      : selectedChannel
                        ? selectedChannel.name[0].toUpperCase()
                        : ""}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "16px",
                        fontWeight: "400",
                        color: "#fff",
                        fontFamily: "var(--font-inria-sans)",
                      }}
                    >
                      {selectedDMUser
                        ? `${selectedDMUser.firstName} ${selectedDMUser.lastName}`
                        : selectedChannel
                          ? selectedChannel.name
                          : ""}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "rgba(255,255,255,0.6)",
                        fontFamily: "var(--font-inria-sans)",
                      }}
                    >
                      {selectedDMUser
                        ? getStatusDisplay(selectedDMUser)
                        : selectedChannel
                          ? selectedChannel.description || "No description"
                          : ""}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <input
                    type="text"
                    placeholder="Search in chat"
                    value={messageSearch}
                    onChange={(e) => setMessageSearch(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px 8px 12px",
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#fff",
                      fontSize: "var(--font-size-subdescription)",
                      outline: "none",
                      fontFamily: "var(--font-inria-sans)",
                    }}
                  />
                </div>

                <div>
                  <h4
                    style={{
                      fontSize: "var(--font-size-description)",
                      fontWeight: "400",
                      margin: "0 0 16px 0",
                      color: "#fff",
                      fontFamily: "var(--font-inria-sans)",
                    }}
                  >
                    {selectedDMUser ? "Task Progress" : "Members"}
                  </h4>
                  {selectedDMUser ? (
                    loadingUserTasks ? (
                      <div
                        style={{
                          textAlign: "center",
                          color: "rgba(255,255,255,0.5)",
                          fontSize: "var(--font-size-subdescription)",
                          fontFamily: "var(--font-inria-sans)",
                        }}
                      >
                        Loading...
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(2, 1fr)",
                          gap: 12,
                        }}
                      >
                        {[
                          {
                            label: "To do",
                            value: selectedUserTaskStats.todo,
                            color: "#FF6B6B",
                          },
                          {
                            label: "In Progress",
                            value: selectedUserTaskStats.inProgress,
                            color: "#4ECDC4",
                          },
                          {
                            label: "Stuck",
                            value: selectedUserTaskStats.stuck,
                            color: "#FFE66D",
                          },
                          {
                            label: "Done",
                            value: selectedUserTaskStats.done,
                            color: "#95E1D3",
                          },
                        ].map((stat, i) => (
                          <div
                            key={i}
                            style={{
                              textAlign: "center",
                              padding: "12px 12px 12px 12px",
                              borderRadius: "8px",
                              background: "rgba(255,255,255,0.05)",
                              border: "1px solid rgba(255,255,255,0.1)",
                            }}
                          >
                            <div
                              style={{
                                fontSize: "24px",
                                fontWeight: "600",
                                color: stat.color,
                                fontFamily: "var(--font-inria-sans)",
                              }}
                            >
                              {stat.value}
                            </div>
                            <p
                              style={{
                                fontSize: "12px",
                                color: "rgba(255,255,255,0.7)",
                                margin: "8px 0 0 0",
                                fontFamily: "var(--font-inria-sans)",
                              }}
                            >
                              {stat.label}
                            </p>
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      {selectedChannel &&
                        selectedChannel.members
                          ?.filter(
                            (m) =>
                              m &&
                              m.user &&
                              m.user.firstName &&
                              m.user.lastName,
                          )
                          .map((m) => (
                            <div
                              key={m.user.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <div
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: "50%",
                                  background: "#798CC3",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 11,
                                  color: "#fff",
                                  fontWeight: "500",
                                }}
                              >
                                {m.user.firstName[0]}
                                {m.user.lastName[0]}
                              </div>
                              <span
                                style={{
                                  fontSize: "var(--font-size-subdescription)",
                                  color: "#fff",
                                  fontFamily: "var(--font-inria-sans)",
                                }}
                              >
                                {m.user.firstName} {m.user.lastName}
                              </span>
                            </div>
                          ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                Select a channel or conversation
              </div>
            )}
          </PageContentCon>
        </div>
      </div>

      <CreateChannelModal
        isOpen={isChannelModalOpen}
        onClose={() => setIsChannelModalOpen(false)}
        onSubmit={createChannel}
        currentUserId={currentUser?.id || 0}
      />
    </PageContainer>
  );
}
