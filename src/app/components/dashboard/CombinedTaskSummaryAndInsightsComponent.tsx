"use client";

import React, { useEffect, useState, useRef } from "react";
import { Brain, Zap, AlertCircle } from "lucide-react";
import type { Task } from "@/app/components/tasks/types";
import { dijkstraTaskScheduler } from "@/utils/dijkstraTaskScheduler";

interface TeamMember {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface CombinedProps {
  tasks?: Task[];
  currentUser?: { id: string | number } | null;
  userRole?: "ADMIN" | "OWNER" | "EMPLOYEE" | null;
  filterMode?: "dashboard" | "my-tasks" | "team-tasks";
}

export const CombinedTaskSummaryAndInsights: React.FC<CombinedProps> = ({
  tasks = [],
  currentUser,
  userRole = "EMPLOYEE",
  filterMode = "dashboard",
}) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [aiInsights, setAiInsights] = useState<string>("");
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [memberStats, setMemberStats] = useState<
    Record<string, { completed: number; total: number }>
  >({});
  const insightsGeneratedRef = useRef(false);
  const hasTeamDataRef = useRef(false);

  // Fetch team members and calculate their completion percentages
  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        const response = await fetch("/api/team-management", {
          headers: {
            "x-user-id": currentUser?.id ? String(currentUser.id) : "",
          },
        });
        const data = await response.json();

        if (!response.ok) {
          console.error(
            "[CombinedTaskSummary] Team API error:",
            response.status,
            data,
          );
          setTeamMembers([]);
          return;
        }

        // Handle various response structures
        let team = null;
        if (data.team) {
          team = data.team;
        } else if (data.members) {
          team = data;
        } else if (Array.isArray(data)) {
          team = { members: data };
        } else {
          team = data;
        }

        // Check if team and members exist
        if (!team || !team.members || !Array.isArray(team.members)) {
          console.warn(
            "[CombinedTaskSummary] No team members found in response:",
            {
              hasTeam: !!team,
              hasMembersArray: team?.members
                ? Array.isArray(team.members)
                : false,
            },
          );
          setTeamMembers([]);
          return;
        }

        console.log(
          "[CombinedTaskSummary] Loaded team members:",
          team.members.length,
        );
        setTeamMembers(team.members);

        // Calculate completion percentages for each team member
        const stats: Record<string, { completed: number; total: number }> = {};

        team.members.forEach((member: TeamMember) => {
          const memberId = member.user.id;
          const memberTasks = tasks.filter((task: any) => {
            const isAssigned =
              task.assignees?.some(
                (a: any) => String(a.assignee?.id) === memberId,
              ) || String(task.assignee?.id) === memberId;
            return isAssigned;
          });

          const completed = memberTasks.filter(
            (t: any) => t.status === "completed",
          ).length;
          const total = memberTasks.length;

          stats[memberId] = { completed, total };
        });

