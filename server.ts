import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import prisma from "./src/lib/prisma.js";
import { sendEvent } from "./src/lib/sse.js";
import { createNotification } from "./src/lib/notificationService.ts";

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

  // Scheduler: reminders for upcoming due dates (24h and 1h before)
  const CHECK_INTERVAL_MS = 60 * 1000; // check every minute
  const REMINDERS = [
    { type: "24h", ms: 24 * 60 * 60 * 1000, label: "24 hours" },
    { type: "1h", ms: 60 * 60 * 1000, label: "1 hour" },
  ];

  async function checkReminders() {
    try {
      const now = new Date();

      for (const r of REMINDERS) {
        const windowStart = new Date(now.getTime() + r.ms - CHECK_INTERVAL_MS / 2);
        const windowEnd = new Date(now.getTime() + r.ms + CHECK_INTERVAL_MS / 2);

        // Find tasks with dueDate in the small window and not completed
        const tasks = await prisma.task.findMany({
          where: {
            dueDate: { gte: windowStart, lte: windowEnd },
            status: { not: "completed" },
          },
          include: { assignee: true, createdBy: true },
        });

        for (const task of tasks) {
          const recipients = new Set<number>();
          if (task.assigneeId) recipients.add(task.assigneeId);
          if (task.createdById) recipients.add(task.createdById);

          for (const rid of recipients) {
            // Ensure we haven't already created this reminder for this task+recipient
            const existing: any = await prisma.$queryRaw`
              SELECT id FROM "Notification"
              WHERE "receiverId" = ${rid}
                AND type = 'task_reminder'
                AND (data->>'relatedId')::int = ${task.id}
                AND data->>'reminderType' = ${r.type}
              LIMIT 1
            `;

            if (existing && existing.length && existing.length > 0) {
              continue; // reminder already sent
            }

            const title = `Task due in ${r.label}`;
            const message = `Task "${task.title}" is due in ${r.label}.`;

            await createNotification({
              receiverId: rid,
              type: "task_reminder",
              data: {
                title,
                message,
                relatedId: task.id,
                relatedType: "task",
                reminderType: r.type,
                dueDate: task.dueDate,
              },
            });

          }
        }
      }
    } catch (err) {
      console.error("CheckReminders error:", err);
    }
  }

  // Start periodic checks
  setInterval(() => {
    void checkReminders();
  }, CHECK_INTERVAL_MS);

  // Start the server
  httpServer.listen(port, () => {
    console.log(`
    ✓ Server running at http://${hostname}:${port}
    ✓ Socket.io connected
    ✓ Scheduled reminders active (24h & 1h)
    `);
  });
});
