/**
 * Socket.IO Client Setup
 * 
 * Manages real-time connections for messages, presence, and notifications
 * Note: socket.io-client not installed - server-side integration pending
 */

import { useEffect, useState } from "react";
// import { io, Socket } from "socket.io-client";

let socket: any = null; // Socket | null = null;

export const initializeSocket = (userId: number) => {
  if (socket?.connected) return socket;

  // Socket.io-client not installed - integration pending
  console.log("Socket.io client not initialized (package not installed)");
  return null;

  /*
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

  socket = io(socketUrl, {
    auth: {
      userId,
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  });

  socket.on("connect", () => {
    console.log("Socket connected:", socket?.id);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected");
  });

  socket.on("error", (error: any) => {
    console.error("Socket error:", error);
  });

  return socket;
  */
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Real-time events
export const socketEvents = {
  // Messages
  MESSAGE_SENT: "message:sent",
  MESSAGE_RECEIVED: "message:received",
  MESSAGE_EDITED: "message:edited",
  MESSAGE_DELETED: "message:deleted",
  MESSAGE_REACTION: "message:reaction",

  // Typing indicator
  TYPING_START: "typing:start",
  TYPING_STOP: "typing:stop",

  // Presence
  USER_ONLINE: "user:online",
  USER_OFFLINE: "user:offline",
  USER_TYPING: "user:typing",

  // Notifications
  NOTIFICATION_RECEIVED: "notification:received",

  // Channels
  CHANNEL_CREATED: "channel:created",
  CHANNEL_UPDATED: "channel:updated",
  CHANNEL_DELETED: "channel:deleted",
  MEMBER_JOINED: "member:joined",
  MEMBER_LEFT: "member:left",
};

// Hook to use Socket.IO
export const useSocket = () => {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();

    if (!socket) return;

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    setConnected(socket.connected);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, []);

  return {
    socket: getSocket(),
    connected,
  };
};

export default socket;