        setMemberStats(stats);
      } catch (error) {
        console.error("Failed to fetch team data:", error);
        setTeamMembers([]);
      }
    };

    if (currentUser?.id) {
      fetchTeamData();
    }
  }, [tasks, currentUser?.id]);

  // Generate AI insights using Hugging Face
  useEffect(() => {
    const generateAiInsights = async () => {
      try {
        setLoadingInsights(true);

        console.log(
          "[CombinedTaskSummary] GENERATING INSIGHTS - Tasks:",
          tasks.length,
          "Team Members:",
          teamMembers.length,
        );
        console.log(
          "[CombinedTaskSummary] Sample tasks:",
          tasks.slice(0, 2).map((t) => ({
            id: t.id,
            title: t.title,
            assignee: t.assignee,
            assignees: t.assignees,
          })),
        );

        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(
          (t: any) => t.status === "completed",
        ).length;
        const inProgressTasks = tasks.filter(
          (t: any) => t.status === "inprogress",
        ).length;
        const overdueTasks = tasks.filter(
          (t: any) =>
            t.status === "stuck" ||
            (t.status !== "completed" &&
              t.dueDate &&
              new Date(t.dueDate) < new Date()),
        ).length;

        // Analyze each team member's task details
        let memberDetails = "";
        if (teamMembers.length > 0) {
          console.log(
            "[CombinedTaskSummary] Using team members:",
            teamMembers.length,
          );
          memberDetails = teamMembers
            .map((member: TeamMember) => {
              const memberId = member.user.id;
              const stats = memberStats[memberId];
              const percentage = stats?.total
                ? Math.round((stats.completed / stats.total) * 100)
                : 0;

              // Get member's tasks
              const memberTasks = tasks.filter((task: any) => {
                const isAssigned =
                  task.assignees?.some(
                    (a: any) => String(a.assignee?.id) === memberId,
                  ) || String(task.assignee?.id) === memberId;
                return isAssigned;
              });

              // Count member's overdue tasks
              const memberOverdue = memberTasks.filter(
                (t: any) =>
                  t.status !== "completed" &&
                  t.dueDate &&
                  new Date(t.dueDate) < new Date(),
              ).length;

              // Count member's near deadline tasks (within 3 days)
              const now = new Date();
              const threeDaysFromNow = new Date(
                now.getTime() + 3 * 24 * 60 * 60 * 1000,
              );
              const memberNearDeadline = memberTasks.filter(
                (t: any) =>
                  t.status !== "completed" &&
                  t.dueDate &&
                  new Date(t.dueDate) > now &&
                  new Date(t.dueDate) <= threeDaysFromNow,
              ).length;

              // Count member's stuck tasks
              const memberStuck = memberTasks.filter(
                (t: any) => t.status === "stuck",
              ).length;

              let issues = [];
              if (memberOverdue > 0) issues.push(`${memberOverdue} overdue`);
              if (memberNearDeadline > 0)
                issues.push(`${memberNearDeadline} near deadline`);
              if (memberStuck > 0) issues.push(`${memberStuck} stuck`);

              const issueText =
                issues.length > 0 ? ` [Issues: ${issues.join(", ")}]` : "";

              const displayName =
                String(memberId) === String(currentUser?.id)
                  ? "(You)"
                  : `${member.user.firstName} ${member.user.lastName}`;
              return `${displayName}: ${percentage}% complete (${stats?.completed}/${stats?.total} tasks)${issueText}`;
            })
            .join("\n");
        } else {
          // Fallback: analyze tasks by assignee if team members data isn't available
          console.log(
            "[CombinedTaskSummary] Using assignee fallback. Tasks:",
            tasks.length,
          );
          const assigneeMap = new Map<
            string,
            { id: string; name: string; tasks: any[] }
          >();

          // Extract ALL assignees from tasks
          tasks.forEach((task: any) => {
            // Check if task has assignees array
            if (task.assignees && Array.isArray(task.assignees)) {
              task.assignees.forEach((assignment: any) => {
                const assignee = assignment.assignee;
                if (assignee && assignee.id) {
                  const assigneeId = String(assignee.id);
                  const firstName = assignee.firstName || assignee.name || "";
                  const lastName = assignee.lastName || "";
                  const assigneeName = `${firstName} ${lastName}`.trim();

                  if (!assigneeMap.has(assigneeId)) {
                    assigneeMap.set(assigneeId, {
                      id: assigneeId,
                      name: assigneeName || "Unknown",
                      tasks: [],
                    });
                  }
                  assigneeMap.get(assigneeId)?.tasks.push(task);
                }
              });
            }
            // Check legacy assignee field
            if (task.assignee && task.assignee.id) {
              const assignee = task.assignee;
              const assigneeId = String(assignee.id);
              const firstName = assignee.firstName || assignee.name || "";
              const lastName = assignee.lastName || "";
              const assigneeName = `${firstName} ${lastName}`.trim();

              if (!assigneeMap.has(assigneeId)) {
                assigneeMap.set(assigneeId, {
                  id: assigneeId,
                  name: assigneeName || "Unknown",
                  tasks: [],
                });
              }
              assigneeMap.get(assigneeId)?.tasks.push(task);
            }
          });

          console.log(
            "[CombinedTaskSummary] Found assignees:",
            assigneeMap.size,
          );
          assigneeMap.forEach((v, k) =>
            console.log(`  - ${k}: ${v.name} (${v.tasks.length} tasks)`),
          );

          if (assigneeMap.size > 0) {
            memberDetails = Array.from(assigneeMap.entries())
              .map(([id, assignee]) => {
                const completed = assignee.tasks.filter(
                  (t: any) => t.status === "completed",
                ).length;
                const total = assignee.tasks.length;
                const percentage =
                  total > 0 ? Math.round((completed / total) * 100) : 0;

                const overdue = assignee.tasks.filter(
                  (t: any) =>
                    t.status !== "completed" &&
                    t.dueDate &&
                    new Date(t.dueDate) < new Date(),
                ).length;

                const now = new Date();
                const threeDaysFromNow = new Date(
                  now.getTime() + 3 * 24 * 60 * 60 * 1000,
                );
                const nearDeadline = assignee.tasks.filter(
                  (t: any) =>
                    t.status !== "completed" &&
                    t.dueDate &&
                    new Date(t.dueDate) > now &&
                    new Date(t.dueDate) <= threeDaysFromNow,
                ).length;

                const stuck = assignee.tasks.filter(
                  (t: any) => t.status === "stuck",
                ).length;

                let issues = [];
                if (overdue > 0) issues.push(`${overdue} overdue`);
                if (nearDeadline > 0)
                  issues.push(`${nearDeadline} near deadline`);
                if (stuck > 0) issues.push(`${stuck} stuck`);

                const issueText =
                  issues.length > 0 ? ` [Issues: ${issues.join(", ")}]` : "";

                const displayName =
                  String(id) === String(currentUser?.id)
                    ? "(You)"
                    : assignee.name;
                return `${displayName}: ${percentage}% complete (${completed}/${total} tasks)${issueText}`;
              })
              .join("\n");
          } else {
            memberDetails = "No team members or assignees found.";
          }
        }

        // Build task details array with title and description for AI analysis
        const taskDetailsArray = tasks.map((task: any) => {
          const assigneeName = task.assignees?.[0]?.assignee
            ? `${task.assignees[0].assignee.firstName} ${task.assignees[0].assignee.lastName}`.trim()
            : task.assignee
              ? `${task.assignee.firstName || ""} ${task.assignee.lastName || ""}`.trim()
              : "Unassigned";

          return {
            id: task.id,
            title: task.title,
            description: task.description || undefined,
            status: task.status || "pending",
            priority: task.priority || "medium",
            dueDate: task.dueDate
              ? new Date(task.dueDate).toISOString().split("T")[0]
              : undefined,
            assignee: assigneeName,
          };
        });

        // Call AI insights endpoint with structured task data
        console.log("[CombinedTaskSummary] Calling AI insights with:", {
          completedTasks,
          inProgressTasks,
          overdueTasks,
          totalTasks,
          taskCount: taskDetailsArray.length,
          sampleTasks: taskDetailsArray.slice(0, 2),
        });

        const response = await fetch("/api/analytics/ai-insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            completed: completedTasks,
            inProgress: inProgressTasks,
            pending: tasks.length - completedTasks - inProgressTasks,
            overdue: overdueTasks,
            total: totalTasks,
            tasks: taskDetailsArray, // Pass structured task details with titles and descriptions
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          console.error(
            "[CombinedTaskSummary] AI Insights API error:",
            response.status,
            data,
          );
          setAiInsights("Unable to generate insights at this moment.");
          setLoadingInsights(false);
          return;
        }

        // The ai-insights endpoint returns { insight: string }
        const defaultMsg =
          userRole === "EMPLOYEE"
            ? "Analyzing your progress..."
            : "Analyzing your team's progress...";
        let message = data.insight || defaultMsg;

        if (typeof message !== "string") {
          message = defaultMsg;
        }

        // Clean up message slightly (less aggressive than before since it comes from a structured API)
        message = message.trim();

        console.log("[CombinedTaskSummary] AI Insight received:", message);
        setAiInsights(message);
      } catch (error) {
        console.error("Failed to generate AI insights:", error);
        setAiInsights("Unable to generate insights at this moment.");
      } finally {
        setLoadingInsights(false);
      }
    };

    if (tasks.length > 0) {
      // Generate if we haven't generated yet
      if (!insightsGeneratedRef.current) {
        insightsGeneratedRef.current = true;
        console.log(
          "[CombinedTaskSummary] Generating insights - tasks available and not yet generated",
        );
        generateAiInsights();
      }
      // Or regenerate if we now have team data but hadn't before
      else if (teamMembers.length > 0 && !hasTeamDataRef.current) {
        hasTeamDataRef.current = true;
        console.log(
          "[CombinedTaskSummary] Regenerating insights - team data now available",
        );
        generateAiInsights();
      }
    } else if (tasks.length === 0 && !insightsGeneratedRef.current) {
      insightsGeneratedRef.current = true;
      console.log("[CombinedTaskSummary] No tasks to analyze");
      const noTasksMsg =
        userRole === "EMPLOYEE"
          ? "No tasks assigned to you yet."
          : "No team tasks yet.";
      setAiInsights(noTasksMsg);
      setLoadingInsights(false);
    }
  }, [tasks, teamMembers, userRole]);

  // Filter tasks based on role and filter mode
  const filteredTasks = React.useMemo(() => {
    let userTasks = tasks;

    if (filterMode === "my-tasks") {
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
    } else if (filterMode === "dashboard") {
      if (userRole === "EMPLOYEE" && currentUser) {
        const currentUserId = String(currentUser.id);
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
      }
    }

    return userTasks;
  }, [tasks, currentUser, userRole, filterMode]);

  const overdueTasks = filteredTasks.filter(
    (t: any) =>
      t.status !== "completed" && t.dueDate && new Date(t.dueDate) < new Date(),
  );
  const inProgressTasks = filteredTasks.filter(
    (t: any) => t.status === "inprogress",
  );
  const pendingTasks = filteredTasks.filter((t: any) => t.status === "todo");

  // USE DIJKSTRA ALGORITHM FOR OPTIMAL TASK PRIORITIZATION
  // This implements the main thesis: using Dijkstra's shortest path algorithm
  // to determine the optimal task execution sequence
  const displayTasks = React.useMemo(() => {
    // Only filter out completed tasks - we want to show what should be done next
    const tasksToSchedule = filteredTasks.filter(
      (t: any) => t.status !== "completed",
    );

    if (tasksToSchedule.length === 0) {
      return [];
    }

    try {
      // Convert tasks to Dijkstra node format
      // Create a mapping of numeric IDs to original tasks for later lookup
      const taskIdMap = new Map<number, any>();

      const dijkstraNodes = tasksToSchedule.map((task: any, index: number) => {
        const numericId = index; // Use array index as numeric ID
        taskIdMap.set(numericId, task); // Store mapping

        return {
          id: numericId,
          title: task.title,
          priority: task.priority || "medium",
          dueDate: task.dueDate || null,
          status: task.status || "todo",
          createdAt: task.createdAt || null,
          dependsOnTaskIds: [], // TODO: populate if dependency data exists
          estimatedEffort: 2, // Default estimate
        };
      });

      // Run Dijkstra's algorithm to get optimally ordered tasks
      const scheduledTasks = dijkstraTaskScheduler(dijkstraNodes);

      // Map results back to original task objects, sorted by priority
      const prioritizedTasks = scheduledTasks
        .slice(0, 6) // Show top 6 priority tasks
        .map((result: any) => {
          // Find original task data using the ID mapping
          const originalTask = taskIdMap.get(result.taskId);

          if (!originalTask) {
            console.warn(
              "[CombinedTaskSummary] Could not find original task for ID:",
              result.taskId,
            );
            return null;
          }

          return {
            ...originalTask,
            // Add dijkstra metadata
            dijkstraPriority: result.priority,
            executionOrder: result.executionOrder,
            urgencyScore: result.urgencyScore,
            criticalPath: result.criticalPath,
          };
        })
        .filter((t: any) => t !== null); // Remove any null entries

      console.log(
        "[CombinedTaskSummary] Dijkstra prioritized tasks:",
        prioritizedTasks.length,
        "from total:",
        tasksToSchedule.length,
      );
      return prioritizedTasks;
    } catch (error) {
      console.warn(
        "[CombinedTaskSummary] Dijkstra error, falling back to simple sort:",
        error,
      );
      // Fallback: simple priority-based sort if Dijkstra fails
      return [
        ...overdueTasks.slice(0, 3),
        ...inProgressTasks.slice(0, 3),
        ...pendingTasks.slice(0, 3),
      ].slice(0, 6);
    }
  }, [filteredTasks, overdueTasks, inProgressTasks, pendingTasks]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-300/50 p-4 shrink-0 flex items-center gap-2 bg-blue-50">
        <Zap size={18} className="text-blue-700" />
        <h3 className="text-sm font-semibold text-gray-800 m-0">
          Task Summary
        </h3>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
        {/* Task Summary Section */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-gray-700 uppercase">
            Priority Tasks
          </h4>

          {displayTasks.length === 0 ? (
            <div className="text-center py-4">
              <AlertCircle size={20} className="mx-auto text-gray-300 mb-2" />
              <p className="text-xs text-gray-500">No tasks to display</p>
            </div>
          ) : (
            <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {displayTasks.map((task: any, idx: number) => (
                <div
                  key={task.id || idx}
                  className="p-2 bg-gray-50 border border-gray-150 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <p className="text-xs font-medium text-gray-800 truncate">
                    {task.title}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        task.priority === "high"
                          ? "bg-red-100 text-red-700"
                          : task.priority === "medium"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {task.priority}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        task.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : task.status === "inprogress"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Insights Section */}
        <div className="border-t border-gray-200 pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <Brain size={14} className="text-blue-700" />
            <h4 className="text-xs font-semibold text-gray-700 uppercase">
              AI Insights
            </h4>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            {loadingInsights ? (
              <div className="flex items-center gap-2">
                <Brain size={14} className="animate-spin text-blue-600" />
                <p className="text-xs text-blue-800">Analyzing progress...</p>
              </div>
            ) : (
              <div className="text-xs text-blue-900 space-y-2">
                {aiInsights.split("\n").map((line, idx) => (
                  <div key={idx} className="leading-relaxed">
                    {line}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
