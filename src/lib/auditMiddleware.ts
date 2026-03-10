import { logTaskEvent, logErrorEvent } from "./auditLog.js";

/**
 * Prisma middleware to auto-log Task operations
 * Attach this in your Prisma client initialization
 */
export function setupAuditMiddleware(prisma: any) {
  prisma.$use(async (params: any, next: any) => {
    const result = await next(params);

    // Only track Task operations
    if (params.model === "Task") {
      try {
        // Extract userId from context (passed via headers or session)
        const userId = (global as any).__auditUserId;

        if (!userId) {
          return result; // Skip if no user context
        }

        if (params.action === "create") {
          // Fire-and-forget to avoid blocking
          logTaskEvent({
            userId,
            action: "TASK_CREATED",
            taskId: result.id,
            changes: [
              {
                field: "title",
                oldValue: null,
                newValue: result.title,
              },
              {
                field: "status",
                oldValue: null,
                newValue: result.status,
              },
              {
                field: "priority",
                oldValue: null,
                newValue: result.priority,
              },
            ],
          }).catch(err => {
            console.error("Audit logging error:", err);
          });
        }

        if (params.action === "update") {
          const changes: any[] = [];
          const data = params.data;

          // Track what changed
          if (data.title !== undefined)
            changes.push({
              field: "title",
              oldValue: "?",
              newValue: data.title,
            });
          if (data.status !== undefined)
            changes.push({
              field: "status",
              oldValue: "?",
              newValue: data.status,
            });
          if (data.priority !== undefined)
            changes.push({
              field: "priority",
              oldValue: "?",
              newValue: data.priority,
            });
          if (data.assigneeId !== undefined)
            changes.push({
              field: "assigneeId",
              oldValue: "?",
              newValue: data.assigneeId,
            });
          if (data.dueDate !== undefined)
            changes.push({
              field: "dueDate",
              oldValue: "?",
              newValue: data.dueDate,
            });
          if (data.description !== undefined)
            changes.push({
              field: "description",
              oldValue: "?",
              newValue: data.description,
            });

          if (changes.length > 0) {
            // Fire-and-forget to avoid blocking
            logTaskEvent({
              userId,
              action: "TASK_UPDATED",
              taskId: result.id || params.args.where.id,
              changes,
            }).catch(err => {
              console.error("Audit logging error:", err);
            });
          }
        }

        if (params.action === "delete") {
          // Fire-and-forget to avoid blocking
          logTaskEvent({
            userId,
            action: "TASK_DELETED",
            taskId: params.args.where.id,
          }).catch(err => {
            console.error("Audit logging error:", err);
          });
        }
      } catch (error) {
        console.error("Middleware logging error:", error);
        // Don't throw - keep the operation successful
      }
    }

    return result;
  });
}
