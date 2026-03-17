import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Zap, AlertCircle } from "lucide-react";
import type { Task } from "@/app/components/tasks/types";

interface TaskSummaryProps {
  tasks?: Task[];
  currentUser?: { id: string | number } | null;
  userRole?: "ADMIN" | "OWNER" | "EMPLOYEE" | null;
  filterMode?: "dashboard" | "my-tasks" | "team-tasks"; // dashboard = show based on role, my-tasks = only current user, team-tasks = based on role
}

const TaskSummary = ({
  tasks = [],
  currentUser,
  userRole = "EMPLOYEE",
  filterMode = "dashboard",
}: TaskSummaryProps) => {
  const router = useRouter();

  React.useEffect(() => {
    console.log("[TaskSummary] Component rendered with tasks:", tasks);
    console.log("[TaskSummary] Current user:", currentUser);
  }, [tasks, currentUser]);

  // Get current user's ALL tasks sorted by priority and due date
  const userPriorityTasks = useMemo(() => {
    if (!tasks || tasks.length === 0) {
      console.log("[TaskSummary] No tasks provided");
      return [];
    }

    console.log(
      "[TaskSummary] Processing",
      tasks.length,
      "tasks",
      "filterMode:",
      filterMode,
      "userRole:",
      userRole,
    );

    let userTasks = tasks;

    // Apply role-based filtering
    if (filterMode === "my-tasks") {
      // Always show only current user's tasks
      if (currentUser) {
        const currentUserId = String(currentUser.id);
        userTasks = tasks.filter((task: any) => {
          const isAssignedToUser =
            task.assignees?.some(
              (a: any) => String(a.assignee?.id) === currentUserId,
            ) || String(task.assignee?.id) === currentUserId;
          return isAssignedToUser;
        });
      }
    } else if (filterMode === "team-tasks") {
      // Show all tasks for everyone (Team's Tasks view)
      // No filtering - all users see all tasks
    } else if (filterMode === "dashboard") {
      // Dashboard: employees see only their tasks, admin/owner see all
      if (userRole === "EMPLOYEE" && currentUser) {
        const currentUserId = String(currentUser.id);
        // For dashboard simple tasks, check if task has assignee data
        const hasAssigneeData = tasks.some(
          (t: any) => t.assignees !== undefined || t.assignee !== undefined,
        );

        if (hasAssigneeData) {
          userTasks = tasks.filter((task: any) => {
            const isAssignedToUser =
              task.assignees?.some(
                (a: any) => String(a.assignee?.id) === currentUserId,
              ) || String(task.assignee?.id) === currentUserId;
            return isAssignedToUser;
          });
        }
        // If no assignee data, show all (already filtered by API for employees)
      }
      // For ADMIN/OWNER, show all
    }

    console.log("[TaskSummary] After filtering:", userTasks.length, "tasks");

    // Sort by: priority (high first) → then deadline (soonest first)
    const priorityScore: Record<string, number> = {
      high: 3,
      medium: 2,
      low: 1,
      stuck: 4,
    };

    try {
      const sorted = [...userTasks].sort((a: any, b: any) => {
        const aPriority = a.priority || "medium";
        const bPriority = b.priority || "medium";
        const aScore = priorityScore[aPriority] || 0;
        const bScore = priorityScore[bPriority] || 0;

        if (aScore !== bScore) return bScore - aScore;

        // Try to parse dates safely
        try {
          if (a.dueDate && b.dueDate) {
            const aDate = new Date(a.dueDate).getTime();
            const bDate = new Date(b.dueDate).getTime();
            if (!isNaN(aDate) && !isNaN(bDate)) {
              return aDate - bDate;
            }
          }
        } catch (e) {
          console.warn("[TaskSummary] Error parsing dates:", e);
        }
        return 0;
      });

      console.log("[TaskSummary] Sorted", sorted.length, "tasks");
      return sorted;
    } catch (error) {
      console.error("[TaskSummary] Error sorting tasks:", error);
      return userTasks;
    }
  }, [tasks, currentUser, userRole, filterMode]);

  return (
    <div
      className="
        bg-gradient-to-b from-amber-50 to-white
        border border-amber-200
        rounded-lg
        shadow-sm
        overflow-hidden
        transition-all
        duration-200
        hover:shadow-md
        h-full
        flex
        flex-col
      "
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-amber-200 bg-amber-50/80 flex items-center gap-2 flex-shrink-0">
        <Zap size={16} className="text-amber-600" />
        <h2 className="text-sm font-semibold text-gray-900">Do This First</h2>
      </div>

      {/* Content */}
      <div className="flex-1 p-2 space-y-1 overflow-y-auto">
        {userPriorityTasks.length > 0 ? (
          userPriorityTasks.map((task, index) => (
            <div
              key={task.id}
              onClick={() => router.push(`/tasks?focus=${task.id}`)}
              className="
                flex items-start gap-2
                bg-amber-50
                hover:bg-amber-100
                active:bg-amber-150
                transition-colors duration-150
                cursor-pointer
                rounded-md
                px-3 py-2
                border border-amber-100
                hover:border-amber-200
                group
              "
            >
              <span className="text-xs font-bold text-amber-700 flex-shrink-0 min-w-[18px]">
                {index + 1}.
              </span>

              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <p className="text-xs font-semibold text-gray-900 line-clamp-1">
                  {task.title}
                </p>

                <div className="text-xs text-gray-600 flex flex-wrap gap-x-2">
                  {task.dueDate && <span>due {task.dueDate}</span>}
                </div>
              </div>

              {task.priority && (
                <span
                  className={`
                    text-xs px-2 py-0.5 rounded-full font-semibold self-start flex-shrink-0 whitespace-nowrap
                    ${
                      task.priority === "high"
                        ? "bg-red-200/80 text-red-800"
                        : task.priority === "medium"
                          ? "bg-yellow-200/80 text-yellow-800"
                          : "bg-green-200/80 text-green-800"
                    }
                  `}
                >
                  {task.priority}
                </span>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-4">
            <AlertCircle size={24} className="mx-auto text-gray-300 mb-1" />
            <p className="text-xs text-gray-500">
              {currentUser ? "No tasks assigned to you" : "No tasks"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskSummary;
