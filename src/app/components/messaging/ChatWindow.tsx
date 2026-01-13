"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/utils/sessionManager";

interface MessageData {
  id: number;
  content: string;
  createdAt: string;
  user?: { id: number; name: string };
  sender?: { id: number; name: string };
}

interface ChatProps {
  chatType: "channel" | "user";
  chatId: number;
}

export default function ChatWindow({ chatType, chatId }: ChatProps) {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [chatName, setChatName] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          setCurrentUser(user);
        }
      } catch (e) {
        console.error("Failed to load user", e);
      }
    };
    loadUser();

    const fetchChatData = async () => {
      try {
        const user = await getCurrentUser();
        if (!user?.id) return;
        if (chatType === "channel") {
          const res = await fetch(`/api/channels/${chatId}/messages`);
          const data = await res.json();
          setMessages(data.messages || []);
          setChatName(data.channelName || "Channel");
        } else {
          const res = await fetch(
            `/api/direct-messages/${chatId}?userId=${user.id}`
          );
          const data = await res.json();
          setMessages(data.messages || []);
          setChatName(data.userName || "User");
        }
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchChatData();

    // Poll for new messages every 2 seconds
    const interval = setInterval(fetchChatData, 2000);
    return () => clearInterval(interval);
  }, [chatType, chatId]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !currentUser) return;

    try {
      const endpoint =
        chatType === "channel"
          ? "/api/channels/message"
          : "/api/direct-messages/send";
      const payload =
        chatType === "channel"
          ? { channelId: chatId, content: messageText, userId: currentUser.id }
          : {
              recipientId: chatId,
              content: messageText,
              senderId: currentUser.id,
            };

      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setMessageText("");

      // Refetch messages
      if (chatType === "channel") {
        const res = await fetch(`/api/channels/${chatId}/messages`);
        const data = await res.json();
        setMessages(data.messages || []);
      } else {
        const res = await fetch(
          `/api/direct-messages/${chatId}?userId=${currentUser.id}`
        );
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  if (loading)
    return (
      <div style={{ padding: "20px", color: "#718096" }}>
        Loading messages...
      </div>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div
        style={{
          padding: "16px",
          borderBottom: "1px solid #e2e8f0",
          background: "#fff",
        }}
      >
        <h2 style={{ margin: 0, color: "#2d3748" }}>
          {chatType === "channel" ? "#" : ""}
          {chatName}
        </h2>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          background: "#f5f7fa",
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              marginBottom: "12px",
              padding: "12px",
              background: "#fff",
              borderRadius: "4px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <div
              style={{ fontSize: "12px", fontWeight: 600, color: "#2b6cb0" }}
            >
              {chatType === "channel" ? msg.user?.name : msg.sender?.name}
            </div>
            <div style={{ color: "#2d3748", marginTop: "4px" }}>
              {msg.content}
            </div>
            <div
              style={{ fontSize: "11px", color: "#718096", marginTop: "4px" }}
            >
              {new Date(msg.createdAt).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div
        style={{
          padding: "16px",
          background: "#fff",
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          gap: "8px",
        }}
      >
        <input
          type="text"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: "10px 12px",
            border: "1px solid #e2e8f0",
            borderRadius: "4px",
            fontSize: "14px",
          }}
        />
        <button
          onClick={handleSendMessage}
          style={{
            padding: "10px 20px",
            background: "#2b6cb0",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
