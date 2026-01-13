"use client";

import { useState, useEffect } from "react";
import ChannelsList2 from "@/app/components/messaging/ChannelsList2";
import DirectMessagesList2 from "@/app/components/messaging/DirectMessagesList2";
import ChatWindow2 from "@/app/components/messaging/ChatWindow2";
import CreateChannelModal from "@/app/components/messaging/CreateChannelModal";

type ViewType = "channels" | "direct-messages";
type SelectedType = "channel" | "user";

interface SelectedChat {
  type: SelectedType;
  id: number;
  name?: string | null;
}

export default function MessagesPage() {
  const [view, setView] = useState<ViewType>("channels");
  const [selectedChat, setSelectedChat] = useState<SelectedChat | null>(null);
  const [showNewChannel, setShowNewChannel] = useState(false);

  return (
    <div style={{ display: "flex", height: "100vh", background: "#ffffff" }}>
      {/* Sidebar */}
      <div
        style={{
          width: 280,
          background: "#ffffff",
          borderRight: "1px solid rgba(0,0,0,0.1)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Tabs */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid rgba(0,0,0,0.1)",
            padding: "8px",
          }}
        >
          <button
            onClick={() => setView("channels")}
            style={{
              flex: 1,
              padding: "12px",
              border: "none",
              background: view === "channels" ? "#5d8bb1" : "transparent",
              color: "#ffffff",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            Channels
          </button>
          <button
            onClick={() => setView("direct-messages")}
            style={{
              flex: 1,
              padding: "12px",
              border: "none",
              background:
                view === "direct-messages" ? "#5d8bb1" : "transparent",
              color: "#ffffff",
              borderRadius: "4px",
              cursor: "pointer",
              marginLeft: "8px",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            Direct Messages
          </button>
        </div>

        {/* New Channel Button */}
        {view === "channels" && (
          <button
            onClick={() => setShowNewChannel(true)}
            style={{
              margin: "12px",
              padding: "10px",
              background: "#5d8bb1",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            + New Channel
          </button>
        )}

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {view === "channels" ? (
            <ChannelsList2
              selectedId={
                selectedChat?.type === "channel" ? selectedChat.id : null
              }
              onSelectChannel={(id, name) =>
                setSelectedChat({ type: "channel", id, name })
              }
            />
          ) : (
            <DirectMessagesList2
              selectedId={
                selectedChat?.type === "user" ? selectedChat.id : null
              }
              onSelectUser={(id, name) =>
                setSelectedChat({ type: "user", id, name })
              }
            />
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "#ffffff",
        }}
      >
        {selectedChat ? (
          <ChatWindow2
            chatType={selectedChat.type}
            chatId={selectedChat.id}
            chatName={selectedChat.name || ""}
          />
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#a0aec0",
              fontSize: "14px",
            }}
          >
            Select a {view === "channels" ? "channel" : "user"} to start
            messaging
          </div>
        )}
      </div>

      {/* Create Channel Modal */}
      {showNewChannel && (
        <CreateChannelModal onClose={() => setShowNewChannel(false)} />
      )}
    </div>
  );
}
