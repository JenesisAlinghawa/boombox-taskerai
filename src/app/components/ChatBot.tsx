"use client";

import React, { useState, useRef, useEffect } from "react";

type MessageType = {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
};

type ConversationState = {
  action: "create" | "status" | "priority" | "assign" | "due" | null;
  params: Record<string, any>;
  nextParam?: string;
};

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const messageCounterRef = useRef(2);
  const [messages, setMessages] = useState<MessageType[]>([
    {
      id: "1",
      text: "👋 Hi! I'm your Task Assistant.\n\nYou can:\n• Type naturally: 'create a task about fixing bugs'\n• Use quick commands: 'help' for all commands\n• I'll ask for details step-by-step if needed!",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState<ConversationState>({
    action: null,
    params: {},
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addBotMessage = (text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: String(messageCounterRef.current++),
        text,
        sender: "bot",
        timestamp: new Date(),
      },
    ]);
  };

  const addUserMessage = (text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: String(messageCounterRef.current++),
        text,
        sender: "user",
        timestamp: new Date(),
      },
    ]);
  };

  const handleCreateTask = async (
    title: string,
    params: Record<string, any>
  ) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          status: "todo",
          priority: params.priority || null,
          dueDate: params.dueDate || null,
          assigneeId: params.assigneeId || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        addBotMessage(
          `✅ Task created!\n\nTitle: ${data.task.title}\nID: ${
            data.task.id
          }\nStatus: ${data.task.status}${
            data.task.priority ? `\nPriority: ${data.task.priority}` : ""
          }${
            data.task.dueDate ? `\nDue: ${data.task.dueDate.split("T")[0]}` : ""
          }`
        );
        setConversation({ action: null, params: {} });
      } else {
        addBotMessage("❌ Failed to create task. Please try again.");
      }
    } catch (error) {
      console.error("Create task error:", error);
      addBotMessage("❌ An error occurred. Please try again.");
    }
  };

  const handleConversationFlow = async (userInput: string) => {
    const lowerInput = userInput.toLowerCase().trim();

    if (conversation.action === "create") {
      const { nextParam, params } = conversation;

      if (nextParam === "due") {
        if (lowerInput === "skip") {
          setConversation({
            action: "create",
            params,
            nextParam: "priority",
          });
          addBotMessage(
            "Got it! What priority level? (high/medium/low, or say 'skip')"
          );
          return;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(lowerInput)) {
          addBotMessage(
            "❌ Invalid date format. Please use YYYY-MM-DD (or 'skip')"
          );
          return;
        }
        params.dueDate = lowerInput;
        setConversation({
          action: "create",
          params,
          nextParam: "priority",
        });
        addBotMessage(
          `Due date set to ${lowerInput}! What priority level? (high/medium/low, or say 'skip')`
        );
      } else if (nextParam === "priority") {
        if (lowerInput === "skip") {
          setConversation({
            action: "create",
            params,
            nextParam: "assignee",
          });
          addBotMessage(
            "Got it! Want to assign it to someone? (user ID, or say 'skip')"
          );
          return;
        }
        if (!["high", "medium", "low"].includes(lowerInput)) {
          addBotMessage("❌ Please use: high, medium, low (or 'skip')");
          return;
        }
        params.priority = lowerInput;
        setConversation({
          action: "create",
          params,
          nextParam: "assignee",
        });
        addBotMessage(
          `Priority set to ${lowerInput}! Want to assign it to someone? (user ID, or say 'skip')`
        );
      } else if (nextParam === "assignee") {
        if (lowerInput === "skip") {
          setLoading(true);
          await handleCreateTask(params.title, params);
          setLoading(false);
          return;
        }
        const userId = parseInt(lowerInput);
        if (isNaN(userId)) {
          addBotMessage("❌ Please provide a valid user ID (or 'skip')");
          return;
        }
        params.assigneeId = userId;
        setLoading(true);
        await handleCreateTask(params.title, params);
        setLoading(false);
      }
      return;
    }

    // Start new action from natural language
    if (
      lowerInput.includes("create") &&
      (lowerInput.includes("task") || lowerInput.includes("todo"))
    ) {
      const regex =
        /(?:create|new)\s+(?:a\s+)?task\s+(?:about|for|called|named)?\s*(.+)/i;
      const match = userInput.match(regex);
      const title = match ? match[1].trim() : "Untitled Task";

      setConversation({
        action: "create",
        params: { title },
        nextParam: "due",
      });
      addBotMessage(
        `Great! Creating a task: "${title}"\n\nDo you want to set a due date? (YYYY-MM-DD, or say 'skip')`
      );
      return;
    }

    // Handle quick commands
    const parts = lowerInput.split(/\s+/);
    const action = parts[0];

    setLoading(true);
    try {
      if (action === "help") {
        addBotMessage(
          "📋 Available Commands:\n\n" +
            "• Create task naturally:\n  'create a task about fixing bugs'\n  'new task for meeting prep'\n\n" +
            "• Or use quick commands:\n  status [task-id] [status]\n  priority [task-id] [high/medium/low]\n  assign [task-id] [user-id]\n  due [task-id] [date]\n\n" +
            "Status options: todo, in-progress, done"
        );
      } else if (action === "status") {
        const taskId = parseInt(parts[1]);
        const status = parts[2];

        if (!taskId || !status) {
          addBotMessage(
            "❌ Format: status [task-id] [status]\nExample: status 5 in-progress"
          );
          setLoading(false);
          return;
        }

        if (!["todo", "in-progress", "done"].includes(status)) {
          addBotMessage("❌ Invalid status. Use: todo, in-progress, or done");
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });

        if (res.ok) {
          addBotMessage(`✅ Task ${taskId} status updated to "${status}"`);
        } else {
          addBotMessage("❌ Failed to update task status.");
        }
      } else if (action === "priority") {
        const taskId = parseInt(parts[1]);
        const priority = parts[2];

        if (!taskId || !priority) {
          addBotMessage(
            "❌ Format: priority [task-id] [level]\nExample: priority 5 high"
          );
          setLoading(false);
          return;
        }

        if (!["high", "medium", "low"].includes(priority)) {
          addBotMessage("❌ Invalid priority. Use: high, medium, or low");
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priority }),
        });

        if (res.ok) {
          addBotMessage(`✅ Task ${taskId} priority set to "${priority}"`);
        } else {
          addBotMessage("❌ Failed to update task priority.");
        }
      } else if (action === "assign") {
        const taskId = parseInt(parts[1]);
        const assigneeId = parseInt(parts[2]);

        if (!taskId || !assigneeId) {
          addBotMessage(
            "❌ Format: assign [task-id] [user-id]\nExample: assign 5 3"
          );
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assigneeId }),
        });

        if (res.ok) {
          addBotMessage(`✅ Task ${taskId} assigned to user ${assigneeId}`);
        } else {
          addBotMessage("❌ Failed to assign task.");
        }
      } else if (action === "due") {
        const taskId = parseInt(parts[1]);
        const dueDate = parts[2];

        if (!taskId || !dueDate) {
          addBotMessage(
            "❌ Format: due [task-id] [date]\nExample: due 5 2026-01-20"
          );
          setLoading(false);
          return;
        }

        if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
          addBotMessage(
            "❌ Invalid date format. Use YYYY-MM-DD.\nExample: due 5 2026-01-20"
          );
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dueDate }),
        });

        if (res.ok) {
          addBotMessage(`✅ Task ${taskId} due date set to ${dueDate}`);
        } else {
          addBotMessage("❌ Failed to update task due date.");
        }
      } else {
        addBotMessage(
          "❓ I didn't understand that. Try:\n• 'create a task about...'\n• Type 'help' for commands"
        );
      }
    } catch (error) {
      console.error("Command error:", error);
      addBotMessage("❌ An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = () => {
    if (!input.trim()) return;

    addUserMessage(input);
    handleConversationFlow(input);
    setInput("");
  };

  return (
    <>
      {/* Floating Chathead */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #5d8bb1 0%, #4a7ba0 100%)",
          border: "none",
          boxShadow: "0 4px 12px rgba(93, 139, 177, 0.4)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "24px",
          zIndex: 40,
          transition: "transform 0.3s, box-shadow 0.3s",
          transform: isOpen ? "scale(1.1)" : "scale(1)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow =
            "0 6px 16px rgba(93, 139, 177, 0.5)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow =
            "0 4px 12px rgba(93, 139, 177, 0.4)";
        }}
      >
        💬
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "90px",
            right: "20px",
            width: "380px",
            height: "500px",
            background: "#ffffff",
            borderRadius: "12px",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
            display: "flex",
            flexDirection: "column",
            zIndex: 41,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              background: "linear-gradient(135deg, #5d8bb1 0%, #4a7ba0 100%)",
              color: "#ffffff",
              padding: "16px",
              fontWeight: "600",
              fontSize: "14px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>Task Assistant</span>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "#ffffff",
                cursor: "pointer",
                fontSize: "18px",
              }}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflow: "auto",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              background: "#f8f9fa",
            }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  justifyContent:
                    msg.sender === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "75%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    background: msg.sender === "user" ? "#5d8bb1" : "#e8ecf1",
                    color: msg.sender === "user" ? "#ffffff" : "#2c3e50",
                    fontSize: "13px",
                    lineHeight: "1.4",
                    wordWrap: "break-word",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", gap: "4px" }}>
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#5d8bb1",
                    animation: "bounce 1.4s infinite",
                  }}
                />
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#5d8bb1",
                    animation: "bounce 1.4s infinite 0.2s",
                  }}
                />
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#5d8bb1",
                    animation: "bounce 1.4s infinite 0.4s",
                  }}
                />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: "12px",
              borderTop: "1px solid #e0e0e0",
              display: "flex",
              gap: "8px",
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleSendMessage();
                }
              }}
              placeholder="Type naturally or use commands..."
              disabled={loading}
              style={{
                flex: 1,
                padding: "8px 12px",
                border: "1px solid #d0d0d0",
                borderRadius: "6px",
                fontSize: "13px",
                outline: "none",
                backgroundColor: loading ? "#f5f5f5" : "#ffffff",
              }}
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !input.trim()}
              style={{
                padding: "8px 14px",
                background: loading || !input.trim() ? "#ccc" : "#5d8bb1",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                fontSize: "13px",
                fontWeight: "600",
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-8px);
          }
        }
      `}</style>
    </>
  );
}
