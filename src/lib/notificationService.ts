import prisma from "./prisma.js";
import { sendEvent } from "./sse.js";
import sendEmail from "./email.ts";

export interface CreateNotificationOptions {
  receiverId: string;
  type: string;
  data?: any;
  /**
   * Optional email payload. If provided and the recipient has
   * emailNotifications enabled, an email will be sent.
   */
  email?: {
    subject: string;
    template: string;
    data: Record<string, any>;
  };
}

/**
 * Helper that creates a notification for a user, respecting the
 * user's notification preferences.
 *
 * - If `messageNotifications` is disabled, the database entry will not be created
 *   and the in‑app notification page will remain unaffected.
 * - If `email` options are provided and the user has `emailNotifications`
 *   enabled, an email will be dispatched as well.
 *
 * The function always resolves (never throws) so callers don't need to
 * catch errors; failures are logged instead.
 */
export async function createNotification(opts: CreateNotificationOptions) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: opts.receiverId },
      select: {
        messageNotifications: true,
        emailNotifications: true,
        email: true,
      },
    });
    if (!user) {
      console.warn("Attempted to notify nonexistent user", opts.receiverId);
      return null;
    }

    let notif: any = null;

    if (user.messageNotifications) {
      notif = await prisma.notification.create({
        data: {
          receiverId: opts.receiverId,
          type: opts.type,
          data: opts.data || {},
        },
      });

      // Push SSE event if available
      try {
        sendEvent(opts.receiverId, "notification", {
          id: notif.id,
          type: notif.type,
          data: notif.data,
          createdAt: notif.createdAt,
          isRead: notif.read,
        });
      } catch (e) {
        console.error("SSE push error:", e);
      }
    }

    if (opts.email && user.emailNotifications && user.email) {
      try {
        await sendEmail({
          to: user.email,
          subject: opts.email.subject,
          template: opts.email.template,
          data: opts.email.data,
        });
      } catch (e) {
        console.error("Email notification error:", e);
      }
    }

    return notif;
  } catch (error) {
    console.error("createNotification error:", error);
    return null;
  }
}

export default createNotification;
