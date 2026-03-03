"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader, X, MessageCircle } from "lucide-react";
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

interface User {
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<BotMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [shouldShow, setShouldShow] = useState(true);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionMatches, setMentionMatches] = useState<User[]>([]);
  const [existingTasks, setExistingTasks] = useState<any[]>([]);

  // Task creation state
  const [creationStep, setCreationStep] = useState<TaskCreationStep>(null);
  const [taskData, setTaskData] = useState<TaskData>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    if (!initialized && isOpen) {
      const loadUser = async () => {
        try {
          const user = await getCurrentUser();
          if (user) {
            setCurrentUser(user as User);

            // Fetch team members
            try {
              const membersRes = await fetch("/api/users/assignable", {
                headers: {
                  "Content-Type": "application/json",
                  "x-user-id": String(user.id),
                },
              });
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

            // Fetch existing tasks to provide context to AI
            try {
              const tasksRes = await fetch("/api/tasks", {
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

            // Request initial greeting from AI
            if (messages.length === 0) {
              try {
                const aiResponse = await generateAIResponse(
                  "Greet the user and introduce yourself as TaskerBot. Mention that you can help them create tasks or optimize existing tasks. Keep it brief and friendly.",
                );
                addBotMessage(aiResponse.response, aiResponse.buttons);
              } catch (error) {
                console.error("Failed to get initial greeting", error);
              }
            }

            setInitialized(true);
          }
        } catch (e) {
          console.error("Failed to load user", e);
        }
      };
      loadUser();
    }
  }, [isOpen, initialized, messages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      timestamp: new Date().toLocaleTimeString(),
      buttons: buttons,
      showOptions: buttons ? true : false,
    };
    setMessages((prev) => [...prev, botMsg]);
    if (nextStep) {
      setCreationStep(nextStep);
    }
  };

  const handleButtonClick = async (action: string, value?: any) => {
    if (action === "start_creation") {
      setCreationStep("title");
      addBotMessage(
        "👋 Hi! What should we call this task?",
        undefined,
        "title",
      );
    } else if (action === "view_tasks") {
      // Redirect to tasks page
      setIsOpen(false);
      router.push("/tasks");
    } else if (action === "optimize") {
      setCreationStep(null);
      // Handle optimization
      const response = await handleOptimization();
      addBotMessage(response.message, response.buttons);
    } else if (action === "confirm_title_yes") {
      setTaskData((prev) => ({ ...prev }));
      addBotMessage("Add a description?", [
        { label: "Yes", action: "description_yes" },
        { label: "Skip", action: "description_skip" },
      ]);
    } else if (action === "confirm_title_no") {
      setTaskData((prev) => ({ ...prev, title: "" }));
      addBotMessage(
        "Let's try again. What should we call this task?",
        undefined,
        "title",
      );
    } else if (action === "description_yes") {
      setCreationStep("description");
      addBotMessage(
        "Got it! What's the description?",
        undefined,
        "description",
      );
    } else if (action === "description_skip") {
      addBotMessage(
        "Who should this task be assigned to?",
        teamMembers.map((member) => ({
          label: `${member.firstName} ${member.lastName}`,
          action: "assign_member",
          value: member.id,
        })),
        "assignee",
      );
    } else if (action === "assign_member") {
      const member = teamMembers.find((m) => m.id === value);
      setTaskData((prev) => ({ ...prev, assigneeId: value }));
      addBotMessage(
        `Assigned to ${member?.firstName} ${member?.lastName}. What's the due date?`,
        undefined,
        "duedate",
      );
    } else if (action === "priority_select") {
      setTaskData((prev) => ({ ...prev, priority: value }));

      // Show summary
      const assignee = teamMembers.find((m) => m.id === taskData.assigneeId);
      const summary = `📋 **Task Summary**\n\n**Title:** ${taskData.title}\n${
        taskData.description ? `**Description:** ${taskData.description}\n` : ""
      }**Assigned to:** ${assignee?.firstName} ${assignee?.lastName}\n**Due:** ${taskData.dueDate}\n**Priority:** ${value.toUpperCase()}`;

      addBotMessage(summary, [
        { label: "Yes, create it", action: "create_task_final" },
        { label: "Edit", action: "edit_task" },
        { label: "Cancel", action: "cancel_task" },
      ]);
    } else if (action === "create_task_final") {
      await createTask();
      setCreationStep(null);
      setTaskData({});
    } else if (action === "edit_task") {
      setCreationStep("title");
      addBotMessage(
        "Let's edit. What should the title be?",
        undefined,
        "title",
      );
    } else if (action === "cancel_task") {
      setCreationStep(null);
      setTaskData({});
      addBotMessage("No problem! What else can I help you with?", [
        { label: "Create another task", action: "start_creation" },
        { label: "Optimize tasks", action: "optimize" },
      ]);
    }
  };

  const handleOptimization = async (): Promise<{
    message: string;
    buttons?: BotButton[];
  }> => {
    try {
      const tasksRes = await fetch("/api/tasks", {
        headers: {
          "x-user-id": String(currentUser?.id),
        },
      });

      if (!tasksRes.ok) {
        return { message: "❌ Failed to fetch your tasks." };
      }

      const tasksData = await tasksRes.json();
      const tasks = Array.isArray(tasksData?.tasks) ? tasksData.tasks : [];

      if (tasks.length === 0) {
        return {
          message: "📋 You don't have any tasks yet. Create some first!",
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
          message: "⚠️ Circular dependencies detected in your task graph.",
        };
      }

      const criticalResult = findCriticalPath(graph);
      const pathString = formatPath(criticalResult);
      const taskCount = criticalResult.path.length;
      const totalDays = criticalResult.totalDuration.toFixed(1);

      let response = `🚀 **Optimization Results**\n\n`;
      response += `Critical path: **${pathString}**\n`;
      response += `Tasks: ${taskCount} | Duration: **${totalDays} days**`;

      return { message: response };
    } catch (error) {
      console.error("Optimization error:", error);
      return { message: "❌ Failed to optimize tasks." };
    }
  };

  const handleNaturalLanguage = (text: string) => {
    if (!creationStep) return false;

    // If we're expecting a title
    if (creationStep === "title") {
      setTaskData((prev) => ({ ...prev, title: text }));
      addBotMessage(`Confirm title is "${text}"?`, [
        { label: "Yes", action: "confirm_title_yes" },
        { label: "No", action: "confirm_title_no" },
      ]);
      return true;
    }

    // If we're expecting a description
    if (creationStep === "description") {
      setTaskData((prev) => ({ ...prev, description: text }));
      addBotMessage(
        "Who should this task be assigned to?",
        teamMembers.map((member) => ({
          label: `${member.firstName} ${member.lastName}`,
          action: "assign_member",
          value: member.id,
        })),
        "assignee",
      );
      return true;
    }

    // If we're expecting an assignee
    if (creationStep === "assignee") {
      console.log("handleNaturalLanguage - assignee step, text:", text);
      // Check if the user mentioned someone
      const mentionedUserId = extractMentionedUserId(text);
      console.log("handleNaturalLanguage - mentionedUserId:", mentionedUserId);
      if (mentionedUserId) {
        setTaskData((prev) => ({ ...prev, assigneeId: mentionedUserId }));
        setCreationStep("duedate");
        addBotMessage(
          "When is this task due? (You can say 'no due date')",
          undefined,
          "duedate",
        );
        return true;
      }

      // Otherwise, skip assignee and move to due date
      setCreationStep("duedate");
      addBotMessage(
        "When is this task due? (You can say 'no due date')",
        undefined,
        "duedate",
      );
      return true;
    }

    // If we're expecting a due date
    if (creationStep === "duedate") {
      setTaskData((prev) => ({ ...prev, dueDate: text }));
      addBotMessage("Priority level?", [
        { label: "Low", action: "priority_select", value: "low" },
        { label: "Medium", action: "priority_select", value: "medium" },
        { label: "High", action: "priority_select", value: "high" },
      ]);
      return true;
    }

    return false;
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !currentUser) return;

    const userMessage: BotMessage = {
      id: Date.now().toString(),
      type: "user",
      message: input,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const userInput = input;
    setInput("");
    setSending(true);

    try {
      // Check if user is in task creation flow
      const handled = handleNaturalLanguage(userInput);

      if (!handled) {
        // User is asking random questions during task creation
        if (creationStep) {
          // Respond like an AI assistant, then redirect
          const aiResponse = await generateAIResponse(userInput);
          addBotMessage(aiResponse.response);

          // Redirect to the current step
          setTimeout(() => {
            if (creationStep === "title") {
              addBotMessage(
                "Anyway, what should we call this task?",
                undefined,
                "title",
              );
            } else if (creationStep === "description") {
              addBotMessage(
                "So, what's the description for this task?",
                undefined,
                "description",
              );
            } else if (creationStep === "assignee") {
              addBotMessage(
                "Back to: Who should this task be assigned to?",
                teamMembers.map((member) => ({
                  label: `${member.firstName} ${member.lastName}`,
                  action: "assign_member",
                  value: member.id,
                })),
                "assignee",
              );
            } else if (creationStep === "duedate") {
              addBotMessage(
                "Let's get back on track. When's the due date?",
                undefined,
                "duedate",
              );
            } else if (creationStep === "priority") {
              addBotMessage(
                "What's the priority level?",
                [
                  { label: "Low", action: "priority_select", value: "low" },
                  {
                    label: "Medium",
                    action: "priority_select",
                    value: "medium",
                  },
                  { label: "High", action: "priority_select", value: "high" },
                ],
                "priority",
              );
            }
          }, 1000);
        } else {
          // No active task creation, respond normally
          const response = await generateAIResponse(userInput);
          addBotMessage(response.response);
        }
      }
    } catch (error) {
      console.error("Error:", error);
      const errorMessage: BotMessage = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        message: "❌ Something went wrong. Please try again.",
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setSending(false);
    }
  };

  const generateAIResponse = async (
    input: string,
  ): Promise<{ response: string; buttons?: BotButton[] }> => {
    try {
      // Build task context for the AI
      let taskContext = "";
      if (existingTasks.length > 0) {
        taskContext = `\n\nCurrent user tasks:\n${existingTasks
          .map(
            (task) =>
              `- ${task.title} (Status: ${task.status}, Priority: ${task.priority || "N/A"})`,
          )
          .join("\n")}`;
      }

      const response = await fetch("/api/task-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: input + taskContext,
          userId: currentUser?.id,
        }),
      });

      if (!response.ok) {
        return {
          response:
            "I had a little hiccup connecting to my brain. Try again? 🧠",
        };
      }

      const data = await response.json();
      return {
        response: data.message || "Got it! What else can I help with?",
      };
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      return {
        response: "Oops, something went wrong. Let me get back on track! 🤖",
      };
    }
  };

  const createTask = async () => {
    try {
      const response = await fetch("/api/tasks", {
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
          assigneeId: taskData.assigneeId,
          tags: ["taskerbot"],
        }),
      });

      if (response.ok) {
        const created = await response.json();

        // Refresh existing tasks list so AI has updated context
        try {
          const tasksRes = await fetch("/api/tasks", {
            headers: {
              "x-user-id": String(currentUser?.id),
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

        addBotMessage(
          `🎉 Task created! "${taskData.title}"\n\n✅ Ready to create another?`,
          [
            { label: "Create another task", action: "start_creation" },
            { label: "View in Tasks", action: "view_tasks" },
          ],
        );

        // Reset task creation state for next task
        setTaskData({});
        setCreationStep(null);
      } else {
        addBotMessage("❌ Failed to create task. Please try again.");
      }
    } catch (error) {
      console.error("Error creating task:", error);
      addBotMessage("❌ Error creating task. Please try again.");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);

    // Check for @ mention
    const lastAtIndex = value.lastIndexOf("@");
    if (lastAtIndex !== -1 && lastAtIndex === value.length - 1) {
      // Just typed @ with nothing after - show all members except self
      setMentionQuery("");
      const filteredMembers = teamMembers.filter(
        (m) => m.id !== currentUser?.id,
      );
      setMentionMatches(filteredMembers);
      setShowMentions(filteredMembers.length > 0);
    } else if (lastAtIndex !== -1) {
      const afterAt = value.substring(lastAtIndex + 1);
      // Only show mentions if we're in the middle of typing a mention (no spaces after @)
      if (!afterAt.includes(" ")) {
        const query = afterAt.toLowerCase();
        setMentionQuery(query);
        const matches = teamMembers
          .filter((m) => m.id !== currentUser?.id) // Exclude self
          .filter(
            (member) =>
              `${member.firstName} ${member.lastName}`
                .toLowerCase()
                .includes(query) || member.email.toLowerCase().includes(query),
          );
        setMentionMatches(matches);
        setShowMentions(matches.length > 0);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const handleSelectMention = (user: User) => {
    const lastAtIndex = input.lastIndexOf("@");
    const beforeAt = input.substring(0, lastAtIndex);
    const mentionText = `@${user.firstName} ${user.lastName}`;
    setInput(beforeAt + mentionText + " ");
    setShowMentions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !sending) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const extractMentionedUserId = (message: string): number | null => {
    // Parse mentions in the format @FirstName LastName
    const mentionRegex = /@([A-Za-z]+\s+[A-Za-z]+)/;
    const match = message.match(mentionRegex);

    console.log("extractMentionedUserId - message:", message);
    console.log("extractMentionedUserId - match:", match);
    console.log("extractMentionedUserId - teamMembers:", teamMembers);

    if (match && match[1]) {
      const mentionedName = match[1];
      console.log("extractMentionedUserId - mentionedName:", mentionedName);
      // Find the user with matching name
      const mentionedUser = teamMembers.find(
        (member) =>
          `${member.firstName} ${member.lastName}`.toLowerCase() ===
          mentionedName.toLowerCase(),
      );
      console.log("extractMentionedUserId - mentionedUser:", mentionedUser);
      return mentionedUser?.id || null;
    }
    return null;
  };

  const renderMessageWithMentions = (message: string) => {
    // Parse mentions in the format @FirstName LastName
    const mentionRegex = /@([A-Za-z]+\s+[A-Za-z]+)/g;
    const parts: (string | React.ReactNode)[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(message)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(message.substring(lastIndex, match.index));
      }

      // Add mention with blue font color
      parts.push(
        <span
          key={`mention-${match.index}`}
          style={{
            color: "#60a5fa",
            fontWeight: "600",
          }}
        >
          {match[0]}
        </span>,
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < message.length) {
      parts.push(message.substring(lastIndex));
    }

    return parts.length > 0 ? parts : message;
  };

  if (!shouldShow) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 40,
        fontFamily: "var(--font-inria-sans, system-ui)",
      }}
    >
      {isOpen ? (
        <div
          style={{
            width: "380px",
            height: "600px",
            background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
            borderRadius: "16px",
            border: "1px solid rgba(168, 85, 247, 0.3)",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "16px",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background:
                "linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(99, 102, 241, 0.1))",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #a855f7, #6366f1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                }}
              >
                ✨
              </div>
              <div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#fff",
                  }}
                >
                  TaskerBot
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "rgba(255,255,255,0.6)",
                  }}
                >
                  Task Optimizer
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.6)",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.type === "user" ? (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      marginBottom: "8px",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "75%",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        background: "rgba(59, 130, 246, 0.2)",
                        border: "1px solid rgba(59, 130, 246, 0.3)",
                        color: "#fff",
                        fontSize: "13px",
                        wordBreak: "break-word",
                      }}
                    >
                      {renderMessageWithMentions(msg.message)}
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      marginBottom: "8px",
                      alignItems: "flex-end",
                    }}
                  >
                    <div
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #a855f7, #6366f1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        fontSize: "14px",
                      }}
                    >
                      ✨
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          borderRadius: "8px",
                          padding: "10px 12px",
                          background:
                            "linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(99, 102, 241, 0.15))",
                          border: "1px solid rgba(168, 85, 247, 0.2)",
                          color: "#fff",
                          fontSize: "12px",
                          wordBreak: "break-word",
                          lineHeight: "1.5",
                        }}
                      >
                        <p
                          style={{
                            margin: "0 0 8px 0",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {msg.message}
                        </p>
                      </div>

                      {/* Buttons */}
                      {msg.buttons && msg.buttons.length > 0 && (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              msg.buttons.length > 2 ? "1fr 1fr" : "1fr",
                            gap: "8px",
                            marginTop: "10px",
                          }}
                        >
                          {msg.buttons.map((btn, idx) => (
                            <button
                              key={idx}
                              onClick={() =>
                                handleButtonClick(btn.action, btn.value)
                              }
                              style={{
                                padding: "8px 12px",
                                borderRadius: "8px",
                                background: "rgba(59, 130, 246, 0.3)",
                                border: "1px solid rgba(59, 130, 246, 0.5)",
                                color: "#fff",
                                cursor: "pointer",
                                fontSize: "11px",
                                fontWeight: "600",
                                transition: "all 0.2s",
                                textAlign: "center",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background =
                                  "rgba(59, 130, 246, 0.5)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background =
                                  "rgba(59, 130, 246, 0.3)";
                              }}
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
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div
            style={{
              padding: "12px",
              borderTop: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              gap: "8px",
              alignItems: "flex-start",
              background: "rgba(0,0,0,0.2)",
              position: "relative",
            }}
          >
            <div style={{ flex: 1, position: "relative" }}>
              <input
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask or create a task... (type @ to mention)"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "20px",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff",
                  fontSize: "12px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                disabled={sending}
              />
              {/* Mentions Dropdown */}
              {showMentions && mentionMatches.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "100%",
                    left: 0,
                    right: 0,
                    background: "rgba(30, 30, 40, 0.95)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "8px",
                    maxHeight: "200px",
                    overflowY: "auto",
                    marginBottom: "4px",
                    zIndex: 1000,
                  }}
                >
                  {mentionMatches.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => handleSelectMention(user)}
                      style={{
                        padding: "8px 12px",
                        cursor: "pointer",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          "rgba(255,255,255,0.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <div style={{ color: "#fff", fontSize: "12px" }}>
                        {user.firstName} {user.lastName}
                      </div>
                      <div
                        style={{
                          color: "rgba(255,255,255,0.6)",
                          fontSize: "11px",
                        }}
                      >
                        {user.email}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handleSendMessage}
              disabled={sending || !input.trim()}
              style={{
                padding: "8px 12px",
                borderRadius: "20px",
                background: sending
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(168, 85, 247, 0.3)",
                border: "1px solid rgba(168, 85, 247, 0.3)",
                color: "#fff",
                cursor: sending ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: sending || !input.trim() ? 0.5 : 1,
                transition: "all 0.2s",
              }}
            >
              {sending ? (
                <Loader size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #a855f7, #6366f1)",
            border: "none",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(168, 85, 247, 0.4)",
            transition: "all 0.3s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.1)";
            e.currentTarget.style.boxShadow =
              "0 8px 16px rgba(168, 85, 247, 0.6)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow =
              "0 4px 12px rgba(168, 85, 247, 0.4)";
          }}
        >
          <MessageCircle size={24} />
        </button>
      )}
    </div>
  );
};
