import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const initSocket = (): Socket => {
  if (socket && socket.connected) {
    return socket;
  }

  socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000", {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  socket.on("connect", () => {
    console.log("Socket connected:", socket?.id);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected");
  });

  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });

  return socket;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
