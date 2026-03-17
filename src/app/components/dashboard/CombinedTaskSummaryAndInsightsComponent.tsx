"use client";

import React, { useEffect, useState } from "react";
import { Brain, Zap, AlertCircle } from "lucide-react";
import type { Task } from "@/app/components/tasks/types";

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

  // Fetch team members and calculate their completion percentages
  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        const response = await fetch("/api/team-management");
        const { team } = await response.json();
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
      }
    };

    fetchTeamData();
  }, [tasks]);

  // Generate AI insights using Hugging Face
  useEffect(() => {
    const generateAiInsights = async () => {
      try {
        setLoadingInsights(true);

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

        const teamSummary = teamMembers
          .map((member: TeamMember) => {
            const memberId = member.user.id;
            const stats = memberStats[memberId];
            const percentage = stats?.total
              ? Math.round((stats.completed / stats.total) * 100)
              : 0;
            return `${member.user.firstName} ${member.user.lastName}: ${percentage}% complete (${stats?.completed}/${stats?.total} tasks)`;
          })
          .join("\n");

        const prompt = `Analyze this task management status and provide brief, encouraging insights:

Total Tasks: ${totalTasks}
Completed: ${completedTasks}
In Progress: ${inProgressTasks}
Overdue: ${overdueTasks}

Team Members Progress:
${teamSummary}

Provide 2-3 brief, gentle insights about the team's progress. Be encouraging and avoid emojis.`;

        const response = await fetch("/api/taskerbot-chat-endpoints", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: prompt,
            teamMembers: teamMembers.map((m: TeamMember) => ({
              id: m.user.id,
              name: `${m.user.firstName} ${m.user.lastName}`,
              email: m.user.email,
            })),
            currentUser: currentUser
              ? { id: String(currentUser.id) }
              : undefined,
          }),
        });

        const data = await response.json();
        setAiInsights(data.message || "Analyzing your team's progress...");
      } catch (error) {
        console.error("Failed to generate AI insights:", error);
        setAiInsights("Unable to generate insights at this moment.");
      } finally {
        setLoadingInsights(false);
      }
    };

    if (tasks.length > 0 && teamMembers.length > 0) {
      generateAiInsights();
    }
  }, [tasks, teamMembers, currentUser, memberStats]);

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

  const displayTasks = [
    ...overdueTasks.slice(0, 3),
    ...inProgressTasks.slice(0, 3),
    ...pendingTasks.slice(0, 3),
  ].slice(0, 6);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-300/50 p-4 shrink-0 flex items-center gap-2 bg-blue-50">
        <Zap size={18} className="text-blue-700" />
        <h3 className="text-sm font-semibold text-gray-800 m-0">
          Task Summary & Team Progress
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
            <div className="space-y-2">
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

        {/* Team Progress Section */}
        <div className="border-t border-gray-200 pt-4 space-y-3">
          <h4 className="text-xs font-semibold text-gray-700 uppercase">
            Team Completion
          </h4>

          <div className="space-y-2">
            {teamMembers.map((member: TeamMember) => {
              const memberId = member.user.id;
              const stats = memberStats[memberId];
              const percentage = stats?.total
                ? Math.round((stats.completed / stats.total) * 100)
                : 0;

              return (
                <div key={memberId} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-700">
                      {member.user.firstName} {member.user.lastName}
                    </p>
                    <span className="text-xs font-semibold text-gray-800">
                      {percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        percentage === 100
                          ? "bg-green-500"
                          : percentage >= 75
                            ? "bg-blue-500"
                            : percentage >= 50
                              ? "bg-yellow-500"
                              : "bg-red-500"
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    {stats?.completed || 0} / {stats?.total || 0} tasks
                  </p>
                </div>
              );
            })}
          </div>
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
              <p className="text-xs leading-relaxed text-blue-900">
                {aiInsights}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
