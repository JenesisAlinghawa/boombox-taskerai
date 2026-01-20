import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

// Create Next.js app instance
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Track active users
const activeUsers = new Map<string, string>(); // userId -> socketId

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url || "", true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error:", err);
      res.statusCode = 500;
      res.end("Internal server error");
    }
  });

  // Initialize Socket.io server
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/socket.io",
  });

  // Socket.io event handlers
  io.on("connection", (socket) => {
    console.log(`[Socket.io] User connected: ${socket.id}`);

    // User joins with authentication
    socket.on("user:join", (data: { userId: number | string; userName: string }) => {
      const userId = String(data.userId);
      activeUsers.set(userId, socket.id);
      console.log(`[Socket.io] User ${userId} (${data.userName}) authenticated`);
      console.log(`[Socket.io] Current active users:`, Array.from(activeUsers.keys()));

      // Broadcast updated user list
      io.emit("users:active", Array.from(activeUsers.keys()));
    });

    // New message event
    socket.on(
      "message:send",
      (data: {
        channelId?: number;
        recipientId?: number;
        message: any;
      }) => {
        if (data.channelId) {
          // Broadcast to all users in channel
          io.emit(`channel:${data.channelId}:message`, data.message);
          console.log(`[Socket.io] Message sent to channel ${data.channelId}`);
        } else if (data.recipientId) {
          // Send direct message to specific user
          const recipientSocketId = activeUsers.get(String(data.recipientId));
          if (recipientSocketId) {
            io.to(recipientSocketId).emit("message:new", data.message);
            console.log(`[Socket.io] DM sent to user ${data.recipientId}`);
          }
        }
      }
    );

    // Message edit event
    socket.on(
      "message:edit",
      (data: { messageId: number; content: string }) => {
        io.emit("message:edited", {
          id: data.messageId,
          content: data.content,
          isEdited: true,
        });
        console.log(`[Socket.io] Message ${data.messageId} edited`);
      }
    );

    // Message delete event
    socket.on("message:delete", (data: { messageId: number }) => {
      io.emit("message:deleted", data.messageId);
      console.log(`[Socket.io] Message ${data.messageId} deleted`);
    });

    // Message reaction event
    socket.on(
      "message:reaction",
      (data: { messageId: number; emoji: string }) => {
        // Find user ID from socket mapping
        const userId = Array.from(activeUsers.entries()).find(
          ([_, socketId]) => socketId === socket.id
        )?.[0];

        io.emit("message:reaction", {
          messageId: data.messageId,
          emoji: data.emoji,
          userId,
        });
        console.log(`[Socket.io] Reaction ${data.emoji} added to message ${data.messageId}`);
      }
    );

    // Handle user disconnect
    socket.on("disconnect", () => {
      let disconnectedUserId: string | undefined;
      for (const [userId, socketId] of activeUsers.entries()) {
        if (socketId === socket.id) {
          disconnectedUserId = userId;
          break;
        }
      }

      if (disconnectedUserId) {
        activeUsers.delete(disconnectedUserId);
        console.log(`[Socket.io] User ${disconnectedUserId} disconnected`);
        console.log(`[Socket.io] Remaining active users:`, Array.from(activeUsers.keys()));
        io.emit("users:active", Array.from(activeUsers.keys()));
      }
    });

    // Error handling
    socket.on("error", (error) => {
      console.error(`[Socket.io] Error on socket ${socket.id}:`, error);
    });
  });

  // Start the server
  httpServer.listen(port, () => {
    console.log(`
    ✓ Server running at http://${hostname}:${port}
    ✓ Socket.io connected
    ✓ Ready for real-time messaging
    `);
  });
});
