"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  X,
  MessageCircle,
  History,
  Plus,
  Trash2,
  Paperclip,
  Clock,
  MessageSquare,
} from "lucide-react";
import Image from "next/image";
import { getCurrentUser } from "@/utils/sessionManager";
import {
  buildTaskGraph,
  findCriticalPath,
  formatPath,
  hasCircularDependencies,
  type TaskNode as DijkstraTaskNode,
} from "@/utils/dijkstra";

interface BotMessage {
  id: string;
  type: "user" | "bot";
  message: string;
  timestamp: string;
  buttons?: BotButton[];
  showOptions?: boolean;
}

interface BotButton {
  label: string;
  action: string;
  value?: any;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface TaskData {
  title?: string;
  description?: string;
  assigneeId?: string;
  dueDate?: string;
  priority?: "low" | "medium" | "high" | null;
}

interface ChatSession {
  id: string;
  title: string;
  messages: BotMessage[];
  createdAt: string;
  lastUpdated: string;
}

interface AIResponse {
  response: string;
  buttons?: BotButton[];
  action?:
    | "confirm"
    | "create"
    | "assign"
    | "update"
    | "delete"
    | "query"
    | null;
  title?: string | null;
  description?: string | null;
  assigneeEmail?: string | null;
  dueDate?: string | null;
  priority?: "low" | "medium" | "high" | null;
}

type TaskCreationStep =
  | null
  | "title"
  | "title_confirm"
  | "description"
  | "assignee"
  | "duedate"
  | "priority"
  | "summary";

interface TaskerBotWidgetProps {
  excludePages?: string[];
}

export const TaskerBotWidget: React.FC<TaskerBotWidgetProps> = ({
  excludePages = ["/settings"],
}) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [messages, setMessages] = useState<BotMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [teamMembers, setTeamMembers] = useState<Employee[]>([]);
  const [shouldShow, setShouldShow] = useState(true);
  const [existingTasks, setExistingTasks] = useState<any[]>([]);

  const [isAnimatingTaskerBot, setIsAnimatingTaskerBot] = useState(false);
  const [isRingingBell, setIsRingingBell] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const bellTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [pendingTaskConfirmation, setPendingTaskConfirmation] =
    useState<TaskData | null>(null);

  const [pendingDeleteConfirmation, setPendingDeleteConfirmation] = useState<
    string | null
  >(null);

  const [pendingEditConfirmation, setPendingEditConfirmation] = useState<{
    taskId: string;
    updateData: any;
    editingField?: string;
  } | null>(null);

  // Track which message IDs have had their buttons clicked
  const [usedButtonMessageIds, setUsedButtonMessageIds] = useState<Set<string>>(
    new Set(),
  );

  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const modalWidth = 400;
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [typingText, setTypingText] = useState("");
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [creationStep, setCreationStep] = useState<TaskCreationStep>(null);
  const [taskData, setTaskData] = useState<TaskData>({});

  const canCreateTask = (): boolean => {
    if (!currentUser) return false;
    const allowedRoles = ["ADMIN", "OWNER", "EMPLOYEE"];
    return allowedRoles.includes(currentUser.role?.toUpperCase() || "");
  };

  const getRoleHierarchyLevel = (role: string): number => {
    const hierarchy: { [key: string]: number } = {
      EMPLOYEE: 1,
      ADMIN: 2,
      OWNER: 3,
    };
    return hierarchy[role?.toUpperCase() || ""] || 0;
  };

  const canAssignTaskToMember = (targetMember: Employee): boolean => {
    if (!currentUser) return false;
    const assignerLevel = getRoleHierarchyLevel(currentUser.role);
    const assigneeLevel = getRoleHierarchyLevel(targetMember.role);
    // Can only assign to someone at same level or lower
    return assignerLevel >= assigneeLevel;
  };

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes taskerBotPulse {
        0%, 100% { transform: scale(1) rotate(0deg); }
        25% { transform: scale(1.06) rotate(-2deg); }
        50% { transform: scale(1.10) rotate(2deg); }
        75% { transform: scale(1.06) rotate(-1deg); }
      }
      @keyframes bellRing {
        0%, 100% { transform: rotate(0deg); }
        10% { transform: rotate(-12deg); }
        20% { transform: rotate(12deg); }
        30% { transform: rotate(-10deg); }
        40% { transform: rotate(10deg); }
        60% { transform: rotate(-6deg); }
        80% { transform: rotate(6deg); }
      }
      .animate-taskerbot-pulse { animation: taskerBotPulse 0.7s ease-in-out; }
      .animate-bell-ring     { animation: bellRing 0.8s ease-in-out; transform-origin: center top; }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  useEffect(() => {
    const handleNewNotification = () => {
      setIsRingingBell(true);
      setUnreadCount((prev) => prev + 1);
      if (bellTimeoutRef.current) clearTimeout(bellTimeoutRef.current);
      bellTimeoutRef.current = setTimeout(() => setIsRingingBell(false), 1000);
    };
    window.addEventListener("newNotification", handleNewNotification);
    return () =>
      window.removeEventListener("newNotification", handleNewNotification);
  }, []);

