"use client";

import React, { useState, useRef, useEffect } from "react";
import { Sparkles } from "lucide-react";

type MessageType = {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
};

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const messageCounterRef = useRef(2);
  const [messages, setMessages] = useState<MessageType[]>([
    {
      id: "1",
      text: "🚀 Hey! I'm TaskerBot.\n\nI'm here to help you:\n• Create and manage tasks naturally\n• Ask me anything about your tasks\n• I'll help you stay on top of everything!\n\nJust type naturally - no commands needed!",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
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

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    addUserMessage(userMessage);
    setInput("");
    setLoading(true);

    try {
      // Fetch team members for context
      const teamMembersRes = await fetch("/api/users");
      const teamMembersData = await teamMembersRes.json();
      const teamMembers = teamMembersData.users || [];

      // Send to TaskerBot API
      const res = await fetch("/api/task-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          teamMembers: teamMembers,
        }),
      });

      if (!res.ok) {
        addBotMessage("❌ Oops! Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      const botResponse = await res.json();
      addBotMessage(botResponse.message);

      // If action is create/assign/update, create the task
      if (
        botResponse.action &&
        ["create", "assign", "update"].includes(botResponse.action)
      ) {
        if (botResponse.title) {
          try {
            const taskRes = await fetch("/api/tasks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: botResponse.title,
                description: botResponse.description || null,
                priority: botResponse.priority || null,
                dueDate: botResponse.dueDate || null,
                assigneeId: botResponse.assigneeEmail
                  ? teamMembers.find(
                      (m: any) => m.email === botResponse.assigneeEmail
                    )?.id
                  : null,
              }),
            });

            if (taskRes.ok) {
              const taskData = await taskRes.json();
              addBotMessage(
                `✅ Task created! (ID: ${taskData.task.id})\n\n📋 Title: ${
                  taskData.task.title
                }${
                  taskData.task.priority
                    ? `\n🎯 Priority: ${taskData.task.priority}`
                    : ""
                }${
                  taskData.task.dueDate
                    ? `\n📅 Due: ${taskData.task.dueDate.split("T")[0]}`
                    : ""
                }`
              );
            }
          } catch (err) {
            console.error("Task creation error:", err);
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      addBotMessage(
        "❌ Something went wrong. Make sure the API is running and try again."
      );
    } finally {
      setLoading(false);
    }
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
