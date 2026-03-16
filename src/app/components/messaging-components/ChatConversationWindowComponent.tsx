"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/utils/sessionManager";
import { MentionInput } from "@/app/components/shared-mentions/MentionInputComponent";
import { MentionText } from "@/app/components/shared-mentions/MentionTextComponent";
import {
  parseMentions,
  resolveMentions,
  ParsedMention,
  MentionData,
} from "@/utils/mentionUtils";

interface MessageData {
  id: number;
  content: string;
  createdAt: string;
  user?: { id: string; name: string };
  sender?: { id: string; name: string };
}

interface ChatProps {
  chatType: "channel" | "user";
  chatId: string;
}

export default function ChatWindow({ chatType, chatId }: ChatProps) {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [chatName, setChatName] = useState("");
  const [availableUsers, setAvailableUsers] = useState<MentionData[]>([]);
  const [messageMentions, setMessageMentions] = useState<ParsedMention[]>([]);

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
          const res = await fetch(`/api/channel-management/${chatId}/messages`);
          const data = await res.json();
          setMessages(data.messages || []);
          setChatName(data.channelName || "Channel");

          // Fetch channel members for mention suggestions
          try {
            const membersRes = await fetch(
              `/api/channel-management/${chatId}/members`,
            );
            const membersData = await membersRes.json();
            // membersData is an array of channel members with user object
            const members = (
              Array.isArray(membersData)
                ? membersData
                : membersData.members || []
            ).map((member: any) => ({
              id: member.userId || member.user?.id,
              name:
                member.user?.firstName && member.user?.lastName
                  ? `${member.user.firstName} ${member.user.lastName}`
                  : member.user?.name || member.user?.email || "",
              email: member.user?.email || "",
              profilePicture: member.user?.profilePicture,
            }));
            setAvailableUsers(members);
          } catch (err) {
            console.error("Failed to fetch channel members:", err);
            // Fallback to all team members
            try {
              const allUsersRes = await fetch("/api/user-management");
              const allUsersData = await allUsersRes.json();
              const users = (allUsersData.users || []).map((user: any) => ({
                id: user.id,
                name:
                  user.firstName && user.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user.email,
                email: user.email,
                profilePicture: user.profilePicture,
              }));
              setAvailableUsers(users);
            } catch (e) {
              console.error("Failed to fetch users:", e);
            }
          }
        } else {
          const res = await fetch(
            `/api/direct-messaging-endpoints/${chatId}?userId=${user.id}`,
          );
          const data = await res.json();
          setMessages(data.messages || []);
          setChatName(data.userName || "User");

          // For direct messages, show all team members
          try {
            const allUsersRes = await fetch("/api/user-management");
            const allUsersData = await allUsersRes.json();
            const users = (allUsersData.users || []).map((user: any) => ({
              id: user.id,
              name:
                user.firstName && user.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user.email,
              email: user.email,
              profilePicture: user.profilePicture,
            }));
            setAvailableUsers(users);
          } catch (err) {
            console.error("Failed to fetch users:", err);
          }
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
      // Resolve mentions before sending
      const resolvedMentions = await resolveMentions(
        messageMentions,
        availableUsers,
      );

      const endpoint =
        chatType === "channel"
          ? "/api/channel-management/message"
          : "/api/direct-messaging-endpoints/send";
      const payload =
        chatType === "channel"
          ? {
              channelId: chatId,
              content: messageText,
              userId: currentUser.id,
              mentions: resolvedMentions,
            }
          : {
              recipientId: chatId,
              content: messageText,
              senderId: currentUser.id,
              mentions: resolvedMentions,
            };

      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setMessageText("");
      setMessageMentions([]);

      // Refetch messages
      if (chatType === "channel") {
        const res = await fetch(`/api/channel-management/${chatId}/messages`);
        const data = await res.json();
        setMessages(data.messages || []);
      } else {
        const res = await fetch(
          `/api/direct-messaging-endpoints/${chatId}?userId=${currentUser.id}`,
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
              <MentionText text={msg.content} />
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
        <div style={{ flex: 1 }}>
          <MentionInput
            value={messageText}
            onChange={setMessageText}
            onMentionsChange={setMessageMentions}
            placeholder={
              chatType === "channel"
                ? "Type @ to mention channel members..."
                : "Type @ to mention team members..."
            }
            availableUsers={availableUsers}
            currentUserId={currentUser?.id}
            rows={2}
          />
        </div>
        <button
          onClick={handleSendMessage}
          disabled={!messageText.trim()}
          style={{
            padding: "10px 20px",
            background: messageText.trim() ? "#2b6cb0" : "#cbd5e1",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: messageText.trim() ? "pointer" : "not-allowed",
            alignSelf: "flex-end",
            height: "fit-content",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
