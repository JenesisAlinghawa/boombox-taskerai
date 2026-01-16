"use client";

import React, { useState, useRef, useEffect } from "react";
import { Sparkles, X } from "lucide-react";

type MessageType = {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
};

interface ChatbotProps {
  teamMembers?: Array<{ id: number; name: string; email: string }>;
}

export default function Chatbot({ teamMembers = [] }: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<MessageType[]>([
    {
      id: "1",
      text: "🚀 Hey! I'm TaskerBot — your AI task assistant. I can create, assign, update, and help you manage tasks. Just type naturally!",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageCounterRef = useRef(2);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (text: string, sender: "user" | "bot") => {
    setMessages((prev) => [
      ...prev,
      {
        id: String(messageCounterRef.current++),
        text,
        sender,
        timestamp: new Date(),
      },
    ]);
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    addMessage(userMessage, "user");
    setInput("");
    setLoading(true);

    try {
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
        console.error("API error:", res.status, res.statusText);
        addMessage("❌ Something went wrong. Please try again.", "bot");
        setLoading(false);
        return;
      }

      const response = await res.json();

      // Validate response
      if (!response.message) {
        console.error("Invalid response format:", response);
        addMessage(
          "I'm here to help with tasks! What would you like to do?",
          "bot"
        );
        setLoading(false);
        return;
      }

      // Show TaskerBot's friendly message
      addMessage(response.message, "bot");

      // If there's an action (create/assign/update), handle it
      if (
        response.action &&
        response.action !== "query" &&
        response.action !== "delete"
      ) {
        if (response.title) {
          try {
            const taskRes = await fetch("/api/tasks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: response.title,
                description: response.description || null,
                priority: response.priority || "medium",
                dueDate: response.dueDate || null,
                assigneeId: response.assigneeEmail
                  ? teamMembers.find((m) => m.email === response.assigneeEmail)
                      ?.id
                  : null,
              }),
            });

            if (taskRes.ok) {
              const taskData = await taskRes.json();
              addMessage(
                `✅ Task saved! (ID: ${taskData.task.id})\n${response.title}`,
                "bot"
              );
            }
          } catch (err) {
            console.error("Task creation error:", err);
            addMessage("Task created but couldn't save to database.", "bot");
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      addMessage("❌ Connection error. Make sure the API is running.", "bot");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg hover:shadow-xl transition-all z-40 flex items-center justify-center text-2xl hover:scale-110"
        title="TaskerBot"
      >
        {isOpen ? <X size={24} /> : "💬"}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-lg shadow-2xl flex flex-col z-40 border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-6 py-4 rounded-t-lg flex items-center gap-2">
            <Sparkles size={20} />
            <span className="font-semibold">TaskerBot</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg whitespace-pre-wrap ${
                    msg.sender === "user"
                      ? "bg-purple-500 text-white"
                      : "bg-gray-200 text-gray-800"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 items-center">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-200" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleSendMessage();
                }
              }}
              placeholder="Type naturally..."
              disabled={loading}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !input.trim()}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 disabled:bg-gray-300 transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