  useEffect(() => {
    return () => {
      if (bellTimeoutRef.current) clearTimeout(bellTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const checkPage = () => {
      const currentPath = window.location.pathname;
      const excluded = excludePages.some((page) =>
        currentPath.startsWith(page),
      );
      setShouldShow(!excluded);
    };
    checkPage();
    window.addEventListener("popstate", checkPage);
    return () => window.removeEventListener("popstate", checkPage);
  }, [excludePages]);

  useEffect(() => {
    const handleToggle = () => setIsOpen((prev) => !prev);
    window.addEventListener("toggleTaskerBot", handleToggle);
    return () => window.removeEventListener("toggleTaskerBot", handleToggle);
  }, []);

  useEffect(() => {
    if (isOpen && position.x === 0 && position.y === 0) {
      const defaultX = window.innerWidth - modalWidth - 24;
      const defaultY = 80;
      setPosition({ x: defaultX, y: defaultY });
    }
  }, [isOpen, position]);

  // Reset history view when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowHistory(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!initialized && isOpen) {
      const loadUser = async () => {
        try {
          const user = await getCurrentUser();
          if (user) {
            setCurrentUser(user as Employee);

            const membersRes = await fetch("/api/user-management/assignable", {
              headers: { "x-user-id": String(user.id) },
            });
            if (membersRes.ok) {
              const data = await membersRes.json();
              setTeamMembers(data.users || []);
            }

            const tasksRes = await fetch("/api/task-management", {
              headers: { "x-user-id": String(user.id) },
            });
            if (tasksRes.ok) {
              const tasksData = await tasksRes.json();
              setExistingTasks(tasksData.tasks || []);
            }

            if (!currentSessionId) createNewSession();
            setInitialized(true);
          }
        } catch (e) {
          console.error("Failed to load user", e);
        }
      };
      loadUser();
    }
  }, [isOpen, initialized, currentSessionId]);

  useEffect(() => {
    requestAnimationFrame(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop =
          messagesContainerRef.current.scrollHeight;
      }
    });
  }, [messages, typingText, sending]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("taskerBotSessions");
    if (saved) {
      try {
        setChatSessions(JSON.parse(saved));
      } catch {}
    }
    if (!currentSessionId) createNewSession();
  }, []);

  useEffect(() => {
    if (currentSessionId && messages.length > 0) saveCurrentSession();
  }, [messages, currentSessionId]);

  const generateSessionId = () =>
    `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getSessionPreview = (session: ChatSession) => {
    const userMsg = session.messages.find((m) => m.type === "user");
    return userMsg ? userMsg.message.slice(0, 60) : "Empty conversation";
  };

  const createNewSession = () => {
    const newSessionId = generateSessionId();
    setCurrentSessionId(newSessionId);
    setMessages([]);
    setCreationStep(null);
    setTaskData({});
  };

  const saveCurrentSession = () => {
    if (!currentSessionId || messages.length === 0) return;
    const title = messages[0]?.message?.slice(0, 50) || "New Chat";
    const session: ChatSession = {
      id: currentSessionId,
      title,
      messages: [...messages],
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };
    setChatSessions((prev) => {
      const updated = prev.some((s) => s.id === currentSessionId)
        ? prev.map((s) => (s.id === currentSessionId ? session : s))
        : [session, ...prev].slice(0, 50);
      localStorage.setItem("taskerBotSessions", JSON.stringify(updated));
      return updated;
    });
  };

  const loadSession = (sessionId: string) => {
    const session = chatSessions.find((s) => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages);
      setCreationStep(null);
      setTaskData({});
      setShowHistory(false);
    }
  };

  const deleteSession = (sessionId: string) => {
    setChatSessions((prev) => {
      const updated = prev.filter((s) => s.id !== sessionId);
      localStorage.setItem("taskerBotSessions", JSON.stringify(updated));
      return updated;
    });
    if (currentSessionId === sessionId) createNewSession();
  };

  const addBotMessage = (
    message: string,
    buttons?: BotButton[],
    nextStep?: TaskCreationStep,
  ) => {
    const botMsg: BotMessage = {
      id: (Date.now() + Math.random()).toString(),
      type: "bot",
      message,
      timestamp: new Date().toISOString(),
      buttons,
      showOptions: !!buttons,
    };
    setMessages((prev) => [...prev, botMsg]);
    if (nextStep) setCreationStep(nextStep);
  };

  const streamTypewriterMessage = (
    messageText: string,
    buttons?: BotButton[],
  ) => {
    const messageId = (Date.now() + Math.random()).toString();
    setMessages((prev) => [
      ...prev,
      {
        id: messageId,
        type: "bot",
        message: "",
        timestamp: new Date().toISOString(),
        buttons,
        showOptions: !!buttons,
      },
    ]);
    setTypingMessageId(messageId);
    setTypingText("");

    let charIndex = 0;
    const typeNextChar = () => {
      if (charIndex < messageText.length) {
        setTypingText((prev) => prev + messageText[charIndex]);
        charIndex++;
        typingTimeoutRef.current = setTimeout(
          typeNextChar,
          Math.random() > 0.9 ? 20 : 10,
        );
      } else {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, message: messageText } : msg,
          ),
        );
        setTypingMessageId(null);
        setTypingText("");
      }
    };
    typeNextChar();
  };

  const handleButtonClick = async (
    action: string,
    value?: any,
    messageId?: string,
  ) => {
    // Mark this message's buttons as used
    if (messageId) {
      setUsedButtonMessageIds((prev) => new Set(prev).add(messageId));
    }

    if (action === "start_creation") {
      if (!canCreateTask()) {
        addBotMessage("⛔ You don't have permission to create tasks.");
        return;
      }
      const aiResponse = await generateAIResponse(
        "I want to create a new task",
      );
      streamTypewriterMessage(
        aiResponse.response || "Let's create a task! What should we call it?",
        aiResponse.buttons,
      );
    } else if (action === "view_tasks") {
      setIsOpen(false);
      router.push("/tasks");
    } else if (action === "view_created_task") {
      addBotMessage(
        "📋 Opening your task now! You'll see:\n\n" +
          "• Task details and who it's assigned to\n" +
          "• A section with next steps guidance\n" +
          "• Comments and attachments area\n" +
          "• Options to track progress\n\n" +
          "Feel free to ask me for help anytime! 🚀",
      );
      setIsOpen(false);
      setTimeout(() => {
        router.push(value ? `/tasks?focus=${value}` : "/tasks");
      }, 1000);
    } else if (action === "optimize") {
      setCreationStep(null);
      const aiResponse = await generateAIResponse(
        "Can you optimize and analyze my tasks?",
      );
      streamTypewriterMessage(
        aiResponse.response || "Here's what I found...",
        aiResponse.buttons,
      );
    } else if (action === "confirm_title_yes") {
      const aiResponse = await generateAIResponse(
        `Task title confirmed: "${taskData.title}". Please continue.`,
      );
      streamTypewriterMessage(
        aiResponse.response || "Great! What else can I help?",
        aiResponse.buttons,
      );
    } else if (action === "confirm_title_no") {
      setTaskData((prev) => ({ ...prev, title: "" }));
      const aiResponse = await generateAIResponse(
        "Let me try again with a different task title",
      );
      streamTypewriterMessage(
        aiResponse.response || "No problem, what should the task be called?",
        aiResponse.buttons,
      );
    } else if (action === "description_yes") {
      setCreationStep("description");
      const aiResponse = await generateAIResponse(
        "I want to add a description to the task",
      );
      streamTypewriterMessage(
        aiResponse.response || "What's the description?",
        aiResponse.buttons,
      );
    } else if (action === "description_skip") {
      const aiResponse = await generateAIResponse(
        `Skipping description for task: "${taskData.title}". Next step.`,
      );
      streamTypewriterMessage(
        aiResponse.response || "Who should this be assigned to?",
        aiResponse.buttons,
      );
    } else if (action === "assign_member") {
      const member = teamMembers.find((m) => m.id === value);

      // Check if current user can assign to this member
      if (!canAssignTaskToMember(member!)) {
        const roleMessage =
          currentUser?.role === "EMPLOYEE"
            ? "Employees can only assign tasks to other employees"
            : currentUser?.role === "ADMIN"
              ? "Admins can only assign tasks to employees and other admins"
              : "Only Owners can assign tasks to Owners";
        addBotMessage(`You cannot assign to ${member?.role}. ${roleMessage}.`);
        return;
      }

      setTaskData((prev) => ({ ...prev, assigneeId: value }));
      const aiResponse = await generateAIResponse(
        `Assign task to ${member?.firstName} ${member?.lastName}`,
      );
      streamTypewriterMessage(
        aiResponse.response ||
          `Assigned to ${member?.firstName} ${member?.lastName}. What's the due date?`,
        aiResponse.buttons,
      );
    } else if (action === "priority_select") {
      setTaskData((prev) => ({ ...prev, priority: value }));
      const assignee = teamMembers.find((m) => m.id === taskData.assigneeId);
      const dueDateFormatted = taskData.dueDate
        ? new Date(taskData.dueDate).toLocaleDateString()
        : "No due date";

      const summaryText = `\n📋 Task Summary:\n━━━━━━━━━━━━━━━━\nTitle: ${taskData.title}\nDescription: ${taskData.description || "None"}\nAssigned to: ${assignee?.firstName} ${assignee?.lastName}\nDue Date: ${dueDateFormatted}\nPriority: ${value.toUpperCase()}`;

      const aiResponse = await generateAIResponse(
        `Confirm task creation with these details: ${summaryText}`,
      );
      streamTypewriterMessage(aiResponse.response || summaryText, [
        { label: "✓ Confirm & Create", action: "create_task_final" },
        { label: "✏ Edit", action: "edit_task" },
        { label: "✕ Cancel", action: "cancel_task" },
      ]);
    } else if (action === "create_task_final") {
      // Clear the UI for new message
      setCreationStep(null);

      // Show processing message without buttons
      addBotMessage("🔄 Creating your task...");

      // Create the task
      await createTask();

      // Clear task data
      setTaskData({});
    } else if (action === "confirm_task") {
      if (pendingTaskConfirmation) {
        await createTaskFromAI({
          title: pendingTaskConfirmation.title,
          description: pendingTaskConfirmation.description,
          assigneeEmail: teamMembers.find(
            (m) => m.id === pendingTaskConfirmation.assigneeId,
          )?.email,
          dueDate: pendingTaskConfirmation.dueDate,
          priority: pendingTaskConfirmation.priority,
        });
        setPendingTaskConfirmation(null);
      }
    } else if (action === "edit_task") {
      setCreationStep("title");
      const aiResponse = await generateAIResponse(
        "I want to edit the task details",
      );
      streamTypewriterMessage(
        aiResponse.response || "What would you like to change?",
        aiResponse.buttons,
      );
    } else if (action === "cancel_task") {
      setCreationStep(null);
      setPendingTaskConfirmation(null);
      setTaskData({});
      const aiResponse = await generateAIResponse(
        "I'd like to cancel creating this task",
      );
      streamTypewriterMessage(
        aiResponse.response || "No problem! What else can I help you with?",
        aiResponse.buttons,
      );
    } else if (action === "delete_task_show_confirmation") {
      // Show delete confirmation buttons
      if (value) {
        setPendingDeleteConfirmation(value);
        streamTypewriterMessage(
          `Are you sure you want to delete this task? This action cannot be undone.`,
          [
            {
              label: "✗ Delete Task",
              action: "delete_task_confirm",
              value: value,
            },
            { label: "Cancel", action: "cancel_delete_task", value: value },
          ],
        );
      }
    } else if (action === "delete_task_confirm") {
      // Actually delete the task
      if (value) {
        addBotMessage("Deleting task...");
        await deleteTaskFromBot(value);
        setPendingDeleteConfirmation(null);
      }
    } else if (action === "cancel_delete_task") {
      // Cancel delete operation
      setPendingDeleteConfirmation(null);
      const aiResponse = await generateAIResponse(
        "I changed my mind about deleting the task",
      );
      streamTypewriterMessage(
        aiResponse.response || "Got it! What else can I help with?",
        aiResponse.buttons,
      );
    } else if (action === "edit_task_show_confirmation") {
      // Show edit confirmation buttons
      if (value?.taskId) {
        setPendingEditConfirmation(value);
        streamTypewriterMessage(
          `Let me update the task with the following changes:`,
          [
            {
              label: "✓ Update Task",
              action: "edit_task_confirm",
              value: value,
            },
            { label: "Cancel", action: "cancel_edit_task", value: value },
          ],
        );
      }
    } else if (action === "edit_task_confirm") {
      // Actually edit the task
      if (value?.taskId) {
        addBotMessage("🔄 Updating task...");
        const updateData = value?.updateData || {};
        await editTaskFromBot(value.taskId, updateData);
        setPendingEditConfirmation(null);
      }
    } else if (action === "cancel_edit_task") {
      // Cancel edit operation
      setPendingEditConfirmation(null);
      const aiResponse = await generateAIResponse(
        "I changed my mind about editing the task",
      );
      streamTypewriterMessage(
        aiResponse.response || "Got it! What else can I help with?",
        aiResponse.buttons,
      );
    } else if (action === "edit_task_priority") {
      // Edit task priority
      if (value?.taskId && value?.priority) {
        await editTaskFromBot(value.taskId, { priority: value.priority });
      }
    } else if (action === "edit_task_status") {
      // Edit task status
      if (value?.taskId && value?.status) {
        await editTaskFromBot(value.taskId, { status: value.status });
      }
    } else if (action === "edit_priority_temp") {
      // Temporary handler for priority selection during edit
      if (pendingEditConfirmation) {
        const updatedPendingEdit = {
          ...pendingEditConfirmation,
          updateData: {
            ...pendingEditConfirmation.updateData,
            priority: value,
          },
        };
        setPendingEditConfirmation(updatedPendingEdit);

        streamTypewriterMessage(
          `I'll update the task priority to ${value.toUpperCase()}.`,
          [
            {
              label: "✓ Update Task",
              action: "edit_task_confirm",
              value: updatedPendingEdit,
            },
            {
              label: "Cancel",
              action: "cancel_edit_task",
              value: pendingEditConfirmation?.taskId,
            },
          ],
        );
      }
    } else if (action === "edit_status_temp") {
      // Temporary handler for status selection during edit
      if (pendingEditConfirmation) {
        const statusLabel =
          value === "inprogress"
            ? "In Progress"
            : value === "todo"
              ? "To Do"
              : "Done";
        const updatedPendingEdit = {
          ...pendingEditConfirmation,
          updateData: { ...pendingEditConfirmation.updateData, status: value },
        };
        setPendingEditConfirmation(updatedPendingEdit);

        streamTypewriterMessage(
          `I'll update the task status to ${statusLabel}.`,
          [
            {
              label: "✓ Update Task",
              action: "edit_task_confirm",
              value: updatedPendingEdit,
            },
            {
              label: "Cancel",
              action: "cancel_edit_task",
              value: pendingEditConfirmation?.taskId,
            },
          ],
        );
      }
    } else if (action === "edit_task_field_select") {
      // User selected which field to edit (Priority, Status, or Due Date)
      if (value === "priority") {
        streamTypewriterMessage(`What should the new priority be?`, [
          { label: "High", action: "edit_priority_temp", value: "high" },
          { label: "Medium", action: "edit_priority_temp", value: "medium" },
          { label: "Low", action: "edit_priority_temp", value: "low" },
          {
            label: "Cancel",
            action: "cancel_edit_task",
            value: pendingEditConfirmation?.taskId,
          },
        ]);
      } else if (value === "status") {
        streamTypewriterMessage(`What should the new status be?`, [
          { label: "To Do", action: "edit_status_temp", value: "todo" },
          {
            label: "In Progress",
            action: "edit_status_temp",
            value: "inprogress",
          },
          { label: "Done", action: "edit_status_temp", value: "done" },
          {
            label: "Cancel",
            action: "cancel_edit_task",
            value: pendingEditConfirmation?.taskId,
          },
        ]);
      } else if (value === "dueDate") {
        streamTypewriterMessage(
          `When should this task be due? (e.g., tomorrow, next Friday, December 25, 2024)`,
          [
            {
              label: "Cancel",
              action: "cancel_edit_task",
              value: pendingEditConfirmation?.taskId,
            },
          ],
        );
        if (pendingEditConfirmation) {
          setPendingEditConfirmation({
            ...pendingEditConfirmation,
            editingField: "dueDate",
          });
        }
      }
    }
  };

  const deleteTaskFromBot = async (taskId: string) => {
    if (!currentUser) return;

    try {
      const res = await fetch(`/api/task-management/${taskId}`, {
        method: "DELETE",
        headers: { "x-user-id": String(currentUser.id) },
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        if (error.warning) {
          addBotMessage(error.warning);
        } else if (res.status === 403) {
          addBotMessage(
            "❌ You can only delete tasks you created or are assigned to.",
          );
        } else {
          addBotMessage(`❌ ${error.error || "Failed to delete task."}`);
        }
        return;
      }

      // Refresh the tasks list after successful deletion
      try {
        const tasksRes = await fetch("/api/task-management", {
          headers: { "x-user-id": String(currentUser.id) },
        });
        if (tasksRes.ok) {
          const tasksData = await tasksRes.json();
          setExistingTasks(tasksData.tasks || []);
        }
      } catch (refreshError) {
        console.error("Error refreshing tasks after deletion:", refreshError);
      }

      // Dispatch event to notify other components (like Tasks page) to refresh
      window.dispatchEvent(
        new CustomEvent("taskDeleted", { detail: { taskId } }),
      );

      addBotMessage("Task has been deleted successfully!");
    } catch (error) {
      addBotMessage("Error deleting task. Please try again.");
      console.error("Delete task error:", error);
    }
  };

  const editTaskFromBot = async (taskId: string, updateData: any) => {
    if (!currentUser) return;

    try {
      const res = await fetch("/api/task-management", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(currentUser.id),
        },
        body: JSON.stringify({ taskId, ...updateData }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        if (error.warning) {
          addBotMessage(error.warning);
        } else if (res.status === 403) {
          addBotMessage(
            "❌ You can only edit tasks you created or are assigned to.",
          );
        } else {
          addBotMessage(`❌ ${error.error || "Failed to edit task."}`);
        }
        return;
      }

      const data = await res.json();
      addBotMessage(`Task "${data.task?.title || "Task"}" has been updated!`);
    } catch (error) {
      addBotMessage("Error updating task. Please try again.");
      console.error("Edit task error:", error);
    }
  };

  // Helper function to find matching task by name pattern in user input
  const findMatchingTask = (userInput: string): any | null => {
    const lowerInput = userInput.toLowerCase();

    // First try exact title matches
    for (const task of existingTasks) {
      if (lowerInput.includes(task.title.toLowerCase())) {
        return task;
      }
    }

    // Then try partial matches (first few words of title)
    for (const task of existingTasks) {
      const taskWords = task.title.toLowerCase().split(" ");
      const firstTwoWords = taskWords.slice(0, 2).join(" ");
      if (firstTwoWords && lowerInput.includes(firstTwoWords)) {
        return task;
      }
    }

    return null;
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !currentUser) return;

    const lowerInput = input.toLowerCase();

    // Check for delete operation on existing tasks
    const isDeleteRequest =
      lowerInput.includes("delete") || lowerInput.includes("remove");
    if (isDeleteRequest && !pendingTaskConfirmation && !creationStep) {
      const matchedTask = findMatchingTask(input);
      if (matchedTask) {
        const userMessage: BotMessage = {
          id: Date.now().toString(),
          type: "user",
          message: input,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");

        // Show delete confirmation
        streamTypewriterMessage(
          `I found "${matchedTask.title}". Are you sure you want to delete this task? This action cannot be undone.`,
          [
            {
              label: "✗ Delete Task",
              action: "delete_task_confirm",
              value: matchedTask.id,
            },
            {
              label: "Cancel",
              action: "cancel_delete_task",
              value: matchedTask.id,
            },
          ],
        );
        return;
      }
    }

    // Check for edit operation on existing tasks
    const isEditRequest =
      lowerInput.includes("edit") ||
      lowerInput.includes("modify") ||
      lowerInput.includes("change");
    if (isEditRequest && !pendingTaskConfirmation && !creationStep) {
      const matchedTask = findMatchingTask(input);
      if (matchedTask) {
        const userMessage: BotMessage = {
          id: Date.now().toString(),
          type: "user",
          message: input,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");

        // Show what they can edit
        streamTypewriterMessage(
          `I found "${matchedTask.title}". What would you like to change? (priority, status, due date, etc.)`,
          [
            {
              label: "Cancel",
              action: "cancel_edit_task",
              value: matchedTask.id,
            },
          ],
        );
        setPendingEditConfirmation({ taskId: matchedTask.id, updateData: {} });
        return;
      }
    }

    if (
      pendingTaskConfirmation &&
      (lowerInput.includes("back") ||
        lowerInput.includes("confirm") ||
        lowerInput.includes("create") ||
        lowerInput.includes("resume") ||
        lowerInput.includes("task"))
    ) {
      streamTypewriterMessage(
        `Let's continue with your task:\n\nTitle: ${pendingTaskConfirmation.title || "N/A"}\nDescription: ${pendingTaskConfirmation.description || "N/A"}\nPriority: ${pendingTaskConfirmation.priority || "N/A"}`,
        [
          { label: "✓ Create Task", action: "confirm_task", value: "yes" },
          { label: "Edit", action: "edit_task", value: "edit" },
          { label: "Cancel", action: "cancel_task", value: "cancel" },
        ],
      );
      setInput("");
      return;
    }

    // Handle due date input for edit task
    if (pendingEditConfirmation?.editingField === "dueDate") {
      const userMessage: BotMessage = {
        id: Date.now().toString(),
        type: "user",
        message: input,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setInput("");

      // Use AI to parse the date from natural language
      const today = new Date().toISOString().split("T")[0]; // Get today's date in YYYY-MM-DD format
      const dateParsingPrompt = `Today is ${today}.
Parse this date/time input: "${input}"
      
Respond with ONLY a date in ISO 8601 format (YYYY-MM-DD) or "INVALID" if it cannot be parsed.
Examples:
- "tomorrow" -> calculate and respond with the actual date
- "next Friday" -> calculate and respond with the actual date
- "in 3 days" -> calculate and respond with the actual date
- "December 25, 2024" -> "2024-12-25"
- "invalid text" -> "INVALID"`;

      const dateParsingResponse = await fetch("/api/ai-field-detection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: dateParsingPrompt,
          type: "date_parsing",
        }),
      });

      if (!dateParsingResponse.ok) {
        // Fallback: ask user to re-enter
        streamTypewriterMessage(
          `I couldn't understand that date. When should this task be due? (e.g., tomorrow, next Friday, December 25, 2024)`,
          [
            {
              label: "Cancel",
              action: "cancel_edit_task",
              value: pendingEditConfirmation?.taskId,
            },
          ],
        );
        return;
      }

      const dateParsingResult = await dateParsingResponse.json();
      const parsedDate = dateParsingResult.response.trim();

      if (parsedDate !== "INVALID" && /^\d{4}-\d{2}-\d{2}$/.test(parsedDate)) {
        // Valid date parsed
        const updatedPendingEdit = {
          ...pendingEditConfirmation,
          updateData: {
            ...pendingEditConfirmation.updateData,
            dueDate: parsedDate,
          },
          editingField: undefined,
        };
        setPendingEditConfirmation(updatedPendingEdit);

        // Format the date for display
        const dateObj = new Date(parsedDate);
        const dateDisplay = dateObj.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        streamTypewriterMessage(
          `I'll update the task due date to ${dateDisplay}.`,
          [
            {
              label: "✓ Update Task",
              action: "edit_task_confirm",
              value: updatedPendingEdit,
            },
            {
              label: "Cancel",
              action: "cancel_edit_task",
              value: pendingEditConfirmation?.taskId,
            },
          ],
        );
      } else {
        // Invalid date - ask again
        streamTypewriterMessage(
          `I couldn't understand that date. When should this task be due? (e.g., tomorrow, next Friday, December 25, 2024)`,
          [
            {
              label: "Cancel",
              action: "cancel_edit_task",
              value: pendingEditConfirmation?.taskId,
            },
          ],
        );
      }
      return;
    }

    // Handle edit task - user is specifying what to change
    if (pendingEditConfirmation && !pendingTaskConfirmation) {
      const userMessage: BotMessage = {
        id: Date.now().toString(),
        type: "user",
        message: input,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setInput("");

      // Use AI to understand what field the user wants to change
      const fieldDetectionPrompt = `User said: "${input}"

Which field do they want to change?
- PRIORITY (if they mention: priority, urgent, high, medium, low, importance)
- STATUS (if they mention: status, done, complete, start, in progress, mark as, to do)
- DUE_DATE (if they mention: deadline, due date, due, when, date, time, by tomorrow, by next week, etc.)

Respond with ONLY one of: PRIORITY, STATUS, DUE_DATE, or UNCLEAR`;

      const fieldDetectionResponse = await fetch("/api/ai-field-detection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: fieldDetectionPrompt,
          type: "field_detection",
        }),
      });

      if (!fieldDetectionResponse.ok) {
        // Fallback to showing field selector if AI detection fails
        streamTypewriterMessage(
          `I'm not sure what you'd like to change. What would you like to update?`,
          [
            {
              label: "Priority",
              action: "edit_task_field_select",
              value: "priority",
            },
            {
              label: "Status",
              action: "edit_task_field_select",
              value: "status",
            },
            {
              label: "Due Date",
              action: "edit_task_field_select",
              value: "dueDate",
            },
            {
              label: "Cancel",
              action: "cancel_edit_task",
              value: pendingEditConfirmation?.taskId,
            },
          ],
        );
        return;
      }

      const fieldDetectionResult = await fieldDetectionResponse.json();
      const detectedField = fieldDetectionResult.response.trim().toUpperCase();

      if (detectedField.includes("PRIORITY")) {
        // User wants to change priority - show options
        streamTypewriterMessage(`What should the new priority be?`, [
          { label: "High", action: "edit_priority_temp", value: "high" },
          { label: "Medium", action: "edit_priority_temp", value: "medium" },
          { label: "Low", action: "edit_priority_temp", value: "low" },
          {
            label: "Cancel",
            action: "cancel_edit_task",
            value: pendingEditConfirmation?.taskId,
          },
        ]);
        return;
      } else if (detectedField.includes("STATUS")) {
        // User wants to change status - show options
        streamTypewriterMessage(`What should the new status be?`, [
          { label: "To Do", action: "edit_status_temp", value: "todo" },
          {
            label: "In Progress",
            action: "edit_status_temp",
            value: "inprogress",
          },
          { label: "Done", action: "edit_status_temp", value: "done" },
          {
            label: "Cancel",
            action: "cancel_edit_task",
            value: pendingEditConfirmation?.taskId,
          },
        ]);
        return;
      } else if (detectedField.includes("DUE_DATE")) {
        // User wants to change due date
        // Prompt user for the new date
        streamTypewriterMessage(
          `When should this task be due? (e.g., tomorrow, next Friday, December 25, 2024)`,
          [
            {
              label: "Cancel",
              action: "cancel_edit_task",
              value: pendingEditConfirmation?.taskId,
            },
          ],
        );
        if (pendingEditConfirmation) {
          setPendingEditConfirmation({
            ...pendingEditConfirmation,
            editingField: "dueDate",
          });
        }
        return;
      } else {
        // AI couldn't determine the field - show options
        streamTypewriterMessage(
          `I'm not sure what you'd like to change. What would you like to update?`,
          [
            {
              label: "Priority",
              action: "edit_task_field_select",
              value: "priority",
            },
            {
              label: "Status",
              action: "edit_task_field_select",
              value: "status",
            },
            {
              label: "Due Date",
              action: "edit_task_field_select",
              value: "dueDate",
            },
            {
              label: "Cancel",
              action: "cancel_edit_task",
              value: pendingEditConfirmation?.taskId,
            },
          ],
        );
      }
      return;
    }

    const userMessage: BotMessage = {
      id: Date.now().toString(),
      type: "user",
      message: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const userInput = input;
    setInput("");
    setSending(true);

    try {
      const aiResponse = await generateAIResponse(userInput);

      if (aiResponse.action === "confirm") {
        // Check if we're missing critical info (especially assignee)
        if (!aiResponse.assigneeEmail) {
          // Show assignee selection instead of trying to confirm
          const assignableMembers = teamMembers.filter((m) =>
            canAssignTaskToMember(m),
          );

          if (assignableMembers.length === 0) {
            streamTypewriterMessage(
              "I need to know who this task should be assigned to, but I don't have permission to assign to available team members.",
              [],
            );
          } else {
            streamTypewriterMessage(
              aiResponse.response ||
                "Please select who should be assigned to this task.",
              assignableMembers.map((m) => ({
                label: `${m.firstName} ${m.lastName}`,
                action: "assign_member",
                value: m.id,
              })),
            );
          }
        } else if (!aiResponse.dueDate) {
          // Missing due date
          streamTypewriterMessage(
            aiResponse.response ||
              "I need a due date for this task. When should it be completed?",
            [],
          );
        } else {
          // All required info present, proceed with confirmation
          if (!aiResponse.assigneeEmail && aiResponse.response) {
            const derived = findAssigneeEmailInText(aiResponse.response);
            if (derived) aiResponse.assigneeEmail = derived;
          }

          const newTaskData = {
            title: aiResponse.title ?? undefined,
            description: aiResponse.description ?? undefined,
            assigneeId: teamMembers.find(
              (m) =>
                m.email.toLowerCase() ===
                (aiResponse.assigneeEmail || "").toLowerCase(),
            )?.id,
            dueDate: aiResponse.dueDate ?? undefined,
            priority: aiResponse.priority ?? undefined,
          };

          setPendingTaskConfirmation(newTaskData);

          streamTypewriterMessage(
            aiResponse.response || "Please confirm the task details:",
            [
              { label: "✓ Create Task", action: "confirm_task", value: "yes" },
              { label: "Edit", action: "edit_task", value: "edit" },
              { label: "Cancel", action: "cancel_task", value: "cancel" },
            ],
          );
        }
      } else {
        streamTypewriterMessage(
          aiResponse.response || "Got it! What else can I help with?",
          aiResponse.buttons,
        );
      }
    } catch (error) {
      addBotMessage("Something went wrong. Please try again.");
    } finally {
      setAttachedFiles([]);
      setSending(false);
    }
  };

  const generateAIResponse = async (input: string): Promise<AIResponse> => {
    try {
      let taskContext = "";
      if (existingTasks.length > 0) {
        taskContext = `\n\nCurrent user tasks:\n${existingTasks
          .map(
            (task) =>
              `- ${task.title} (Status: ${task.status}, Priority: ${task.priority || "N/A"})`,
          )
          .join("\n")}`;
      }

      let pendingContext = "";
      if (pendingTaskConfirmation) {
        pendingContext = `\n\nPending task:\nTitle: ${pendingTaskConfirmation.title}\nDescription: ${pendingTaskConfirmation.description || "N/A"}\nPriority: ${pendingTaskConfirmation.priority || "N/A"}`;
      }

      // Build current user context
      const currentUserContext = currentUser
        ? `\n\nYou are chatting with:\nName: ${currentUser.firstName} ${currentUser.lastName}\nEmail: ${currentUser.email}\nRole: ${currentUser.role}`
        : "";

      // Build team members context with roles
      const teamMembersContext =
        teamMembers.length > 0
          ? `\n\nTeam members available:\n${teamMembers
              .map(
                (m) =>
                  `- ${m.firstName} ${m.lastName} (${m.email}) - Role: ${m.role}`,
              )
              .join("\n")}`
          : "";

      let body: FormData | string;
      let headers: Record<string, string> = {};

      if (attachedFiles.length > 0) {
        const formData = new FormData();
        formData.append(
          "message",
          input +
            taskContext +
            pendingContext +
            currentUserContext +
            teamMembersContext,
        );
        formData.append("userId", currentUser?.id || "");
        formData.append(
          "currentUser",
          JSON.stringify({
            id: currentUser?.id,
            name: `${currentUser?.firstName} ${currentUser?.lastName}`,
            email: currentUser?.email,
            role: currentUser?.role,
          }),
        );
        formData.append("sessionId", currentSessionId);
        formData.append(
          "teamMembers",
          JSON.stringify(
            teamMembers.map((m) => ({
              id: m.id,
              name: `${m.firstName} ${m.lastName}`,
              email: m.email,
              role: m.role,
            })),
          ),
        );
        formData.append("pendingTask", JSON.stringify(pendingTaskConfirmation));
        attachedFiles.forEach((file) => formData.append("files", file));
        body = formData;
      } else {
        body = JSON.stringify({
          message:
            input +
            taskContext +
            pendingContext +
            currentUserContext +
            teamMembersContext,
          userId: currentUser?.id,
          currentUser: {
            id: currentUser?.id,
            name: `${currentUser?.firstName} ${currentUser?.lastName}`,
            email: currentUser?.email,
            role: currentUser?.role,
          },
          sessionId: currentSessionId,
          teamMembers: teamMembers.map((m) => ({
            id: m.id,
            name: `${m.firstName} ${m.lastName}`,
            email: m.email,
            role: m.role,
          })),
          pendingTask: pendingTaskConfirmation,
        });
        headers = { "Content-Type": "application/json" };
      }

      const response = await fetch("/api/taskerbot-chat-endpoints", {
        method: "POST",
        headers,
        body,
      });

      if (!response.ok) {
        return { response: "I had a little hiccup. Try again?" };
      }

      const data = await response.json();

      // Validate and extract the message properly
      let message = data.message;
      let action = data.action;

      // If message is an object or contains JSON, convert it properly
      if (typeof message === "object" && message !== null) {
        message = JSON.stringify(message);
      }

      // If the message looks like JSON (starts with { or [), it's likely malformed
      if (
        typeof message === "string" &&
        (message.trim().startsWith("{") || message.trim().startsWith("["))
      ) {
        console.warn(
          "Raw JSON detected in message field, replacing with fallback",
        );
        // When assignee is missing, provide a helpful message and change action to confirm
        if (!data.assigneeEmail) {
          message =
            "I need to know who this task should be assigned to. Who from the team should work on this?";
          action = "confirm"; // Trigger the assignee selection UI
        } else {
          message = "Great! I've noted that. What else would you like?";
        }
      }

      return {
        response: message || "Got it! What else can I help with?",
        buttons: data.buttons,
        action: action,
        title: data.title,
        description: data.description,
        assigneeEmail: data.assigneeEmail,
        dueDate: data.dueDate,
        priority: data.priority,
      };
    } catch (error) {
      console.error("generateAIResponse error:", error);
      return {
        response: "Oops, something went wrong. Let me get back on track! 🤖",
      };
    }
  };

  const createTask = async () => {
    if (!taskData.assigneeId) {
      // Filter members based on current user's role
      const assignableMembers = teamMembers.filter((m) =>
        canAssignTaskToMember(m),
      );

      if (assignableMembers.length === 0) {
        addBotMessage(
          `You don't have permission to assign tasks to any available team members based on your role (${currentUser?.role}).`,
        );
        return;
      }

      streamTypewriterMessage(
        "Please select a user to assign this task to.",
        assignableMembers.map((m) => ({
          label: `${m.firstName} ${m.lastName}`,
          action: "assign_member",
          value: m.id,
        })),
      );
      return;
    }

    // Validate due date exists and is not in the past
    if (!taskData.dueDate) {
      addBotMessage("A due date is required to create a task.");
      return;
    }

    const dueDateObj = new Date(taskData.dueDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    dueDateObj.setHours(0, 0, 0, 0);

    if (dueDateObj < now) {
      addBotMessage(
        "Due date cannot be in the past. Please choose a future date.",
      );
      return;
    }

    try {
      const res = await fetch("/api/task-management", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(currentUser?.id),
        },
        body: JSON.stringify({
          title: taskData.title,
          description: taskData.description || "",
          status: "todo",
          priority: taskData.priority || "medium",
          dueDate: taskData.dueDate,
          assigneeIds: [taskData.assigneeId],
          tags: ["taskerbot"],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.task?.id && attachedFiles.length > 0) {
          await uploadAttachmentsToTask(data.task.id);
        }

        const tasksRes = await fetch("/api/task-management", {
          headers: { "x-user-id": String(currentUser?.id) },
        });
        if (tasksRes.ok) {
          const tasksData = await tasksRes.json();
          setExistingTasks(tasksData.tasks || []);
        }

        const aiResponse = await generateAIResponse(
          `Task "${taskData.title}" has been created successfully`,
        );

        // Remove the "Creating..." message and show success message with buttons
        setMessages((prev) => prev.slice(0, -1)); // Remove the "Creating..." message

        streamTypewriterMessage(
          aiResponse.response ||
            `✅ Task "${taskData.title}" created successfully!`,
          [
            {
              label: "👁 View in Tasks",
              action: "view_created_task",
              value: data.task.id,
            },
            { label: "➕ Create another task", action: "start_creation" },
          ],
        );

        // Add next steps guidance message
        setTimeout(() => {
          streamTypewriterMessage(
            `📋 **Next Steps:**\n\n` +
              `1️⃣ Click "View in Tasks" to see your task on the task board\n` +
              `2️⃣ You can add more details like comments or attachments\n` +
              `3️⃣ Team members assigned will get notified automatically\n\n` +
              `Need help? Just let me know! 🚀`,
            [
              {
                label: "Got it! What's next?",
                action: "view_created_task",
                value: data.task.id,
              },
            ],
          );
        }, 1500);

        setTaskData({});
        setCreationStep(null);
      } else {
        const error = await res.json().catch(() => ({}));

        // Handle duplicate task error
        if (res.status === 409 && error.existingTask) {
          addBotMessage(
            `❌ A similar task already exists: "${error.existingTask.title}" (${error.existingTask.status}). Please check if you meant to update that task instead.`,
          );
          return;
        }

        addBotMessage(
          `Failed to create task: ${error.error || "Unknown error"}`,
        );
      }
    } catch (error) {
      addBotMessage("Error creating task. Please try again.");
    }
  };

  const createTaskFromAI = async (task: {
    title?: string | null;
    description?: string | null;
    assigneeEmail?: string | null;
    dueDate?: string | null;
    priority?: "low" | "medium" | "high" | null;
    response?: string;
  }) => {
    if (!canCreateTask() || !task.title) return;

    // Check if dueDate is provided
    if (!task.dueDate) {
      addBotMessage(
        "❌ A due date is required to create a task. Please provide one.",
      );
      return;
    }

    // Validate due date is not in the past
    const dueDateObj = new Date(task.dueDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    dueDateObj.setHours(0, 0, 0, 0);

    if (dueDateObj < now) {
      addBotMessage(
        "Due date cannot be in the past. Please choose a future date.",
      );
      return;
    }

    if (!task.assigneeEmail && task.response) {
      const derived = findAssigneeEmailInText(task.response);
      if (derived) task.assigneeEmail = derived;
    }

    const assignee = teamMembers.find(
      (m) => m.email.toLowerCase() === (task.assigneeEmail || "").toLowerCase(),
    );
    if (!assignee) {
      addBotMessage(
        "Couldn't find the assignee. Please specify who should be assigned.",
      );
      return;
    }

    try {
      const res = await fetch("/api/task-management", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(currentUser?.id),
        },
        body: JSON.stringify({
          title: task.title,
          description: task.description || "",
          status: "todo",
          priority: task.priority || "medium",
          dueDate: task.dueDate,
          assigneeIds: [assignee.id],
          tags: ["taskerbot"],
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.task?.id && attachedFiles.length > 0)
          await uploadAttachmentsToTask(json.task.id);

        const tasksRes = await fetch("/api/task-management", {
          headers: { "x-user-id": String(currentUser?.id) },
        });
        if (tasksRes.ok) {
          const tasksData = await tasksRes.json();
          setExistingTasks(tasksData.tasks || []);
        }

        if (json.task?.id) router.push(`/tasks?focus=${json.task.id}`);
        else router.push("/tasks");
      } else {
        const error = await res.json().catch(() => ({}));

        // Handle duplicate task error
        if (res.status === 409 && error.existingTask) {
          addBotMessage(
            `❌ A similar task already exists: "${error.existingTask.title}" (${error.existingTask.status}). Please check if you meant to update that task instead.`,
          );
          return;
        }

        addBotMessage(
          `Failed to create task: ${error.error || "Unknown error"}`,
        );
      }
    } catch {
      addBotMessage("Error creating task.");
    }
  };

  const uploadAttachmentsToTask = async (taskId: string) => {
    if (attachedFiles.length === 0) return;
    try {
      for (const file of attachedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("filename", file.name);
        await fetch(`/api/task-management/${taskId}/attachments`, {
          method: "POST",
          headers: { "x-user-id": String(currentUser?.id) },
          body: formData,
        });
      }
      setAttachedFiles([]);
    } catch {}
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setInput(e.target.value);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !sending) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAttachmentClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachedFiles((prev) => [...prev, ...newFiles]);
      e.target.value = "";
    }
  };

  const removeAttachedFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const findAssigneeEmailInText = (text: string): string | null => {
    const lower = text.toLowerCase();
    let bestMatch: { member: Employee; score: number } | null = null;

    for (const member of teamMembers) {
      const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
      const email = member.email.toLowerCase();

      // Exact matches for full name or email
      if (lower.includes(fullName) || lower.includes(email))
        return member.email;

      // Check for first name or last name mentions
      if (lower.includes(member.firstName.toLowerCase())) {
        return member.email;
      }
      if (lower.includes(member.lastName.toLowerCase())) {
        return member.email;
      }

      // Fuzzy matching as fallback
      const scores = [
        calculateSimilarity(member.firstName.toLowerCase(), lower),
        calculateSimilarity(member.lastName.toLowerCase(), lower),
        calculateSimilarity(fullName, lower),
        calculateSimilarity(email, lower),
      ];
      const maxScore = Math.max(...scores);

      if (maxScore > 0.6 && (!bestMatch || maxScore > bestMatch.score)) {
        bestMatch = { member, score: maxScore };
      }
    }
    return bestMatch ? bestMatch.member.email : null;
  };

  const calculateSimilarity = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    if (longer.length === 0) return 1.0;
    const editDistance = getEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  };

  const getEditDistance = (s1: string, s2: string): number => {
    const costs: number[] = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1[i - 1] !== s2[j - 1]) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  };

  const renderMessageWithMentions = (message: string) => {
    const mentionRegex = /@([A-Za-z]+\s+[A-Za-z]+)/g;
    const parts: (string | React.ReactNode)[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(message)) !== null) {
      if (match.index > lastIndex) {
        parts.push(message.substring(lastIndex, match.index));
      }
      parts.push(
        <span
          key={`mention-${match.index}`}
          className="text-blue-600 font-semibold"
        >
          {match[0]}
        </span>,
      );
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < message.length) parts.push(message.substring(lastIndex));
    return parts.length > 0 ? parts : message;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newX = e.clientX - dragOffsetRef.current.x;
      const newY = e.clientY - dragOffsetRef.current.y;

      const sidebarWidth = document.querySelector("aside")?.offsetWidth || 180;
      const minX = sidebarWidth + 24;
      const maxX = window.innerWidth - modalWidth - 24;
      const minY = 80;
      const maxY = window.innerHeight - 180;

      setPosition({
        x: Math.max(minX, Math.min(newX, maxX)),
        y: Math.max(minY, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  if (!shouldShow) return null;

  return (
    <div
      className="fixed z-50"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${modalWidth}px`,
        transition: isDragging ? "none" : "transform 0.18s ease-out",
        transform: isAnimatingTaskerBot ? "scale(0.975)" : "scale(1)",
      }}
    >
      {isOpen ? (
        <div className="flex flex-col h-[min(680px,90vh)] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          <header
            className="px-5 py-4 bg-gradient-to-b from-white to-slate-50 border-b border-slate-200 flex items-center justify-between cursor-move select-none"
            onMouseDown={(e) => {
              if ((e.target as HTMLElement).closest("button")) return;
              setIsDragging(true);
              dragOffsetRef.current = {
                x: e.clientX - position.x,
                y: e.clientY - position.y,
              };
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md ring-1 ring-blue-400/30">
                <Image
                  src="/assets/images/taskeraiLogo.png"
                  alt="TaskerBot"
                  width={38}
                  height={38}
                  priority
                />
              </div>
              <div>
                <div className="font-semibold text-slate-900 text-base">
                  TaskerBot
                </div>
                <div className="text-xs text-slate-500">
                  Your AI Task Assistant
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="p-2.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-800 transition-colors"
              >
                <History size={18} />
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  window.dispatchEvent(new CustomEvent("taskerBotClosed"));
                }}
                className="p-2.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </header>

          {showHistory ? (
            // History View - Full Screen
            <div className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-slate-50/30">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4 sticky top-0 bg-gradient-to-b from-white to-slate-50/30 pb-3">
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => setShowHistory(false)}
                      className="text-slate-600 hover:text-slate-800 hover:bg-slate-100 p-2 rounded-lg transition-colors"
                    >
                      <X size={18} />
                    </button>
                    <History size={18} className="text-slate-600" />
                    <h3 className="text-lg font-semibold text-slate-800">
                      Conversations
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      createNewSession();
                      setShowHistory(false);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <Plus size={14} /> New chat
                  </button>
                </div>

                {chatSessions.length === 0 ? (
                  <div className="text-center py-16 text-slate-500">
                    <History size={32} className="mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No previous conversations yet</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-w-2xl">
                    {chatSessions.map((session) => (
                      <div
                        key={session.id}
                        onClick={() => {
                          loadSession(session.id);
                          setShowHistory(false);
                        }}
                        className={`group p-4 rounded-xl cursor-pointer transition-all border ${
                          session.id === currentSessionId
                            ? "bg-blue-50 border-blue-200 shadow-md"
                            : "border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-800">
                              {session.title}
                            </div>
                            <div className="text-sm text-slate-600 line-clamp-2 mt-1">
                              {getSessionPreview(session)}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSession(session.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors flex-shrink-0"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="mt-2 text-xs text-slate-500 flex items-center gap-2">
                          <Clock size={12} />
                          <span>{getRelativeTime(session.lastUpdated)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Chat View
            <main
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto px-5 py-6 space-y-6 bg-gradient-to-b from-white to-slate-50/30"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl mb-6">
                    <MessageCircle size={32} className="text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-800 mb-3">
                    Hey there! 👋
                  </h3>
                  <p className="text-sm text-slate-600 max-w-xs leading-relaxed">
                    I'm TaskerBot — your personal task assistant.
                    <br />
                    Create tasks, assign people, set priorities, or just chat.
                  </p>
                  <p className="text-xs text-slate-500 mt-6">
                    Start typing anything...
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id}>
                    {msg.type === "user" ? (
                      <div className="flex justify-end">
                        <div className="max-w-[78%]">
                          <div className="bg-blue-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-none shadow-sm text-sm leading-relaxed">
                            {renderMessageWithMentions(msg.message)}
                          </div>
                          <div className="text-xs text-slate-400 mt-1.5 text-right">
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm flex-shrink-0 mt-0.5 ring-1 ring-blue-400/30">
                          <Image
                            src="/assets/images/taskeraiLogo.png"
                            alt="TaskerBot"
                            width={32}
                            height={32}
                          />
                        </div>
                        <div className="flex-1 max-w-[78%]">
                          <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
                            {typingMessageId === msg.id
                              ? typingText
                              : msg.message}
                            {typingMessageId === msg.id && (
                              <span className="inline-block w-1.5 h-4 bg-slate-400 ml-1 animate-pulse rounded-sm" />
                            )}
                          </div>
                          <div className="mt-1.5 text-xs text-slate-500 flex items-center gap-2">
                            <span className="font-medium">TaskerBot</span>
                            <span>•</span>
                            <span>
                              {new Date(msg.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          {msg.buttons &&
                            msg.buttons.length > 0 &&
                            !usedButtonMessageIds.has(msg.id) && (
                              <div className="flex flex-wrap gap-2.5 mt-4">
                                {msg.buttons.map((btn, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() =>
                                      handleButtonClick(
                                        btn.action,
                                        btn.value,
                                        msg.id,
                                      )
                                    }
                                    className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 shadow-sm ${
                                      btn.action.includes("confirm") ||
                                      btn.action.includes("create") ||
                                      btn.action.includes("yes")
                                        ? "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
                                        : btn.action.includes("cancel") ||
                                            btn.action.includes("delete")
                                          ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 active:bg-red-200"
                                          : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 active:bg-slate-300"
                                    }`}
                                  >
                                    {btn.label}
                                  </button>
                                ))}
                              </div>
                            )}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}

              {sending && (
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                    <Image
                      src="/assets/images/taskeraiLogo.png"
                      alt=""
                      width={32}
                      height={32}
                    />
                  </div>
                  <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm text-sm text-slate-500">
                    thinking...
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </main>
          )}

          {!showHistory && (
            <footer className="p-4 border-t border-slate-200 bg-white">
              {attachedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {attachedFiles.map((file, i) => (
                    <div
                      key={i}
                      className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 bg-slate-100 rounded-full text-xs text-slate-700 border border-slate-200 shadow-sm"
                    >
                      <Paperclip size={14} className="text-slate-500" />
                      <span className="max-w-[180px] truncate font-medium">
                        {file.name}
                      </span>
                      <button
                        onClick={() => removeAttachedFile(i)}
                        className="ml-1 p-1 rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-700"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="relative flex items-center">
                <button
                  onClick={handleAttachmentClick}
                  className="absolute left-4 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                  disabled={sending}
                >
                  <Paperclip size={18} />
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />

                <input
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything or create a task..."
                  className={`w-full pl-12 pr-14 py-3.5 bg-slate-50 border border-slate-200 rounded-full text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200/50 focus:bg-white transition-all duration-200 disabled:opacity-60`}
                  disabled={sending}
                />

                <button
                  onClick={handleSendMessage}
                  disabled={sending || !input.trim()}
                  className={`absolute right-2 p-2.5 rounded-full transition-all ${input.trim() && !sending ? "text-blue-600 hover:bg-blue-50 active:bg-blue-100" : "text-slate-300 cursor-not-allowed"}`}
                >
                  <Send size={18} />
                </button>
              </div>
            </footer>
          )}
        </div>
      ) : null}
    </div>
  );
};
