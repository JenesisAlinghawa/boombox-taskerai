"use client";

import React, { useState, useRef, useEffect } from "react";
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
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<BotMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [shouldShow, setShouldShow] = useState(true);

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
              const membersRes = await fetch("/api/users/assignable");
              if (membersRes.ok) {
                const data = await membersRes.json();
                setTeamMembers(data.users || []);
              }
            } catch (e) {
              console.error("Failed to fetch team members", e);
            }

            if (messages.length === 0) {
              setMessages([
                {
                  id: "welcome",
                  type: "bot",
                  message:
                    "👋 Hi! I'm TaskerBot, your task assistant. What would you like to do?",
                  timestamp: new Date().toLocaleTimeString(),
                  buttons: [
                    { label: "Create tasks", action: "start_creation" },
                    { label: "Optimize tasks", action: "optimize" },
                  ],
                },
              ]);
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
      const response = await fetch("/api/task-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: input,
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
          status: "pending",
          priority: taskData.priority || "medium",
          dueDate: taskData.dueDate,
          assignedToId: taskData.assigneeId,
          tags: ["taskerbot"],
        }),
      });

      if (response.ok) {
        const created = await response.json();
        addBotMessage(
          `🎉 Task created! "${taskData.title}"\n\n✅ Ready to create another?`,
          [
            { label: "Create another task", action: "start_creation" },
            { label: "Optimize tasks", action: "optimize" },
          ],
        );
      } else {
        addBotMessage("❌ Failed to create task. Please try again.");
      }
    } catch (error) {
      console.error("Error creating task:", error);
      addBotMessage("❌ Error creating task. Please try again.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !sending) {
      e.preventDefault();
      handleSendMessage();
    }
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
                      {msg.message}
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
              alignItems: "center",
              background: "rgba(0,0,0,0.2)",
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask or create a task..."
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "20px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#fff",
                fontSize: "12px",
                outline: "none",
              }}
              disabled={sending}
            />
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
