"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  X,
  MessageCircle,
  CheckCircle,
  AlertTriangle,
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
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface TaskData {
  title?: string;
  description?: string;
  assigneeId?: number;
  dueDate?: string;
  priority?: "low" | "medium" | "high";
}

interface ChatSession {
  id: string;
  title: string;
  messages: BotMessage[];
  createdAt: string;
  lastUpdated: string;
}

// Response structure returned from /api/task-chat
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
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [messages, setMessages] = useState<BotMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [teamMembers, setTeamMembers] = useState<Employee[]>([]);
  const [shouldShow, setShouldShow] = useState(true);
  const [existingTasks, setExistingTasks] = useState<any[]>([]);

  // Animation states
  const [isAnimatingTaskerBot, setIsAnimatingTaskerBot] = useState(false);
  const [isRingingBell, setIsRingingBell] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const bellTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Add animation CSS
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes taskerBotPulse {
        0%, 100% { transform: scale(1) rotate(0deg); }
        25% { transform: scale(1.08) rotate(-3deg); }
        50% { transform: scale(1.12) rotate(3deg); }
        75% { transform: scale(1.08) rotate(-2deg); }
      }
      @keyframes bellRing {
        0%, 100% { transform: rotate(0deg); }
        10% { transform: rotate(-15deg); }
        20% { transform: rotate(15deg); }
        30% { transform: rotate(-15deg); }
        40% { transform: rotate(15deg); }
        50% { transform: rotate(-10deg); }
        60% { transform: rotate(10deg); }
        70% { transform: rotate(-5deg); }
        80% { transform: rotate(5deg); }
        90% { transform: rotate(-2deg); }
      }
      .animate-taskerbot-pulse {
        animation: taskerBotPulse 0.6s ease-in-out;
      }
      .animate-bell-ring {
        animation: bellRing 0.6s ease-in-out;
        transform-origin: center top;
      }
      .animate-bell-continuous {
        animation: bellRing 0.6s ease-in-out infinite;
        transform-origin: center top;
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  // Listen for new notifications
  useEffect(() => {
    const handleNewNotification = (event: MessageEvent) => {
      setIsRingingBell(true);
      setUnreadCount((prev) => prev + 1);
      if (bellTimeoutRef.current) clearTimeout(bellTimeoutRef.current);
      bellTimeoutRef.current = setTimeout(() => setIsRingingBell(false), 1000);
    };

    const handleNotificationEvent = () => {
      handleNewNotification(new MessageEvent("notification"));
    };

    window.addEventListener("newNotification", handleNotificationEvent);
    return () =>
      window.removeEventListener("newNotification", handleNotificationEvent);
  }, []);

  // Trigger TaskerBot animation when modal closes
  const handleTaskerBotToggle = () => {
    setIsAnimatingTaskerBot(true);
    setTimeout(() => setIsAnimatingTaskerBot(false), 1000);
    setIsOpen(!isOpen);
  };

  // Clear animation timeout on unmount
  useEffect(() => {
    return () => {
      if (bellTimeoutRef.current) clearTimeout(bellTimeoutRef.current);
    };
  }, []);

  // Task creation state
  const [creationStep, setCreationStep] = useState<TaskCreationStep>(null);
  const [taskData, setTaskData] = useState<TaskData>({});

  // Session management
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Drag state for draggable modal
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const modalWidth = 545;
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Attachment state
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  // Typewriter effect state
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [typingText, setTypingText] = useState("");
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkPage = () => {
      const currentPath = window.location.pathname;
      const excluded = excludePages?.some((page) =>
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
      const defaultX = window.innerWidth - modalWidth - 20;
      const defaultY = 100;
      setPosition({ x: defaultX, y: defaultY });
    }
  }, [isOpen, position]);

  useEffect(() => {
    if (!initialized && isOpen) {
      const loadUser = async () => {
        try {
          const user = await getCurrentUser();
          if (user) {
            setCurrentEmployee(user as Employee);

            try {
              const membersRes = await fetch(
                "/api/user-management/assignable",
                {
                  headers: {
                    "Content-Type": "application/json",
                    "x-user-id": String(user.id),
                  },
                },
              );
              if (membersRes.ok) {
                const data = await membersRes.json();
                console.log("Fetched team members:", data);
                setTeamMembers(data.users || []);
              } else {
                console.error(
                  "Failed to fetch team members:",
                  membersRes.status,
                );
              }
            } catch (e) {
              console.error("Failed to fetch team members", e);
            }

            try {
              const tasksRes = await fetch("/api/task-management", {
                headers: {
                  "x-user-id": String(user.id),
                },
              });
              if (tasksRes.ok) {
                const tasksData = await tasksRes.json();
                const tasks = Array.isArray(tasksData?.tasks)
                  ? tasksData.tasks
                  : [];
                setExistingTasks(tasks);
                console.log("Fetched tasks for AI context:", tasks);
              }
            } catch (e) {
              console.error("Failed to fetch tasks", e);
            }

            // Create new session if none exists
            if (!currentSessionId) {
              createNewSession();
            }

            setInitialized(true);
          }
        } catch (e) {
          console.error("Failed to load user", e);
        }
      };
      loadUser();
    }
  }, [isOpen, initialized, messages.length, currentSessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingText]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Load chat sessions from localStorage
  useEffect(() => {
    const savedSessions = localStorage.getItem("taskerBotSessions");
    if (savedSessions) {
      try {
        const sessions = JSON.parse(savedSessions);
        setChatSessions(sessions);
      } catch (error) {
        console.error("Failed to load chat sessions:", error);
      }
    }

    // Create initial session if none exists
    if (!currentSessionId) {
      createNewSession();
    }
  }, []);

  // Save current session when messages change
  useEffect(() => {
    if (currentSessionId && messages.length > 0) {
      saveCurrentSession();
    }
  }, [messages, currentSessionId]);

  const generateSessionId = () => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Helper function to format relative time
  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Get preview text from session
  const getSessionPreview = (session: ChatSession): string => {
    // Find first user message for preview
    const userMsg = session.messages.find((m) => m.type === "user");
    if (userMsg) {
      return userMsg.message.slice(0, 60);
    }
    return "Empty conversation";
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

    const sessionTitle = messages[0]?.message?.slice(0, 50) || "New Chat";
    const session: ChatSession = {
      id: currentSessionId,
      title: sessionTitle,
      messages: [...messages],
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };

    setChatSessions((prev) => {
      const existing = prev.find((s) => s.id === currentSessionId);
      if (existing) {
        const updated = prev.map((s) =>
          s.id === currentSessionId ? session : s,
        );
        localStorage.setItem("taskerBotSessions", JSON.stringify(updated));
        return updated;
      } else {
        const updated = [session, ...prev].slice(0, 50); // Keep only last 50 sessions
        localStorage.setItem("taskerBotSessions", JSON.stringify(updated));
        return updated;
      }
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

    if (currentSessionId === sessionId) {
      createNewSession();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
      buttons: buttons,
      showOptions: buttons ? true : false,
    };
    setMessages((prev) => [...prev, botMsg]);
    if (nextStep) {
      setCreationStep(nextStep);
    }
  };

  // Stream text with typewriter effect
  const streamTypewriterMessage = (
    messageText: string,
    buttons?: BotButton[],
  ) => {
    const messageId = (Date.now() + Math.random()).toString();

    // Add initial empty message
    const botMsg: BotMessage = {
      id: messageId,
      type: "bot",
      message: "",
      timestamp: new Date().toISOString(),
      buttons: buttons,
      showOptions: buttons ? true : false,
    };

    setMessages((prev) => [...prev, botMsg]);
    setTypingMessageId(messageId);
    setTypingText("");

    let charIndex = 0;
    const typeNextChar = () => {
      if (charIndex < messageText.length) {
        const nextChar = messageText[charIndex];
        setTypingText((prev) => prev + nextChar);
        charIndex++;

        // Vary speed slightly for natural feel - faster typing
        const speed = Math.random() > 0.9 ? 20 : 10; // Occasional slower chars
        typingTimeoutRef.current = setTimeout(typeNextChar, speed);
      } else {
        // Done typing - update the message permanently
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

  const handleButtonClick = async (action: string, value?: any) => {
    if (action === "start_creation") {
      // Let AI ask the first question
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
      setIsOpen(false);
      if (value) {
        router.push(`/tasks?focus=${value}`);
      } else {
        router.push("/tasks");
      }
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
      setTaskData((prev) => ({ ...prev }));
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
      const summaryText = `Task: ${taskData.title}. Assigned to: ${assignee?.firstName} ${assignee?.lastName}. Priority: ${value}`;
      const aiResponse = await generateAIResponse(
        `Confirm task creation with these details: ${summaryText}`,
      );
      streamTypewriterMessage(
        aiResponse.response || "Ready to create this task?",
        [
          { label: "Yes, create it", action: "create_task_final" },
          { label: "Edit", action: "edit_task" },
          { label: "Cancel", action: "cancel_task" },
        ],
      );
    } else if (action === "create_task_final") {
      await createTask();
      setCreationStep(null);
      setTaskData({});
    } else if (action === "confirm_task") {
      // This is from AI confirmation - create task with stored taskData
      await createTask();
      setCreationStep(null);
      setTaskData({});
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
      setTaskData({});
      const aiResponse = await generateAIResponse(
        "I'd like to cancel creating this task",
      );
      streamTypewriterMessage(
        aiResponse.response || "No problem! What else can I help you with?",
        aiResponse.buttons,
      );
    }
  };

  const handleOptimization = async (): Promise<{
    message: string;
    buttons?: BotButton[];
  }> => {
    try {
      const tasksRes = await fetch("/api/task-management", {
        headers: {
          "x-user-id": String(currentEmployee?.id),
        },
      });

      if (!tasksRes.ok) {
        return { message: "Failed to fetch your tasks." };
      }

      const tasksData = await tasksRes.json();
      const tasks = Array.isArray(tasksData?.tasks) ? tasksData.tasks : [];

      if (tasks.length === 0) {
        return {
          message: "You don't have any tasks yet. Create some first!",
        };
      }

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
        dependencies: [],
      }));

      const graph = buildTaskGraph(dijkstraTasks as DijkstraTaskNode[]);

      if (hasCircularDependencies(graph)) {
        return {
          message: "Circular dependencies detected in your task graph.",
        };
      }

      const criticalResult = findCriticalPath(graph);
      const pathString = formatPath(criticalResult);
      const taskCount = criticalResult.path.length;
      const totalDays = criticalResult.totalDuration.toFixed(1);

      const response = `Optimization Results\n\nCritical path: ${pathString}\nTasks: ${taskCount} | Duration: ${totalDays} days`;
      return { message: response };
    } catch (error) {
      console.error("Optimization error:", error);
      return { message: "Failed to optimize tasks." };
    }
  };

  const handleNaturalLanguage = (text: string) => {
    // Always let AI handle all responses - completely disable the wizard
    return false;
  };

  // Fuzzy matching helper function
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
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
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

  const findAssigneeEmailInText = (text: string): string | null => {
    const lower = text.toLowerCase();
    let bestMatch: { member: Employee; score: number } | null = null;

    // Search for exact or similar matches
    for (const member of teamMembers) {
      const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
      const email = member.email.toLowerCase();

      // Exact match
      if (lower.includes(fullName) || lower.includes(email)) {
        return member.email;
      }

      // Fuzzy match first name
      const firstNameScore = calculateSimilarity(
        member.firstName.toLowerCase(),
        lower,
      );
      // Fuzzy match last name
      const lastNameScore = calculateSimilarity(
        member.lastName.toLowerCase(),
        lower,
      );
      // Fuzzy match full name
      const fullNameScore = calculateSimilarity(fullName, lower);
      // Fuzzy match email
      const emailScore = calculateSimilarity(email, lower);

      const maxScore = Math.max(
        firstNameScore,
        lastNameScore,
        fullNameScore,
        emailScore,
      );

      if (maxScore > 0.6 && (!bestMatch || maxScore > bestMatch.score)) {
        bestMatch = { member, score: maxScore };
      }
    }

    return bestMatch ? bestMatch.member.email : null;
  };

  // format basic task info as a markdown table
  const formatTaskTable = (task: {
    title?: string | null;
    description?: string | null;
    assigneeEmail?: string | null;
    dueDate?: string | null;
    priority?: string | null;
  }) => {
    const rows = ["| Field | Value |", "| ----- | ----- |"];
    if (task.title) rows.push(`| Title | ${task.title} |`);
    if (task.description) rows.push(`| Description | ${task.description} |`);
    if (task.assigneeEmail) rows.push(`| Assignee | ${task.assigneeEmail} |`);
    if (task.dueDate) rows.push(`| Due Date | ${task.dueDate} |`);
    if (task.priority) rows.push(`| Priority | ${task.priority} |`);
    return rows.join("\n");
  };

  // create a task based on an AI response object
  const createTaskFromAI = async (task: {
    title?: string | null;
    description?: string | null;
    assigneeEmail?: string | null;
    dueDate?: string | null;
    priority?: "low" | "medium" | "high" | null;
    response?: string;
  }) => {
    if (!task.title) {
      console.error("Cannot create task: no title provided");
      return;
    }
    // derive email if missing
    if (!task.assigneeEmail && task.response) {
      const derived = findAssigneeEmailInText(task.response);
      if (derived) task.assigneeEmail = derived;
    }

    const assignee = teamMembers.find(
      (m) => m.email.toLowerCase() === (task.assigneeEmail || "").toLowerCase(),
    );

    if (!assignee) {
      console.error("Cannot create task: no valid assignee found", {
        assigneeEmail: task.assigneeEmail,
        teamMembers,
      });
      addBotMessage(
        "I couldn't find the assignee. Please specify who should be assigned to this task.",
      );
      return;
    }

    try {
      console.log("Creating task with data:", {
        title: task.title,
        description: task.description,
        assigneeId: assignee.id,
        dueDate: task.dueDate,
        priority: task.priority,
      });

      const res = await fetch("/api/task-management", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(currentEmployee?.id),
        },
        body: JSON.stringify({
          title: task.title,
          description: task.description || "",
          status: "todo",
          priority: task.priority || "medium",
          dueDate: task.dueDate,
          assigneeId: assignee.id,
          tags: ["taskerbot"],
        }),
      });

      if (res.ok) {
        const json = await res.json();
        console.log("Task created successfully:", json);

        // Upload attachments if any
        if (json.task?.id && attachedFiles.length > 0) {
          await uploadAttachmentsToTask(json.task.id);
        }

        // Refresh existing tasks
        const tasksRes = await fetch("/api/task-management", {
          headers: { "x-user-id": String(currentEmployee?.id) },
        });
        if (tasksRes.ok) {
          const tasksData = await tasksRes.json();
          const tasks = Array.isArray(tasksData?.tasks) ? tasksData.tasks : [];
          setExistingTasks(tasks);
        }

        // Navigate to tasks page with focus on the new task
        if (json.task?.id) {
          router.push(`/tasks?focus=${json.task.id}`);
        } else {
          router.push("/tasks");
        }
      } else {
        const errorText = await res.text();
        console.error("Task creation failed:", res.status, errorText);
        addBotMessage(`Failed to create task: ${errorText}`);
      }
    } catch (e) {
      console.error("AI-created task failed:", e);
      addBotMessage("Error creating task. Please try again.");
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !currentEmployee) return;

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
      const handled = handleNaturalLanguage(userInput);

      if (!handled) {
        // Let AI handle the response
        let aiResponse = await generateAIResponse(userInput);

        // If bot is asking for confirmation (has all info)
        if (aiResponse.action === "confirm") {
          if (!aiResponse.assigneeEmail && aiResponse.response) {
            const derived = findAssigneeEmailInText(aiResponse.response);
            if (derived) aiResponse.assigneeEmail = derived;
          }

          // Store the task data for later confirmation
          setTaskData({
            title: aiResponse.title || undefined,
            description: aiResponse.description || undefined,
            assigneeId: teamMembers.find(
              (m) =>
                m.email.toLowerCase() ===
                (aiResponse.assigneeEmail || "").toLowerCase(),
            )?.id,
            dueDate: aiResponse.dueDate || undefined,
            priority: aiResponse.priority as
              | "low"
              | "medium"
              | "high"
              | undefined,
          });

          // Show confirmation message with buttons
          streamTypewriterMessage(
            aiResponse.response || "Please confirm the task details:",
            [
              {
                label: "✓ Create Task",
                action: "confirm_task",
                value: "yes",
              },
              {
                label: "Edit",
                action: "edit_task",
                value: "edit",
              },
              {
                label: "Cancel",
                action: "cancel_task",
                value: "cancel",
              },
            ],
          );

          // Clear creation step since AI confirmed everything
          setCreationStep(null);
        } else {
          // AI is asking for more info or just chatting
          let textToShow: string | undefined = aiResponse.response;
          if (textToShow) {
            streamTypewriterMessage(textToShow, aiResponse.buttons);
          } else {
            streamTypewriterMessage(
              "Got it! What else can I help with?",
              aiResponse.buttons,
            );
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      const errorMessage: BotMessage = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        message: "❌ Something went wrong. Please try again.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
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

      const response = await fetch("/api/taskerbot-chat-endpoints", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: input + taskContext,
          userId: currentEmployee?.id,
          sessionId: currentSessionId,
          teamMembers: teamMembers.map((member) => ({
            id: member.id,
            name: `${member.firstName} ${member.lastName}`,
            email: member.email,
          })),
        }),
      });

      console.log("TaskerBot API response status:", response.status);
      console.log("TaskerBot API response ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("TaskerBot API error response:", errorText);
        return {
          response:
            "I had a little hiccup connecting to my brain. Try again? 🧠",
        };
      }

      const data = await response.json();
      console.log("TaskerBot API response data:", data);

      // Simply return the data from the API without JSON parsing
      return {
        response: data.message || "Got it! What else can I help with?",
        buttons: data.buttons,
        action: data.action,
        title: data.title,
        description: data.description,
        assigneeEmail: data.assigneeEmail,
        dueDate: data.dueDate,
        priority: data.priority,
      };
    } catch (error) {
      console.error("Error calling TaskerBot API:", error);
      return {
        response: "Oops, something went wrong. Let me get back on track! 🤖",
      };
    }
  };

  const createTask = async () => {
    try {
      if (!taskData.assigneeId) {
        streamTypewriterMessage(
          "Please select a user to assign this task to before creating it.",
          teamMembers.map((member) => ({
            label: `${member.firstName} ${member.lastName}`,
            action: "assign_member",
            value: member.id,
          })),
        );
        return;
      }

      const response = await fetch("/api/task-management", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(currentEmployee?.id),
        },
        body: JSON.stringify({
          title: taskData.title,
          description: taskData.description || "",
          status: "todo",
          priority: taskData.priority || "medium",
          dueDate: taskData.dueDate,
          assigneeId: taskData.assigneeId,
          tags: ["taskerbot"],
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Upload attachments if any
        if (data.task?.id && attachedFiles.length > 0) {
          await uploadAttachmentsToTask(data.task.id);
        }

        try {
          const tasksRes = await fetch("/api/task-management", {
            headers: {
              "x-user-id": String(currentEmployee?.id),
            },
          });
          if (tasksRes.ok) {
            const tasksData = await tasksRes.json();
            const tasks = Array.isArray(tasksData?.tasks)
              ? tasksData.tasks
              : [];
            setExistingTasks(tasks);
          }
        } catch (e) {
          console.error("Failed to refresh tasks", e);
        }

        // Get AI's confirmation message
        const aiResponse = await generateAIResponse(
          `Task "${taskData.title}" has been created successfully`,
        );
        streamTypewriterMessage(
          aiResponse.response || `Task "${taskData.title}" created!`,
          [
            {
              label: "View in Tasks",
              action: "view_created_task",
              value: data.task.id,
            },
            { label: "Create another task", action: "start_creation" },
          ],
        );

        setTaskData({});
        setCreationStep(null);
      } else {
        let errorMsg = "Failed to create task. Please try again.";
        try {
          const err = await response.json();
          if (err && err.error) errorMsg = err.error;
        } catch {}
        addBotMessage(errorMsg);
      }
    } catch (error) {
      console.error("Error creating task:", error);
      addBotMessage("Error creating task. Please try again.");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !sending) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files) {
      const newFiles = Array.from(files);
      setAttachedFiles((prev) => [...prev, ...newFiles]);
      // Reset input so the same file can be selected again
      e.currentTarget.value = "";
    }
  };

  const removeAttachedFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Upload attachments to a task
  const uploadAttachmentsToTask = async (taskId: string) => {
    if (attachedFiles.length === 0) return;

    try {
      for (const file of attachedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("filename", file.name);

        const uploadRes = await fetch(
          `/api/task-management/${taskId}/attachments`,
          {
            method: "POST",
            headers: {
              "x-user-id": String(currentEmployee?.id),
            },
            body: formData,
          },
        );

        if (!uploadRes.ok) {
          console.error("Failed to upload attachment:", file.name);
        }
      }
      // Clear attachments after successful upload
      setAttachedFiles([]);
    } catch (error) {
      console.error("Error uploading attachments:", error);
    }
  };

  const extractMentionedUserId = (message: string): number | null => {
    const lower = message.toLowerCase();
    let bestMatch: { member: Employee; score: number } | null = null;

    console.log("extractMentionedUserId - message:", message);
    console.log("extractMentionedUserId - teamMembers:", teamMembers);

    for (const member of teamMembers) {
      const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
      const email = member.email.toLowerCase();

      // Exact match - higher priority
      if (lower.includes(fullName) || lower.includes(email)) {
        console.log("extractMentionedUserId - found exact match:", member);
        return member.id;
      }

      // Fuzzy match
      const firstNameScore = calculateSimilarity(
        member.firstName.toLowerCase(),
        lower,
      );
      const lastNameScore = calculateSimilarity(
        member.lastName.toLowerCase(),
        lower,
      );
      const fullNameScore = calculateSimilarity(fullName, lower);
      const emailScore = calculateSimilarity(email, lower);

      const maxScore = Math.max(
        firstNameScore,
        lastNameScore,
        fullNameScore,
        emailScore,
      );

      if (maxScore > 0.6 && (!bestMatch || maxScore > bestMatch.score)) {
        bestMatch = { member, score: maxScore };
      }
    }

    if (bestMatch) {
      console.log(
        "extractMentionedUserId - found fuzzy match:",
        bestMatch.member,
        "with score:",
        bestMatch.score,
      );
      return bestMatch.member.id;
    }

    console.log("extractMentionedUserId - no match found");
    return null;
  };

  const handleHeaderMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;

    setIsDragging(true);
    dragOffsetRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const newX = e.clientX - dragOffsetRef.current.x;
      const newY = e.clientY - dragOffsetRef.current.y;

      const sidebar = document.querySelector("aside");
      const sidebarWidth = sidebar?.offsetWidth || 180;
      const sidePadding = 16;
      const minX = sidebarWidth + sidePadding + 8;

      const maxX = window.innerWidth - modalWidth;
      const maxY = window.innerHeight - 100;
      const headerHeight = 64;
      const minY = headerHeight;

      setPosition({
        x: Math.max(minX, Math.min(newX, maxX)),
        y: Math.max(minY, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, position]);

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

    if (lastIndex < message.length) {
      parts.push(message.substring(lastIndex));
    }

    return parts.length > 0 ? parts : message;
  };

  if (!shouldShow) return null;

  return (
    <div
      ref={containerRef}
      className="fixed z-40 font-[var(--font-inria-sans,system-ui)]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transition: isDragging ? "none" : "none",
      }}
    >
      {isOpen ? (
        <div className="w-134 h-screen max-h-[652px] bg-blue-100 backdrop-blur-lg border-2 border-black/10 rounded-sm shadow-lg flex flex-col overflow-hidden transition-all duration-200 hover:border-black/50 hover:shadow-[0_20px_25px_-5px_rgba(255,255,255,0.15)]">
          {/* Header */}
          <div
            onMouseDown={handleHeaderMouseDown}
            className="p-4 border-b bg-blue-200 border-black/10 flex items-center justify-between cursor-move hover:bg-blue-200 transition-colors select-none"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-400 to-indigo-400 flex items-center justify-center flex-shrink-0">
                <Image
                  src="/assets/images/taskeraiLogo.png"
                  alt="TaskerAI Logo"
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              </div>
              <div>
                <div className="text-sm font-semibold text-black/80">
                  TaskerBot
                </div>
                <div className="text-xs text-black/60">
                  Your Personal Task Assistant
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="bg-transparent border-none text-black/60 cursor-pointer p-1 flex items-center justify-center hover:text-black/80 transition-colors"
                title="Chat History"
              >
                <History size={14} />
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  window.dispatchEvent(new CustomEvent("taskerBotClosed"));
                }}
                className="bg-transparent border-none text-black/60 cursor-pointer p-1 flex items-center justify-center hover:text-black/80 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          </div>

          {/* History Panel */}
          {showHistory && (
            <div className="border-b border-black/10 max-h-64 overflow-y-auto bg-blue-50">
              <div className="p-3">
                {/* Header with title and new chat button */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-black/10">
                  <div className="flex items-center gap-2">
                    <History size={14} className="text-blue-600" />
                    <h3 className="text-sm font-semibold text-black/80">
                      Chat Sessions
                    </h3>
                    {chatSessions.length > 0 && (
                      <span className="text-xs text-black/50 bg-black/5 px-2 py-0.5 rounded-full">
                        {chatSessions.length}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={createNewSession}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-blue-200/50 border border-blue-400/30 text-black/80 text-xs hover:bg-blue-200 transition-colors"
                    title="Start a new conversation"
                  >
                    <Plus size={14} />
                    <span className="hidden sm:inline">New</span>
                  </button>
                </div>

                {/* Sessions list */}
                <div className="space-y-2">
                  {chatSessions.length === 0 ? (
                    <div className="text-xs text-black/60 text-center py-6 flex flex-col items-center gap-2">
                      <MessageCircle size={20} className="text-black/30" />
                      <div>No chat sessions yet</div>
                      <div className="text-black/40">
                        Start a new conversation to get help
                      </div>
                    </div>
                  ) : (
                    chatSessions.map((session) => (
                      <div
                        key={session.id}
                        className={`group p-3 rounded-lg cursor-pointer transition-all ${
                          session.id === currentSessionId
                            ? "bg-white border border-blue-300 shadow-sm"
                            : "hover:bg-white/60 border border-transparent"
                        }`}
                      >
                        {/* Session header row */}
                        <div
                          className="space-y-2"
                          onClick={() => loadSession(session.id)}
                        >
                          {/* Title */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="text-xs font-medium text-black/80 truncate flex-1">
                              {session.title}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteSession(session.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-black/40 hover:text-red-600 transition-all"
                              title="Delete session"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          {/* Preview text */}
                          <div className="text-xs text-black/60 line-clamp-2">
                            {getSessionPreview(session)}
                          </div>

                          {/* Footer with time and message count */}
                          <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-1 text-xs text-black/50">
                              <Clock size={11} />
                              <span>
                                {getRelativeTime(session.lastUpdated)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-black/50">
                              <MessageSquare size={11} />
                              <span>{session.messages.length}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 justify-center">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-400 to-indigo-400 flex items-center justify-center">
                  <MessageCircle size={24} className="text-black" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-black/80">
                    Welcome to TaskerBot
                  </h3>
                  <p className="text-xs text-black/70 max-w-xs">
                    I can help you create tasks, answer questions, or optimize
                    your workflow. Just start typing!
                  </p>
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <div key={msg.id}>
                    {msg.type === "user" ? (
                      <div className="flex justify-end mb-2">
                        <div className="flex flex-col items-end max-w-xs gap-1">
                          <div className="flex gap-2 items-center px-1">
                            <span className="text-xs text-black/50">
                              {new Date(msg.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              })}
                            </span>
                          </div>
                          <div className="bg-blue-200/50 border border-blue-400/30 rounded-lg px-3 py-2 text-black text-xs break-words max-w-xs">
                            {renderMessageWithMentions(msg.message)}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-3 mb-2 items-start">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-indigo-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Image
                            src="/assets/images/taskeraiLogo.png"
                            alt="TaskerAI Logo"
                            width={28}
                            height={28}
                            className="rounded-full"
                          />
                        </div>
                        <div className="flex-1 flex flex-col items-start max-w-sm">
                          <div className="flex gap-2 items-center mb-1">
                            <span className="text-xs font-semibold text-black/80">
                              TaskerBot
                            </span>
                            <span className="text-xs text-black/50">
                              {new Date(msg.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              })}
                            </span>
                          </div>
                          <div className="bg-blue-100 border border-black/10 rounded-lg p-3 text-black text-xs break-words leading-relaxed">
                            <p className="m-0 whitespace-pre-wrap">
                              {typingMessageId === msg.id
                                ? typingText
                                : msg.message}
                              {typingMessageId === msg.id && (
                                <span className="inline-block w-1.5 h-4 bg-black ml-0.5 align-text-bottom animate-pulse" />
                              )}
                            </p>
                          </div>

                          {/* Buttons */}
                          {msg.buttons && msg.buttons.length > 0 && (
                            <div
                              className={`grid gap-2 mt-3 ${msg.buttons.length > 2 ? "grid-cols-2" : "grid-cols-1"}`}
                            >
                              {msg.buttons.map((btn, idx) => (
                                <button
                                  key={idx}
                                  onClick={() =>
                                    handleButtonClick(btn.action, btn.value)
                                  }
                                  className="px-3 py-2 rounded-sm bg-blue-200/50 border border-blue-400/30 text-black/80 hover:bg-blue-200 cursor-pointer text-xs font-semibold transition-all duration-200 text-center"
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
                ))}
              </>
            )}

            {/* Typing Indicator When Bot is Thinking */}
            {sending && (
              <div className="flex gap-3 mb-2 items-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-indigo-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Image
                    src="/assets/images/taskeraiLogo.png"
                    alt="TaskerAI Logo"
                    width={28}
                    height={28}
                    className="rounded-full"
                  />
                </div>
                <div className="flex-1 flex flex-col items-start max-w-sm">
                  <div className="flex gap-2 items-center mb-1">
                    <span className="text-xs font-semibold text-black/80">
                      TaskerBot
                    </span>
                    <span className="text-xs text-black/50">thinking...</span>
                  </div>
                  <div className="bg-blue-100 border border-black/10 rounded-lg p-3 text-black text-xs">
                    <div className="flex gap-1 items-center">
                      <span
                        className="inline-block w-1.5 h-1.5 bg-black/20 rounded-full animate-bounce"
                        style={{ animationDelay: "0s" }}
                      />
                      <span
                        className="inline-block w-1.5 h-1.5 bg-black/20 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      />
                      <span
                        className="inline-block w-1.5 h-1.5 bg-black/20 rounded-full animate-bounce"
                        style={{ animationDelay: "0.4s" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="flex flex-col gap-2 p-3 border-t border-black/10 bg-blue-50 relative">
            {/* Attached Files Display */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 px-2 py-1 bg-blue-200/50 border border-blue-400/30 rounded text-xs text-black/80"
                  >
                    <Paperclip size={12} />
                    <span className="truncate max-w-[150px]">{file.name}</span>
                    <button
                      onClick={() => removeAttachedFile(index)}
                      className="ml-1 text-black/60 hover:text-black/80 transition-colors"
                      title="Remove file"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input and Send */}
            <div className="flex gap-0 items-center">
              {/* Text Input with Icons Inside */}
              <div className="flex-1 relative flex items-center">
                {/* Attachment Button (Left Icon) */}
                <button
                  onClick={handleAttachmentClick}
                  disabled={sending}
                  className="absolute left-3 text-black/60 hover:text-black/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center z-10"
                  title="Attach file"
                >
                  <Paperclip size={16} />
                </button>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* Text Input */}
                <input
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask or create a task..."
                  className="w-full pl-10 pr-12 py-2 rounded-full bg-white border border-black/10 text-black text-xs outline-none disabled:cursor-not-allowed disabled:opacity-50 placeholder-black/40"
                  disabled={sending}
                />

                {/* Send Button (Right Icon) */}
                <button
                  onClick={handleSendMessage}
                  disabled={sending || !input.trim()}
                  className="absolute right-3 text-black/60 hover:text-blue-600 disabled:text-black/40 disabled:cursor-not-allowed transition-colors flex items-center justify-center z-10"
                  title="Send message"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <button onClick={() => setIsOpen(true)} className="hidden">
          <MessageCircle size={24} />
        </button>
      )}
    </div>
  );
};
