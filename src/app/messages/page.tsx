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
  MoreVertical,
  MessageCirclePlus,
} from "lucide-react";
import { getCurrentUser } from "@/utils/sessionManager";
import { useAuthProtection } from "@/app/hooks/useAuthProtection";
import CreateChannelModal from "@/app/components/messaging-components/CreateNewChannelModalComponent";
import { MessageBubble } from "@/app/components/messaging-components/ChatMessageBubbleDisplayComponent";
import { PageContainer } from "@/app/components/page-layouts/MainPageContainerLayoutComponent";
import { PageContentCon } from "@/app/components/page-layouts/PageContentWrapperContainerComponent";
import { io, Socket } from "socket.io-client";
import {
  buildTaskGraph,
  findCriticalPath,
  findOptimalPath,
  formatPath,
  hasCircularDependencies,
  type TaskNode as DijkstraTaskNode,
} from "@/utils/dijkstra";

interface Employee {
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
  members: Array<{ user: Employee }>;
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
  _count?: {
    replies: number;
  };
  createdAt: string;
  sender: Employee;
}

type ViewType = "channels" | "dms";

// Channel List Item Component
const ChannelListItem = React.memo(function ChannelListItem({
  channel,
  onSelect,
  unreadCount,
  isActive = false,
}: {
  channel: Channel;
  onSelect: (channel: Channel) => void;
  unreadCount?: number;
  isActive?: boolean;
}) {
  return (
    <div
      onClick={() => onSelect(channel)}
      className={`flex items-center p-1 rounded-sm cursor-pointer w-full transition-colors border-l-4 ${
        isActive ? "border-blue-400 bg-blue-200" : "border-transparent"
      } hover:border-black/50 hover:bg-blue-50`}
    >
      <div className="relative w-8 h-8 rounded-full bg-white flex items-center justify-center text-[16px] text-gray-400 font-semibold overflow-hidden border border-black/10">
        {channel.profilePicture ? (
          <img
            src={channel.profilePicture}
            alt={channel.name}
            className="w-full h-full rounded-full object-cover object-center"
          />
        ) : (
          channel.name[0].toUpperCase()
        )}

        {unreadCount && unreadCount > 0 && (
          <div
            className="absolute -bottom-1 -right-1 h-3 min-w-[14px] rounded-full bg-red-500 text-white text-[7px] font-extrabold flex items-center justify-center px-1"
            style={{ fontFamily: "var(--font-inria-sans)" }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </div>
        )}
      </div>
      <span className="ml-2 text-black/80 text-sm truncate whitespace-nowrap hidden sm:block">
        {channel.name}
      </span>
    </div>
  );
});

// User List Item Component
const UserListItem = React.memo(function UserListItem({
  employee,
  isOnline,
  onSelect,
  isActive = false,
}: {
  employee: Employee;
  isOnline: boolean;
  onSelect: (employee: Employee) => void;
  isActive?: boolean;
}) {
  return (
    <div
      onClick={() => onSelect(employee)}
      className={`flex items-center p-1 rounded-sm cursor-pointer w-full transition-colors border-l-4 ${
        isActive ? "border-blue-400 bg-blue-200" : "border-transparent"
      } hover:border-black/50 hover:bg-blue-50`}
    >
      <div className="relative w-8 h-8 flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[16px] text-gray-400 font-semibold overflow-hidden border border-black/10">
          {employee.profilePicture ? (
            <img
              src={employee.profilePicture}
              alt={employee.firstName}
              className="w-full h-full rounded-full object-cover object-center"
            />
          ) : (
            `${employee.firstName[0]}${employee.lastName[0]}`
          )}
        </div>
        <div
          className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 ${isOnline ? "bg-emerald-500" : "bg-gray-500"} border-blue-100`}
        />
      </div>
      <span className="ml-2 text-black/80 text-sm truncate whitespace-nowrap hidden sm:block">
        {employee.firstName} {employee.lastName}
      </span>
    </div>
  );
});

export default function MessagesPage() {
  useAuthProtection(); // Protect this route
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [activeView, setActiveView] = useState<ViewType>("channels");
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [selectedDMUser, setSelectedDMUser] = useState<Employee | null>(null);

  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelUnreadCounts, setChannelUnreadCounts] = useState<
    Record<number, number>
  >({});
  const [dmConversations, setDmConversations] = useState<Employee[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);

  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageSearch, setMessageSearch] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const canViewUserTaskProgress = (currentEmployeeRole: string): boolean => {
    const highRoles = ["ADMIN", "MANAGER", "LEAD"];
    return highRoles.includes(currentEmployeeRole);
  };

  // Debug: Log activeUserIds changes
  useEffect(() => {
    console.log("⚡ activeUserIds updated:", activeUserIds);
  }, [activeUserIds]);

  useEffect(() => {
    loadInitialData();
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

  // Fetch channel unread counts periodically
  useEffect(() => {
    if (!currentEmployee) return;

    const fetchChannelUnreadCounts = async () => {
      try {
        const res = await fetch("/api/channel-management/unread", {
          headers: {
            "x-user-id": String(currentEmployee.id),
          },
        });

        if (res.ok) {
          const data = await res.json();
          setChannelUnreadCounts(data.unreadCounts || {});
        }
      } catch (err) {
        console.error("Failed to fetch channel unread counts:", err);
      }
    };

    fetchChannelUnreadCounts();
    const interval = setInterval(fetchChannelUnreadCounts, 3000);

    return () => clearInterval(interval);
  }, [currentEmployee]);

  useEffect(() => {
    if (!currentEmployee) return;

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
        userId: String(currentEmployee.id),
        userName: `${currentEmployee.firstName} ${currentEmployee.lastName}`,
      });
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    socket.on("users:active", (userIds: string[]) => {
      console.log("Active users received:", userIds);
      console.log("Current user ID:", String(currentEmployee.id));
      console.log(
        "Is current user online?",
        userIds.includes(String(currentEmployee.id)),
      );
      setActiveUserIds(userIds);
    });

    socket.on("message:new", (newMessage: Message) => {
      setMessages((prev) => [...prev, newMessage]);

      // Mark message as read if it's from the currently open DM user
      if (
        selectedDMUser &&
        newMessage.sender.id === selectedDMUser.id &&
        currentEmployee
      ) {
        fetch("/api/direct-messaging-endpoints/mark-as-read", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": String(currentEmployee.id),
          },
          body: JSON.stringify({ senderId: selectedDMUser.id }),
        }).catch((err) => console.error("Failed to mark as read:", err));
      }
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
  }, [currentEmployee]);

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

      // Subscribe to this specific channel room for real-time messages
      if (currentEmployee && socketRef.current) {
        socketRef.current.emit("channel:join", {
          userId: currentEmployee.id,
          channelId: selectedChannel.id,
        });
      }

      // Poll for new messages every 2 seconds when viewing channels
      const pollInterval = setInterval(fetchChannelMessages, 2000);

      return () => clearInterval(pollInterval);
    } else if (selectedDMUser) {
      fetchDMMessages();

      // Subscribe to this specific DM room for real-time messages
      if (currentEmployee && socketRef.current) {
        socketRef.current.emit("dm:join", {
          userId: currentEmployee.id,
          otherUserId: selectedDMUser.id,
        });
      }

      // Poll for new messages every 2 seconds when viewing DMs
      const pollInterval = setInterval(fetchDMMessages, 2000);

      if (currentEmployee && selectedDMUser) {
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

      return () => clearInterval(pollInterval);
    } else {
      setMessages([]);
    }
  }, [selectedChannel, selectedDMUser, currentEmployee]);

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
    if (!currentEmployee) return;

    try {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("description", data.description);
      formData.append("memberIds", JSON.stringify(data.memberIds));
      if (data.profilePictureFile) {
        formData.append("profilePicture", data.profilePictureFile);
      }

      const res = await fetch("/api/channel-management", {
        method: "POST",
        headers: {
          "x-user-id": String(currentEmployee.id),
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

      setCurrentEmployee(user as Employee);

      // Set loading to false immediately so UI shows
      setLoading(false);

      // Fetch channels and DMs in parallel with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const [channelsRes, dmsRes] = await Promise.all([
          fetch(`/api/channel-management?userId=${(user as any).id}`, {
            headers: {
              "x-user-id": String((user as any).id),
            },
            signal: controller.signal,
          }),
          fetch("/api/direct-messaging-endpoints", {
            headers: {
              "x-user-id": String((user as any).id),
            },
            signal: controller.signal,
          }),
        ]);

        clearTimeout(timeoutId);

        if (channelsRes.ok) {
          const data = await channelsRes.json();
          console.log("[Messages] Channels API response:", data);
          console.log(
            "[Messages] Channels loaded:",
            data.channels?.length || 0,
          );
          setChannels(data.channels || []);
        } else {
          const errText = await channelsRes.text();
          console.error(
            "[Messages] Failed to load channels:",
            channelsRes.status,
            errText,
          );
        }

        if (dmsRes.ok) {
          const data = await dmsRes.json();
          console.log("[Messages] DM API response:", data);
          const conversations = (data.conversations || []).filter(
            (u: any) => u && u.firstName && u.lastName,
          );
          console.log(
            "[Messages] DM conversations loaded:",
            conversations.length,
          );
          setDmConversations(conversations);
        } else {
          const errText = await dmsRes.text();
          console.error(
            "[Messages] Failed to load DMs:",
            dmsRes.status,
            errText,
          );
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
    if (!selectedChannel || !currentEmployee) return;
    try {
      console.log(
        `[Messages] Fetching messages for channel ${selectedChannel.id}...`,
      );
      const res = await fetch(
        `/api/message-endpoints?channelId=${selectedChannel.id}&limit=50`,
        {
          headers: {
            "x-user-id": String(currentEmployee.id),
          },
        },
      );

      if (!res.ok) {
        console.error(`[Messages] API error: ${res.status} ${res.statusText}`);
        const error = await res.json().catch(() => ({}));
        console.error("[Messages] Error details:", error);
        setError(`Failed to fetch messages: ${error?.error || res.statusText}`);
        return;
      }

      const data = await res.json();
      const newMessages = data.messages || [];
      console.log(`[Messages] Received ${newMessages.length} messages`);

      // Only update if messages actually changed (avoid re-renders)
      setMessages((prev) => {
        const prevIds = new Set(prev.map((m: Message) => m.id));
        const newIds = new Set(newMessages.map((m: Message) => m.id));

        // If message count changed or IDs changed, update
        if (
          prev.length !== newMessages.length ||
          ![...prevIds].every((id) => newIds.has(id))
        ) {
          return newMessages;
        }
        return prev;
      });

      // Mark messages in this channel as read in the database
      try {
        await fetch(
          `/api/channel-management/${selectedChannel.id}/mark-as-read`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-user-id": String(currentEmployee.id),
            },
          },
        );
        // Clear the unread count for this channel
        setChannelUnreadCounts((prev) => ({
          ...prev,
          [selectedChannel.id]: 0,
        }));
        console.log(
          "[Messages] Marked messages as read in channel:",
          selectedChannel.id,
        );
      } catch (markErr) {
        console.error(
          "[Messages] Failed to mark channel messages as read:",
          markErr,
        );
      }
    } catch (err) {
      console.error("[Messages] Error fetching channel messages:", err);
      setError(
        `Failed to fetch messages: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  };

  const fetchDMMessages = async () => {
    if (!selectedDMUser || !currentEmployee) return;
    try {
      console.log(
        `[Messages] Fetching DM messages with user ${selectedDMUser.id}...`,
      );
      const res = await fetch(
        `/api/direct-messaging-endpoints/${selectedDMUser.id}?userId=${currentEmployee.id}`,
        {
          headers: {
            "x-user-id": String(currentEmployee.id),
          },
        },
      );

      if (!res.ok) {
        console.error(`[Messages] API error: ${res.status} ${res.statusText}`);
        const error = await res.json().catch(() => ({}));
        console.error("[Messages] Error details:", error);
        setError(`Failed to fetch messages: ${error?.error || res.statusText}`);
        return;
      }

      const data = await res.json();
      const newMessages = data.messages || [];
      console.log(`[Messages] Received ${newMessages.length} DM messages`);

      // Only update if messages actually changed (avoid re-renders)
      setMessages((prev) => {
        const prevIds = new Set(prev.map((m: Message) => m.id));
        const newIds = new Set(newMessages.map((m: Message) => m.id));

        // If message count changed or IDs changed, update
        if (
          prev.length !== newMessages.length ||
          ![...prevIds].every((id) => newIds.has(id))
        ) {
          return newMessages;
        }
        return prev;
      });

      // Mark messages from this sender as read in the database
      try {
        await fetch("/api/direct-messaging-endpoints/mark-as-read", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": String(currentEmployee.id),
          },
          body: JSON.stringify({ senderId: selectedDMUser.id }),
        });
        console.log(
          "[Messages] Marked messages as read from user:",
          selectedDMUser.id,
        );
      } catch (markErr) {
        console.error("[Messages] Failed to mark messages as read:", markErr);
      }
    } catch (err) {
      console.error("[Messages] Error fetching DM messages:", err);
      setError(
        `Failed to fetch messages: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  };

  const fetchUserTaskProgress = async (employee: Employee) => {
    if (!currentEmployee) {
      return;
    }

    setLoadingUserTasks(true);
    try {
      console.log("[Messages] Fetching task progress for user:", employee.id);
      const res = await fetch(`/api/task-management?userId=${employee.id}`, {
        headers: {
          "x-user-id": String(currentEmployee.id),
        },
      });

      if (!res.ok) {
        console.error("[Messages] Task API error:", res.status);
        return;
      }

      const data = await res.json();
      const taskList = Array.isArray(data?.tasks) ? data.tasks : [];
      console.log("[Messages] Tasks received:", taskList.length);

      const userTasks = taskList.filter(
        (t: any) =>
          t.assigneeId === employee.id || t.createdById === employee.id,
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
      console.log("[Messages] Task stats updated:", stats);
    } catch (err) {
      console.error("Failed to fetch user task progress:", err);
    } finally {
      setLoadingUserTasks(false);
    }
  };

  const handleChannelPicChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChannel || !currentEmployee) return;

    try {
      const form = new FormData();
      form.append("file", file);
      const uploadRes = await fetch("/api/file-upload-handlers", {
        method: "POST",
        body: form,
      });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const { url } = await uploadRes.json();

      const updateRes = await fetch(
        `/api/channel-management/${selectedChannel.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": String(currentEmployee.id),
          },
          body: JSON.stringify({ profilePicture: url }),
        },
      );
      if (!updateRes.ok) throw new Error("Channel update failed");

      // update local state
      const updated = await updateRes.json();
      setSelectedChannel((prev) =>
        prev ? { ...prev, profilePicture: updated.profilePicture } : prev,
      );
      setChannels((prev) =>
        prev.map((c) =>
          c.id === selectedChannel.id
            ? { ...c, profilePicture: updated.profilePicture }
            : c,
        ),
      );
    } catch (err) {
      console.error("Failed to change channel picture:", err);
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

    if (!isOptimizationQuery || !currentEmployee) {
      return null;
    }

    try {
      // Fetch current user's tasks
      const tasksRes = await fetch("/api/task-management", {
        headers: {
          "x-user-id": String(currentEmployee.id),
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

  const handleAttachmentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setAttachmentFile(e.target.files[0]);
    }
  };

  const uploadAttachment = async () => {
    if (!attachmentFile) return;

    setUploadingAttachment(true);
    try {
      const formData = new FormData();
      formData.append("file", attachmentFile);

      const res = await fetch("/api/file-upload-handlers", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to upload attachment");

      const data = await res.json();
      return data.url;
    } catch (err) {
      console.error("Error uploading attachment:", err);
      alert("Failed to upload attachment");
      return null;
    } finally {
      setUploadingAttachment(false);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() && !attachmentFile) return;

    setSendingMessage(true);
    try {
      // Upload attachment if present
      let attachmentUrl: string | null = null;
      if (attachmentFile) {
        attachmentUrl = await uploadAttachment();
      }

      // Check if this is an optimization query and get AI response
      const optimizationResponse = await handleOptimizationQuery(messageInput);

      if (selectedChannel && currentEmployee) {
        const res = await fetch(
          `/api/channel-management/${selectedChannel.id}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              channelId: selectedChannel.id,
              content: messageInput,
              userId: currentEmployee.id,
              attachments: attachmentUrl ? [attachmentUrl] : [],
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
        // Ensure the message has the current user's full profile including picture
        newMessage.sender = currentEmployee;
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
        setAttachmentFile(null);
        setReplyingTo(null);
        setError("");
        setSendingMessage(false);
      } else if (selectedDMUser && currentEmployee) {
        const res = await fetch("/api/direct-messaging-endpoints/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": String(currentEmployee.id),
          },
          body: JSON.stringify({
            recipientId: selectedDMUser.id,
            content: messageInput,
            attachments: attachmentUrl ? [attachmentUrl] : [],
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
        // Ensure the message has the current user's full profile including picture
        newMessage.sender = currentEmployee;
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
        setAttachmentFile(null);
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

  const getStatusDisplay = (employee: Employee) => {
    const isOnline = activeUserIds.includes(String(employee.id));
    if (isOnline) return "Online";
    if (employee.lastActive) {
      const minutes = Math.floor(
        (Date.now() - new Date(employee.lastActive).getTime()) / (1000 * 60),
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

  // track messages that are currently being reacted to to prevent spam
  const [reactingIds, setReactingIds] = useState<Set<number>>(new Set());

  const addReaction = async (messageId: number, emoji: string) => {
    if (!currentEmployee || (!selectedChannel && !selectedDMUser)) return;

    // do not fire another request while one is in progress for this message
    if (reactingIds.has(messageId)) return;

    // if user already reacted with the same emoji, don't send another request
    const existing = messages
      .find((m) => m.id === messageId)
      ?.reactions?.some(
        (r) => r.emoji === emoji && r.userId === currentEmployee.id,
      );
    if (existing) {
      // already reacted; nothing to do (we no longer toggle off)
      return;
    }

    setReactingIds((prev) => new Set(prev).add(messageId));

    try {
      const endpoint = selectedChannel
        ? `/api/channel-management/${selectedChannel.id}/messages/${messageId}/reactions`
        : `/api/direct-messaging-endpoints/${messageId}/reactions`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji, userId: currentEmployee.id }),
      });

      if (!res.ok) throw new Error("Failed to add reaction");

      const data = await res.json();
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? data.message : msg)),
      );
    } catch (err) {
      console.error("Error adding reaction:", err);
    } finally {
      setReactingIds((prev) => {
        const s = new Set(prev);
        s.delete(messageId);
        return s;
      });
    }
  };

  const deleteMessage = async (messageId: number) => {
    if (!confirm("Delete this message?")) return;
    if (!currentEmployee || (!selectedChannel && !selectedDMUser)) return;

    try {
      const endpoint = selectedChannel
        ? `/api/channel-management/${selectedChannel.id}/messages/${messageId}`
        : `/api/direct-messaging-endpoints/${messageId}`;

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
      !currentEmployee ||
      (!selectedChannel && !selectedDMUser)
    )
      return;

    try {
      const endpoint = selectedChannel
        ? `/api/channel-management/${selectedChannel.id}/messages/${messageId}`
        : `/api/direct-messaging-endpoints/${messageId}`;

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
      const res = await fetch(`/api/channel-management/${channelId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(currentEmployee?.id),
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
      const res = await fetch(`/api/channel-management/${channelId}`, {
        method: "DELETE",
        headers: {
          "x-user-id": String(currentEmployee?.id),
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

  const filteredChannels =
    channels && Array.isArray(channels)
      ? channels.filter(
          (ch) =>
            ch &&
            ch.name &&
            ch.name.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : [];

  const filteredDMs =
    dmConversations && Array.isArray(dmConversations)
      ? dmConversations.filter(
          (user) =>
            user &&
            user.firstName &&
            user.lastName &&
            `${user.firstName} ${user.lastName}`
              .toLowerCase()
              .includes(searchQuery.toLowerCase()),
        )
      : [];

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
          background: rgba(0, 0, 0, 0.2);
          border-radius: 2px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.3);
        }
        @media (max-width: 1200px) {
          #right-sidebar {
            display: none;
          }
        }
      `}</style>
      <div className="flex h-full gap-1">
        {/* Left Sidebar */}
        <div className="w-52 flex-shrink-0 flex flex-col gap-1 transition-all">
          {/* Channels Container */}
          <div className="h-[40%] min-h-[200px] max-h-[320px] overflow-visible flex flex-col pt-4 px-0 pl-0 pr-0 pb-4 bg-white border border-black/10 rounded-lg">
            {/* Channels Section */}
            <div
              style={{
                paddingLeft: "6px",
                paddingRight: "6px",
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-black/10">
                <h2
                  className="text-[11px] font-normal m-0 text-black/80 flex-1 text-center"
                  style={{
                    fontFamily: "var(--font-inria-sans)",
                    letterSpacing: "0.3px",
                  }}
                >
                  Channels
                </h2>
                <button
                  onClick={() => setIsChannelModalOpen(true)}
                  aria-label="Create channel"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-sm bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors border border-blue-400/30 flex-shrink-0"
                >
                  <MessageCirclePlus size={14} />
                  New
                </button>
              </div>
              <div className="mb-2">
                <div className="relative flex items-center bg-white border border-black/10 rounded px-2 py-1.5">
                  <Search size={14} className="text-black/40 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Search channels..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 px-2 py-0 bg-transparent text-black text-xs outline-none placeholder-black/40"
                  />
                </div>
              </div>
              <div className="flex flex-col items-center gap-1 overflow-y-auto overflow-x-hidden flex-1">
                {filteredChannels && filteredChannels.length > 0 ? (
                  filteredChannels.map((channel) => (
                    <ChannelListItem
                      key={channel.id}
                      channel={channel}
                      unreadCount={channelUnreadCounts[channel.id] || 0}
                      isActive={selectedChannel?.id === channel.id}
                      onSelect={(ch) => {
                        setSelectedChannel(ch);
                        setSelectedDMUser(null);
                      }}
                    />
                  ))
                ) : (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "rgba(0,0,0,0.4)",
                      textAlign: "center",
                      padding: "16px",
                    }}
                  >
                    No channels
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Conversations Container */}
          <div className="flex-1 min-h-[200px] max-h-[420px] overflow-visible flex flex-col pt-4 px-0 pl-0 pr-0 pb-4 bg-white border border-black/10 rounded-lg">
            {/* Conversation Section */}
            <div
              style={{
                paddingLeft: "6px",
                paddingRight: "6px",
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              <div className="flex items-center justify-center mb-3 pb-3 border-b border-black/10">
                <h2
                  className="text-[11px] font-normal m-0 text-black/80"
                  style={{
                    fontFamily: "var(--font-inria-sans)",
                    letterSpacing: "0.3px",
                  }}
                >
                  Direct Messages
                </h2>
              </div>
              <div className="mb-2">
                <div className="relative flex items-center bg-white border border-black/10 rounded px-2 py-1.5">
                  <Search size={14} className="text-black/40 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 px-2 py-0 bg-transparent text-black text-xs outline-none placeholder-black/40"
                  />
                </div>
              </div>
              <div className="flex flex-col items-center gap-1 overflow-y-auto overflow-x-hidden flex-1">
                {filteredDMs
                  .filter((u) => u && u.firstName && u.lastName)
                  .map((employee) => {
                    const isOnline = activeUserIds.includes(
                      String(employee.id),
                    );
                    console.log(
                      `User ${employee.firstName} (ID: ${employee.id}) - Online: ${isOnline}`,
                    );
                    return (
                      <UserListItem
                        key={employee.id}
                        employee={employee}
                        isOnline={isOnline}
                        isActive={selectedDMUser?.id === employee.id}
                        onSelect={(u) => {
                          setSelectedDMUser(u);
                          setSelectedChannel(null);
                        }}
                      />
                    );
                  })}
              </div>
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 border border-black/10 rounded-lg overflow-hidden bg-white">
          <PageContentCon className="flex flex-col overflow-hidden h-full w-full">
            {selectedChannel || selectedDMUser ? (
              <>
                {/* Header */}
                <div className="pb-4 border-b border-black/10 flex items-center gap-3 justify-between">
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <div className="w-11 h-11 rounded-full bg-[#798CC3] flex items-center justify-center text-white font-semibold overflow-hidden">
                      {selectedDMUser ? (
                        selectedDMUser.profilePicture ? (
                          <img
                            src={selectedDMUser.profilePicture}
                            alt={selectedDMUser.firstName}
                            className="w-full h-full object-cover object-center"
                          />
                        ) : (
                          `${selectedDMUser.firstName[0]}${selectedDMUser.lastName[0]}`
                        )
                      ) : selectedChannel ? (
                        selectedChannel.profilePicture ? (
                          <img
                            src={selectedChannel.profilePicture}
                            alt={selectedChannel.name}
                            className="w-full h-full object-cover object-center"
                          />
                        ) : (
                          selectedChannel.name[0].toUpperCase()
                        )
                      ) : (
                        ""
                      )}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "16px",
                          fontWeight: "400",
                          color: "#000",
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
                          color: "rgba(0,0,0,0.6)",
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
                <div className="flex-1 overflow-y-auto px-5 pt-4 mt-1 flex flex-col gap-3">
                  {filteredMessages.map((msg, index) => {
                    const showTimestamp = shouldShowTimestamp(
                      msg,
                      index,
                      filteredMessages,
                    );
                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: msg.parentMessageId ? "4px" : "0",
                        }}
                      >
                        {/* Render parent message if this is a reply */}
                        {msg.parentMessage && (
                          <div
                            id={`message-${msg.parentMessage.id}`}
                            style={{
                              opacity: 0.65,
                            }}
                          >
                            <MessageBubble
                              message={
                                {
                                  id: msg.parentMessage.id,
                                  content: msg.parentMessage.content,
                                  createdAt: msg.parentMessage.createdAt,
                                  isEdited: false,
                                  isDeleted: false,
                                  sender: msg.parentMessage.sender as any,
                                  attachments: [],
                                  reactions: [],
                                  _count: { replies: 0 },
                                } as any
                              }
                              isCurrentUser={
                                msg.parentMessage.sender.id ===
                                currentEmployee?.id
                              }
                              onAddReaction={() => {}}
                              onDelete={() => {}}
                              onEdit={() => {}}
                              onReply={() =>
                                setReplyingTo(msg.parentMessage!.id)
                              }
                              currentUserId={currentEmployee?.id || 0}
                            />
                          </div>
                        )}

                        {/* Render actual message with optional reply styling */}
                        <div
                          id={`message-${msg.id}`}
                          data-parent-id={msg.parentMessageId || undefined}
                          style={{
                            marginLeft: msg.parentMessageId ? "24px" : "0",
                            paddingLeft: msg.parentMessageId ? "12px" : "0",
                            borderLeft: msg.parentMessageId
                              ? "3px solid rgba(96, 165, 250, 0.4)"
                              : "none",
                          }}
                        >
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
                                  background: "rgba(0,0,0,0.1)",
                                }}
                              />
                              <p
                                style={{
                                  fontSize: "11px",
                                  color: "rgba(0,0,0,0.5)",
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
                                  background: "rgba(0,0,0,0.1)",
                                }}
                              />
                            </div>
                          )}
                          <MessageBubble
                            message={msg}
                            isCurrentUser={
                              msg.sender.id === currentEmployee?.id
                            }
                            onAddReaction={(messageId, emoji) =>
                              addReaction(messageId, emoji)
                            }
                            onDelete={(messageId) => deleteMessage(messageId)}
                            onEdit={(messageId, newContent) =>
                              editMessage(messageId, newContent)
                            }
                            onReply={(messageId) => setReplyingTo(messageId)}
                            currentUserId={currentEmployee?.id || 0}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="pt-4 border-t border-black/10">
                  {replyingTo && (
                    <div
                      style={{
                        padding: "12px",
                        background: "rgba(0,0,0,0.05)",
                        borderRadius: "6px",
                        marginBottom: "12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <Reply size={16} />
                      <div style={{ flex: 1, overflow: "hidden" }}>
                        {(() => {
                          const parent = messages.find(
                            (m) => m.id === replyingTo,
                          );
                          if (!parent)
                            return (
                              <span
                                style={{
                                  fontSize: "12px",
                                  opacity: 0.7,
                                  color: "#000",
                                  fontFamily: "var(--font-inria-sans)",
                                }}
                              >
                                Replying to message
                              </span>
                            );
                          return (
                            <span
                              style={{
                                fontSize: "12px",
                                opacity: 0.7,
                                color: "#000",
                                fontFamily: "var(--font-inria-sans)",
                                whiteSpace: "nowrap",
                                textOverflow: "ellipsis",
                                overflow: "hidden",
                              }}
                            >
                              {parent.sender && parent.sender.firstName
                                ? `${parent.sender.firstName}: `
                                : ""}
                              {parent.content.slice(0, 50)}
                            </span>
                          );
                        })()}
                      </div>
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

                  {/* Attachment Preview */}
                  {attachmentFile && (
                    <div
                      style={{
                        padding: "12px 12px 12px 12px",
                        background: "rgba(0,0,0,0.05)",
                        borderRadius: "6px",
                        marginBottom: "12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <Paperclip size={16} />
                      <span
                        style={{
                          fontSize: "12px",
                          color: "#000",
                          fontFamily: "var(--font-inria-sans)",
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {attachmentFile.name}
                      </span>
                      <button
                        onClick={() => setAttachmentFile(null)}
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          color: "#000",
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}

                  <div className="relative flex items-center bg-white border border-black/10 rounded-full px-3 py-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAttachment}
                      className="bg-transparent border-none cursor-pointer text-black/70 disabled:cursor-not-allowed disabled:opacity-50 transition-colors hover:text-black/90 flex-shrink-0"
                    >
                      <Paperclip size={18} />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleAttachmentSelect}
                      style={{ display: "none" }}
                      disabled={uploadingAttachment}
                    />
                    <input
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message..."
                      className="flex-1 px-2 py-0 bg-transparent text-black text-xs outline-none disabled:cursor-not-allowed disabled:opacity-50 placeholder-black/40"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={sendingMessage}
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: sendingMessage ? "not-allowed" : "pointer",
                        color: "#000",
                        opacity: sendingMessage ? 0.5 : 1,
                        flexShrink: 0,
                      }}
                      className="transition-colors hover:text-black/70"
                    >
                      <Send size={18} />
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
                  color: "rgba(0,0,0,0.5)",
                }}
              >
                Select a channel or conversation
              </div>
            )}
          </PageContentCon>
        </div>

        {/* Right Sidebar */}
        <div
          id="right-sidebar"
          className="border border-black/10 rounded-lg overflow-hidden bg-white"
        >
          <PageContentCon
            style={{
              width: "320px",
              flexShrink: 0,
              overflow: "auto",
              height: "100%",
            }}
          >
            {selectedChannel || selectedDMUser ? (
              <div>
                {/* header vertical with avatar centered and menu*/}
                <div className="relative flex flex-col items-center mb-4 p-4 rounded-lg bg-blue-50 border border-black/10">
                  {/* 3-dots menu button */}
                  <div className="absolute top-2 right-2" ref={menuRef}>
                    <button
                      onClick={() => setMenuOpen(!menuOpen)}
                      className="p-1 hover:bg-white/50 rounded transition-colors"
                    >
                      <MoreVertical size={18} className="text-black/60" />
                    </button>

                    {/* Dropdown menu */}
                    {menuOpen && (
                      <div className="absolute right-0 mt-1 bg-white border border-black/10 rounded shadow-lg z-50 min-w-[150px]">
                        {selectedChannel ? (
                          <>
                            <button
                              onClick={() => {
                                setEditingChannelId(selectedChannel.id);
                                setEditingChannelName(selectedChannel.name);
                                setEditingChannelDesc(
                                  selectedChannel.description ?? "",
                                );
                                setMenuOpen(false);
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-blue-50 text-sm text-black/80 flex items-center gap-2 border-b border-black/5"
                            >
                              <Edit2 size={14} /> Edit Channel
                            </button>
                            <button
                              onClick={() => {
                                handleDeleteChannel(selectedChannel.id);
                                setMenuOpen(false);
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-red-50 text-sm text-red-600 flex items-center gap-2"
                            >
                              <Trash2 size={14} /> Delete Channel
                            </button>
                          </>
                        ) : selectedDMUser ? (
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  `Delete conversation with ${selectedDMUser.firstName}?`,
                                )
                              ) {
                                setSelectedDMUser(null);
                                setMessages([]);
                                setMenuOpen(false);
                              }
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-red-50 text-sm text-red-600 flex items-center gap-2"
                          >
                            <Trash2 size={14} /> Delete Conversation
                          </button>
                        ) : null}
                      </div>
                    )}
                  </div>

                  <div className="relative w-14 h-14 rounded-full bg-[#798CC3] flex items-center justify-center overflow-hidden">
                    {selectedDMUser ? (
                      selectedDMUser.profilePicture ? (
                        <img
                          src={selectedDMUser.profilePicture}
                          alt={selectedDMUser.firstName}
                          className="w-full h-full object-cover object-center"
                        />
                      ) : (
                        `${selectedDMUser.firstName[0]}${selectedDMUser.lastName[0]}`
                      )
                    ) : selectedChannel ? (
                      selectedChannel.profilePicture ? (
                        <img
                          src={selectedChannel.profilePicture}
                          alt={selectedChannel.name}
                          className="w-full h-full object-cover object-center"
                        />
                      ) : (
                        selectedChannel.name[0].toUpperCase()
                      )
                    ) : null}

                    {/* online indicator when DM */}
                    {selectedDMUser && (
                      <span
                        className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 ${
                          activeUserIds.includes(String(selectedDMUser.id))
                            ? "bg-emerald-500"
                            : "bg-gray-500"
                        } border-[rgba(13,27,42,1)]`}
                      />
                    )}

                    {/* edit icon for channel avatar */}
                    {selectedChannel &&
                      currentEmployee?.id === selectedChannel.creatorId && (
                        <>
                          <button
                            onClick={() =>
                              document
                                .getElementById("right-sidebar-pic-input")
                                ?.click()
                            }
                            className="absolute bottom-0 right-0 bg-black/30 hover:bg-black/50 p-1 rounded-full"
                          >
                            <Edit2 size={16} className="text-white" />
                          </button>
                          <input
                            id="right-sidebar-pic-input"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleChannelPicChange}
                          />
                        </>
                      )}
                  </div>
                  <div className="mt-1 text-white text-lg font-medium text-center">
                    {selectedDMUser
                      ? `${selectedDMUser.firstName} ${selectedDMUser.lastName}`
                      : selectedChannel
                        ? selectedChannel.name
                        : ""}
                  </div>
                  <div className="text-sm text-white/60 text-center">
                    {selectedDMUser
                      ? getStatusDisplay(selectedDMUser)
                      : selectedChannel
                        ? selectedChannel.description || "No description"
                        : ""}
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
                      borderRadius: 6,
                      background: "#fff",
                      border: "1px solid rgba(0,0,0,0.1)",
                      color: "#000",
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
                      color: "#000",
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
                          color: "rgba(0,0,0,0.5)",
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
                            color: "#a855f7", // purple
                          },
                          {
                            label: "In Progress",
                            value: selectedUserTaskStats.inProgress,
                            color: "#3b82f6", // blue
                          },
                          {
                            label: "Due",
                            value: selectedUserTaskStats.stuck,
                            color: "#ef4444", // red
                          },
                          {
                            label: "Completed",
                            value: selectedUserTaskStats.done,
                            color: "#10b981", // green
                          },
                        ].map((stat, i) => (
                          <div
                            key={i}
                            style={{
                              textAlign: "center",
                              padding: "12px 12px 12px 12px",
                              borderRadius: "6px",
                              background: "#fff",
                              border: "1px solid rgba(0,0,0,0.1)",
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
                                color: "rgba(0,0,0,0.7)",
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
                  color: "rgba(0,0,0,0.5)",
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
        currentUserId={currentEmployee?.id || 0}
      />
    </PageContainer>
  );
}
