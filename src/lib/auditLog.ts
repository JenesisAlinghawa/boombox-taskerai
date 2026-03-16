import prisma from "./prisma.js";

export interface AuditLogData {
  userId?: string | null;
  action: string; // e.g., "TASK_CREATED", "LOGIN_SUCCESS"
  resource: string; // e.g., "Task", "User", "Auth"
  resourceId?: number | null;
  details?: Record<string, any>;
  ipAddress?: string;
  success?: boolean;
}

/**
 * Log an audit event to the database
 * @param data - Audit log data
 * @returns Created audit log
 */
export async function logAuditEvent(data: AuditLogData) {
  try {
    return await prisma.auditLog.create({
      data: {
        userId: data.userId || null,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId || null,
        details: data.details || {},
        ipAddress: data.ipAddress,
        success: data.success !== undefined ? data.success : true,
      },
    });
  } catch (error) {
    console.error("Failed to log audit event:", error);
    // Don't throw - audit logging failures shouldn't break the app
  }
}

/**
 * Extract IP address from request headers
 */
export function getIpAddress(request?: Request): string | undefined {
  if (!request) return undefined;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return request.headers.get("x-real-ip") || undefined;
}

/**
 * Log authentication events
 */
export async function logAuthEvent(data: {
  userId?: string;
  action: "LOGIN_SUCCESS" | "LOGIN_FAILED" | "LOGOUT" | "PASSWORD_RESET";
  email?: string;
  ipAddress?: string;
  reason?: string; // For failed attempts
}) {
  await logAuditEvent({
    userId: data.userId,
    action: data.action,
    resource: "Auth",
    details: {
      email: data.email,
      reason: data.reason,
    },
    ipAddress: data.ipAddress,
    success:
      data.action === "LOGIN_SUCCESS" ||
      data.action === "LOGOUT" ||
      data.action === "PASSWORD_RESET",
  });
}

/**
 * Log task-related events
 */
export async function logTaskEvent(data: {
  userId: string;
  action:
    | "TASK_CREATED"
    | "TASK_UPDATED"
    | "TASK_DELETED"
    | "TASK_ASSIGNED"
    | "TASK_COMPLETED"
    | "PRIORITY_CHANGED";
  taskId: string;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  ipAddress?: string;
}) {
  await logAuditEvent({
    userId: data.userId,
    action: data.action,
    resource: "Task",
    resourceId: null,
    details: {
      taskId: data.taskId,
      changes: data.changes || [],
    },
    ipAddress: data.ipAddress,
  });
}

/**
 * Log AI operations
 */
export async function logAiEvent(data: {
  userId: string;
  action: "AI_INSIGHT_GENERATED" | "AI_PRIORITY_CALCULATED";
  details: Record<string, any>;
  ipAddress?: string;
}) {
  await logAuditEvent({
    userId: data.userId,
    action: data.action,
    resource: "AI",
    details: data.details,
    ipAddress: data.ipAddress,
  });
}

/**
 * Log comment events
 */
export async function logCommentEvent(data: {
  userId: string;
  action: "COMMENT_CREATED" | "COMMENT_UPDATED" | "COMMENT_DELETED";
  commentId: number;
  taskId: string;
  details?: Record<string, any>;
  ipAddress?: string;
}) {
  await logAuditEvent({
    userId: data.userId,
    action: data.action,
    resource: "Comment",
    resourceId: data.commentId,
    details: { taskId: data.taskId, ...(data.details || {}) },
    ipAddress: data.ipAddress,
  });
}

/**
 * Log errors/failed operations
 */
export async function logErrorEvent(data: {
  userId?: number;
  action: string;
  resource: string;
  error: Error | string;
  ipAddress?: string;
}) {
  await logAuditEvent({
    userId: data.userId ? String(data.userId) : undefined,
    action: data.action,
    resource: data.resource,
    details: {
      errorMessage:
        typeof data.error === "string" ? data.error : data.error.message,
      errorStack:
        typeof data.error !== "string" ? data.error.stack : undefined,
    },
    ipAddress: data.ipAddress,
    success: false,
  });
}

/**
 * Fetch audit logs (for admin/analytics)
 */
export async function getAuditLogs(filters?: {
  userId?: number;
  action?: string;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const where: any = {};

  if (filters?.userId) where.userId = filters.userId;
  if (filters?.action) where.action = filters.action;
  if (filters?.resource) where.resource = filters.resource;

  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = filters.startDate;
    if (filters.endDate) where.createdAt.lte = filters.endDate;
  }

  return await prisma.auditLog.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: filters?.limit || 100,
    skip: filters?.offset || 0,
  });
}
