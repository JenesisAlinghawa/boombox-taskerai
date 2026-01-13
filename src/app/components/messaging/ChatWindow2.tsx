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
  chatName: string;
}

const COLORS = {
  bg: "#ffffff",
  cardBg: "#F9FAFD",
  text: "#1f2937",
  muted: "#a0aec0",
  border: "rgba(0,0,0,0.1)",
  primary: "#5d8bb1",
  hover: "#2d3748",
  shadow: "#E1F1FD",
};

export default function ChatWindow({ chatType, chatId, chatName }: ChatProps) {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

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
        if (chatType === "channel") {
          const res = await fetch(`/api/channels/${chatId}/messages`);
          const data = await res.json();
          setMessages(data.messages || []);
        } else if (user?.id) {
          const res = await fetch(
            `/api/direct-messages/${chatId}?userId=${user.id}`
          );
          const data = await res.json();
          setMessages(data.messages || []);
        }
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchChatData();
    const interval = setInterval(fetchChatData, 2000);
    return () => clearInterval(interval);
  }, [chatType, chatId]);

  // Real-time message updates via EventSource
  useEffect(() => {
    const setupSSE = async () => {
      const user = await getCurrentUser();
      if (!user?.id) return;

      const es = new EventSource(`/api/subscribe?userId=${user.id}`);

      const onDirectMessage = (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          const payload = data;
          if (payload && payload.message) {
            const msg = payload.message;
            // If we're in a direct chat with this user, append the message
            if (
              chatType === "user" &&
              (msg.senderId === chatId || msg.recipientId === chatId)
            ) {
              setMessages((prev) => [...prev, msg]);
            }
          }
        } catch (err) {
          // ignore parse errors
        }
      };

      es.addEventListener("direct_message", onDirectMessage as EventListener);

      return () => {
        es.close();
      };
    };

    setupSSE();
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
      <div
        style={{ padding: "20px", color: COLORS.muted, textAlign: "center" }}
      >
        Loading messages...
      </div>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: `1px solid ${COLORS.border}`,
          background: COLORS.cardBg,
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span style={{ fontSize: "14px", color: COLORS.muted }}>
          {chatType === "channel" ? "#" : "@"}
        </span>
        <h2
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 600,
            color: COLORS.text,
          }}
        >
          {chatName}
        </h2>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 20px",
          background: COLORS.bg,
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              color: COLORS.muted,
              textAlign: "center",
              marginTop: "20px",
            }}
          >
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isCurrentUser =
              (msg.user?.id || msg.sender?.id) === currentUser?.id;
            const prevMsg = idx > 0 ? messages[idx - 1] : null;
            const sameUser =
              (msg.user?.id || msg.sender?.id) ===
              (prevMsg?.user?.id || prevMsg?.sender?.id);
            const showAvatar = !sameUser || idx === 0;

            return (
              <div
                key={msg.id}
                style={{
                  marginBottom: showAvatar ? "16px" : "2px",
                  display: "flex",
                  gap: "12px",
                }}
              >
                {showAvatar && (
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: COLORS.primary,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: "12px",
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {(msg.user?.name || msg.sender?.name)?.[0]?.toUpperCase()}
                  </div>
                )}
                {!showAvatar && <div style={{ width: "32px" }} />}
                <div style={{ flex: 1 }}>
                  {showAvatar && (
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                        marginBottom: "4px",
                      }}
                    >
                      <span
                        style={{
                          color: COLORS.text,
                          fontWeight: 500,
                          fontSize: "13px",
                        }}
                      >
                        {msg.user?.name || msg.sender?.name}
                      </span>
                      <span style={{ color: COLORS.muted, fontSize: "11px" }}>
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  )}
                  <div
                    style={{
                      color: COLORS.text,
                      fontSize: "13px",
                      wordWrap: "break-word",
                      lineHeight: "1.4",
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div
        style={{
          padding: "16px 20px",
          background: COLORS.cardBg,
          borderTop: `1px solid ${COLORS.border}`,
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
            border: `1px solid ${COLORS.border}`,
            borderRadius: "6px",
            fontSize: "13px",
            background: COLORS.bg,
            color: COLORS.text,
            outline: "none",
          }}
        />
        <button
          onClick={handleSendMessage}
          style={{
            padding: "10px 16px",
            background: COLORS.primary,
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: 500,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) =>
            ((e.target as HTMLElement).style.background = "#4a7a9e")
          }
          onMouseLeave={(e) =>
            ((e.target as HTMLElement).style.background = COLORS.primary)
          }
        >
          Send
        </button>
      </div>
    </div>
  );
}
