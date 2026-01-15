// Socket.io Server Configuration
// Note: socket.io not installed - server-side integration pending
// import { Server as SocketServer } from "socket.io";
import { Server as HTTPServer } from "http";

type SocketServer = any;

// Store active user connections: userId -> socketId
const userConnections: Map<number, string> = new Map();
// Store socket connections: socketId -> userId
const socketToUser: Map<string, number> = new Map();

export function initializeSocket(server: HTTPServer) {
  // Socket.io not installed - server-side integration pending
  console.log("Socket.io server not initialized (package not installed)");
  return null;

  /*
  const io = new SocketServer(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket: any) => {
    console.log("Socket connected:", socket.id);

    // Join socket to user room on auth
    socket.on("auth", (userId: number) => {
      userConnections.set(userId, socket.id);
      socketToUser.set(socket.id, userId);
      socket.join(`user:${userId}`);
      socket.join("presence");

      // Broadcast user online status
      io.emit("user:online", { userId, status: "online" });
      console.log(`User ${userId} online`);
    });

    // Message sent to channel
    socket.on("message:send", (data: { channelId: number; message: any }) => {
      io.to(`channel:${data.channelId}`).emit("message:received", {
        ...data.message,
        timestamp: new Date(),
      });
    });

    // Subscribe to channel
    socket.on(
      "channel:subscribe",
      (data: { channelId: number; userId: number }) => {
        socket.join(`channel:${data.channelId}`);
      }
    );

    // Unsubscribe from channel
    socket.on(
      "channel:unsubscribe",
      (data: { channelId: number; userId: number }) => {
        socket.leave(`channel:${data.channelId}`);
      }
    );

    // Direct message sent
    socket.on(
      "message:direct",
      (data: { recipientId: number; message: any }) => {
        io.to(`user:${data.recipientId}`).emit("message:direct:received", {
          ...data.message,
          timestamp: new Date(),
        });
      }
    );

    // Typing indicator
    socket.on(
      "message:typing",
      (data: { channelId?: number; recipientId?: number; userId: number }) => {
        if (data.channelId) {
          socket
            .to(`channel:${data.channelId}`)
            .emit("message:typing", { userId: data.userId });
        }
        if (data.recipientId) {
          socket
            .to(`user:${data.recipientId}`)
            .emit("message:typing", { userId: data.userId });
        }
      }
    );

    // Stop typing
    socket.on(
      "message:typing:stop",
      (data: { channelId?: number; recipientId?: number; userId: number }) => {
        if (data.channelId) {
          socket
            .to(`channel:${data.channelId}`)
            .emit("message:typing:stop", { userId: data.userId });
        }
        if (data.recipientId) {
          socket
            .to(`user:${data.recipientId}`)
            .emit("message:typing:stop", { userId: data.userId });
        }
      }
    );

    // Message reaction
    socket.on(
      "message:react",
      (data: { messageId: number; reaction: string; userId: number }) => {
        io.emit("message:reacted", {
          messageId: data.messageId,
          reaction: data.reaction,
          userId: data.userId,
        });
      }
    );

    // Message edited
    socket.on(
      "message:edited",
      (data: { messageId: number; content: string; userId: number }) => {
        io.emit("message:updated", {
          messageId: data.messageId,
          content: data.content,
          isEdited: true,
          userId: data.userId,
        });
      }
    );

    // Message deleted
    socket.on(
      "message:deleted",
      (data: { messageId: number; userId: number }) => {
        io.emit("message:removed", {
          messageId: data.messageId,
          isDeleted: true,
          userId: data.userId,
        });
      }
    );

    // User status update
    socket.on("user:status", (data: { userId: number; status: string }) => {
      io.emit("user:status:changed", {
        userId: data.userId,
        status: data.status,
      });
    });

    // Notification received
    socket.on(
      "notification:new",
      (data: { recipientId: number; notification: any }) => {
        io.to(`user:${data.recipientId}`).emit("notification:received", {
          ...data.notification,
          timestamp: new Date(),
        });
      }
    );

    // Disconnect handler
    socket.on("disconnect", () => {
      const userId = socketToUser.get(socket.id);

      if (userId) {
        userConnections.delete(userId);
        socketToUser.delete(socket.id);

        // Broadcast user offline status
        io.emit("user:offline", { userId, status: "offline" });
        console.log(`User ${userId} offline`);
      }

      console.log("Socket disconnected:", socket.id);
    });
  });

  return io;
  */
}

// Helper to get user's socket ID
export function getUserSocketId(userId: number): string | undefined {
  return userConnections.get(userId);
}

// Helper to get user from socket ID
export function getUserIdFromSocket(socketId: string): number | undefined {
  return socketToUser.get(socketId);
}

// Get all active user connections
export function getActiveUsers(): number[] {
  return Array.from(userConnections.keys());
}
