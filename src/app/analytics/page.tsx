"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Lock,
  Network,
  Sparkles,
  TrendingUp,
  Zap,
  CheckCircle,
  Clock,
  Paperclip,
  MessageSquare,
  Plus,
} from "lucide-react";
import { ToastProvider, useToast } from "@/app/components/ToastProvider";
import TaskStatusChart from "@/app/components/TaskStatusChart";
import StatusCard from "@/app/components/dashboard/StatusCards";
import WeeklyProgressChart from "@/app/components/dashboard/WeeklyProgressChart";
import TaskSummary from "@/app/components/dashboard/TaskSummary";
import { getCurrentUser } from "@/utils/sessionManager";
import { useAuthProtection } from "@/app/hooks/useAuthProtection";
import { PageContainer } from "@/app/components/PageContainer";
import { PageContentCon } from "@/app/components/PageContentCon";
import {
  buildTaskGraph,
  findCriticalPath,
  formatPath,
  hasCircularDependencies,
  type TaskNode as DijkstraTaskNode,
} from "@/utils/dijkstra";

const COLORS = {
  bg: "bg-transparent",
  cardBg: "bg-blue-400/10",
  text: "text-white/62",
  muted: "text-white/40",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  info: "#3b82f6",
  shadow: "#E1F1FD",
  primary: "#5d8bb1",
  inProgress: "#3b82f6",
  done: "#10b981",
  stuck: "#ef4444",
  pending: "#f59e0b",
};

interface Recommendation {
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  icon: string;
}

interface Trend {
  text: string;
  icon: string;
}

interface AnalyticsData {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  avgTasksPerMember: number;
  overdueTasks: number;
  onTrackTasks: number;
  recommendations: Recommendation[];
  trends: (Trend | string)[];
  performanceSummary?: string;
}

export default function AnalyticsPage() {
  return (
    <ToastProvider>
      <AnalyticsPageContent />
    </ToastProvider>
  );
}

function AnalyticsPageContent() {
  const router = useRouter();
  useAuthProtection(); // Protect this route
  const toast = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [taskStatusCounts, setTaskStatusCounts] = useState({
    inProgress: 0,
    stuck: 0,
    done: 0,
  });
  const [aiRecommendations, setAiRecommendations] = useState<Recommendation[]>(
    [],
  );
  const [aiTrends, setAiTrends] = useState<(Trend | string)[]>([]);
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  const [criticalPath, setCriticalPath] = useState<string | null>(null);
  const [dijkstraError, setDijkstraError] = useState<string | null>(null);
  const [weeklyData, setWeeklyData] = useState({
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    inProgress: [0, 0, 0, 0, 0, 0, 0],
    completed: [0, 0, 0, 0, 0, 0, 0],
    overdue: [0, 0, 0, 0, 0, 0, 0],
  });
  const [completedTasksHistory, setCompletedTasksHistory] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"completed" | "created" | "name">(
    "completed",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [visibleCount, setVisibleCount] = useState<number>(10);
  const [deleteModalTaskId, setDeleteModalTaskId] = useState<number | null>(
    null,
  );
  const [deleteModalTaskTitle, setDeleteModalTaskTitle] = useState("");
  const [menuOpenTaskId, setMenuOpenTaskId] = useState<number | null>(null);

  const isOwner = (task: any) =>
    currentUser && task && task.createdById === currentUser.id;

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          setCurrentUser(user);
          // Analytics restricted to MANAGER+ to prevent EMPLOYEE users from viewing team metrics
        }
      } catch (error) {
        console.error("Failed to load user:", error);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const fetchAnalytics = async () => {
      try {
        // Fetch all tasks
        const tasksRes = await fetch("/api/tasks", {
          headers: { "x-user-id": String(currentUser.id) },
        });
        const tasksData = await tasksRes.json();
        const tasks = Array.isArray(tasksData?.tasks) ? tasksData.tasks : [];

        // Fetch team for member count
        const teamRes = await fetch("/api/teams", {
          headers: { "x-user-id": String(currentUser.id) },
        });
        const teamData = await teamRes.json();
        const members = teamData?.team?.members || [];

        // Calculate metrics
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(
          (t: any) => t.status === "completed" || t.status === "done",
        ).length;
        const completionRate =
          totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        const overdueTasks = tasks.filter(
          (t: any) =>
            t.status !== "completed" &&
            t.dueDate &&
            new Date(t.dueDate) < new Date(),
        ).length;
        const onTrackTasks = totalTasks - overdueTasks - completedTasks;
        const avgTasksPerMember =
          members.length > 0 ? Math.round(totalTasks / members.length) : 0;

        // Calculate task status distribution
        const inProgressCount = tasks.filter(
          (t: any) => t.status === "in-progress" || t.status === "inprogress",
        ).length;
        const stuckCount = tasks.filter(
          (t: any) => t.status === "stuck",
        ).length;
        const doneCount = tasks.filter(
          (t: any) => t.status === "completed" || t.status === "done",
        ).length;

        setTaskStatusCounts({
          inProgress: inProgressCount,
          stuck: stuckCount,
          done: doneCount,
        });

        // Calculate optimal task path using Dijkstra's algorithm
        try {
          // Only process tasks that have a duration and potential dependencies
          const validTasks = tasks.map((task: any) => ({
            id: task.id,
            title: task.title,
            duration: task.dueDate
              ? Math.max(
                  1,
                  Math.ceil(
                    (new Date(task.dueDate).getTime() - new Date().getTime()) /
                      (1000 * 60 * 60 * 24),
                  ),
                )
              : 1, // Default 1 day if no due date
            priority: task.priority || "medium",
            dependencies: [], // Placeholder for future dependency support
          }));

          if (validTasks.length > 0) {
            const graph = buildTaskGraph(validTasks as DijkstraTaskNode[]);

            // Check for circular dependencies
            if (hasCircularDependencies(graph)) {
              setDijkstraError("Circular dependency detected in task graph");
              setCriticalPath(null);
            } else {
              // Calculate critical path
              const criticalResult = findCriticalPath(graph);
              const pathString = formatPath(criticalResult);
              setCriticalPath(pathString);
              setDijkstraError(null);
            }
          }
        } catch (dijkstraErr: any) {
          console.warn(
            "Failed to calculate optimal path:",
            dijkstraErr.message,
          );
          setDijkstraError(dijkstraErr.message || "Failed to calculate path");
          setCriticalPath(null);
        }

        // Fetch AI-driven recommendations from Gemini
        let localAiRecommendations: Recommendation[] = [];
        let localAiTrends: (Trend | string)[] = [];
        let performanceSummary = "";

        try {
          const aiRes = await fetch("/api/analytics/ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tasks,
              members,
              totalTasks,
              completedTasks,
              completionRate,
              overdueTasks,
              avgTasksPerMember,
            }),
          });

          if (aiRes.ok) {
            const aiData = await aiRes.json();
            localAiRecommendations = aiData.recommendations || [];
            localAiTrends = aiData.trends || [];
            performanceSummary = aiData.performanceSummary || "";
          }
        } catch (aiError) {
          console.warn("Failed to fetch AI analytics, using fallback", aiError);
          // Fallback to rule-based recommendations if API fails
          localAiRecommendations = generateRecommendations(
            completionRate,
            overdueTasks,
            totalTasks,
            completedTasks,
            members.length,
          );
          localAiTrends = generateTrends(completionRate, overdueTasks, tasks);
          performanceSummary = generatePerformanceSummary(
            completionRate,
            overdueTasks,
            totalTasks,
            completedTasks,
            members.length,
            avgTasksPerMember,
          );
        }

        setAiRecommendations(
          localAiRecommendations.length > 0
            ? localAiRecommendations
            : generateRecommendations(
                completionRate,
                overdueTasks,
                totalTasks,
                completedTasks,
                members.length,
              ),
        );
        setAiTrends(
          localAiTrends.length > 0
            ? localAiTrends
            : generateTrends(completionRate, overdueTasks, tasks),
        );

        // Calculate weekly data
        const weekDataLabels = [
          "Mon",
          "Tue",
          "Wed",
          "Thu",
          "Fri",
          "Sat",
          "Sun",
        ];
        const weekInProgress = [0, 0, 0, 0, 0, 0, 0];
        const weekCompleted = [0, 0, 0, 0, 0, 0, 0];
        const weekOverdue = [0, 0, 0, 0, 0, 0, 0];

        tasks.forEach((task: any) => {
          if (task.dueDate) {
            const dayOfWeek = new Date(task.dueDate).getDay();
            const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            if (dayIndex >= 0 && dayIndex < 7) {
              if (task.status === "completed" || task.status === "done") {
                weekCompleted[dayIndex]++;
              } else if (
                task.status === "in-progress" ||
                task.status === "inprogress"
              ) {
                weekInProgress[dayIndex]++;
              } else if (
                task.status !== "completed" &&
                new Date(task.dueDate) < new Date()
              ) {
                weekOverdue[dayIndex]++;
              }
            }
          }
        });

        setWeeklyData({
          labels: weekDataLabels,
          inProgress: weekInProgress,
          completed: weekCompleted,
          overdue: weekOverdue,
        });

        // Extract completed tasks history with metadata
        const completedHistory = tasks
          .filter((t: any) => t.status === "completed" || t.status === "done")
          .map((t: any) => ({
            id: t.id,
            title: t.title,
            completedDate: t.completedDate || t.updatedAt,
            createdDate: t.createdDate || t.createdAt,
            dueDate: t.dueDate,
            assignedBy: t.assignedBy?.name || t.assignedBy || "Unknown",
            status: t.status,
            attachments: Array.isArray(t.attachments) ? t.attachments : [],
            comments: Array.isArray(t.comments) ? t.comments : [],
            attachmentsCount: Array.isArray(t.attachments)
              ? t.attachments.length
              : 0,
            commentCount: Array.isArray(t.comments) ? t.comments.length : 0,
            priority: t.priority || "medium",
          }))
          .sort(
            (a: any, b: any) =>
              new Date(b.completedDate).getTime() -
              new Date(a.completedDate).getTime(),
          );

        setCompletedTasksHistory(completedHistory);

        setAnalytics({
          totalTasks,
          completedTasks,
          completionRate,
          avgTasksPerMember,
          overdueTasks,
          onTrackTasks,
          recommendations:
            localAiRecommendations.length > 0
              ? localAiRecommendations
              : generateRecommendations(
                  completionRate,
                  overdueTasks,
                  totalTasks,
                  completedTasks,
                  members.length,
                ),
          trends:
            localAiTrends.length > 0
              ? localAiTrends
              : generateTrends(completionRate, overdueTasks, tasks),
          performanceSummary:
            performanceSummary ||
            generatePerformanceSummary(
              completionRate,
              overdueTasks,
              totalTasks,
              completedTasks,
              members.length,
              avgTasksPerMember,
            ),
        });
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [currentUser]);

  const generateRecommendations = (
    completionRate: number,
    overdueTasks: number,
    totalTasks: number,
    completedTasks: number,
    memberCount: number,
  ): Recommendation[] => {
    const recommendations: Recommendation[] = [];

    if (completionRate < 50) {
      recommendations.push({
        title: "[ACTION] Accelerate Completion Rate",
        description:
          "Your completion rate is below 50%. Consider prioritizing high-impact tasks and breaking down complex ones.",
        impact: "high",
        icon: "https://img.icons8.com/color/96/000000/rocket.png",
      });
    }

    if (overdueTasks > 0) {
      recommendations.push({
        title: "[URGENT] Address Overdue Tasks",
        description: `You have ${overdueTasks} overdue task(s). Reassign them or extend deadlines to keep the team on track.`,
        impact: "high",
        icon: "https://img.icons8.com/color/96/000000/alarm.png",
      });
    }

    if (totalTasks > 20) {
      recommendations.push({
        title: "[SUGGEST] Distribute Workload",
        description:
          "Consider distributing tasks more evenly across team members to prevent burnout.",
        impact: "medium",
        icon: "https://img.icons8.com/color/96/000000/groups.png",
      });
    }

    if (completionRate > 70) {
      recommendations.push({
        title: "[SUCCESS] Maintain Momentum",
        description:
          "Great progress! Keep up this pace and consider increasing team capacity for more challenges.",
        impact: "low",
        icon: "https://img.icons8.com/color/96/000000/thumb-up.png",
      });
    }

    if (memberCount === 0) {
      recommendations.push({
        title: "[INFO] Build Your Team",
        description:
          "Invite team members to collaborate and distribute tasks more efficiently.",
        impact: "medium",
        icon: "https://img.icons8.com/color/96/000000/handshake.png",
      });
    }

    return recommendations.slice(0, 4);
  };

  const generateTrends = (
    completionRate: number,
    overdueTasks: number,
    tasks: any[],
  ): (Trend | string)[] => {
    const trends: (Trend | string)[] = [];

    if (completionRate > 0 && completionRate < 30) {
      trends.push({
        text: "Low completion rate trend detected",
        icon: "https://img.icons8.com/color/96/000000/down.png",
      });
    } else if (completionRate > 70) {
      trends.push({
        text: "Strong upward trend in task completion",
        icon: "https://img.icons8.com/color/96/000000/up.png",
      });
    } else {
      trends.push({
        text: "Steady task completion progress",
        icon: "https://img.icons8.com/color/96/000000/right.png",
      });
    }

    if (overdueTasks > Math.max(2, tasks.length * 0.2)) {
      trends.push({
        text: "High number of overdue tasks",
        icon: "https://img.icons8.com/color/96/000000/error.png",
      });
    } else if (overdueTasks === 1) {
      trends.push({
        text: "One overdue task - address it soon",
        icon: "https://img.icons8.com/color/96/000000/warning.png",
      });
    } else if (overdueTasks > 1) {
      trends.push({
        text: "Few overdue tasks - consider addressing them soon",
        icon: "https://img.icons8.com/color/96/000000/warning.png",
      });
    } else if (overdueTasks === 0) {
      trends.push({
        text: "All tasks are on schedule",
        icon: "https://img.icons8.com/color/96/000000/checkmark.png",
      });
    }

    const inProgressCount = tasks.filter(
      (t: any) => t.status === "in-progress" || t.status === "inprogress",
    ).length;
    if (inProgressCount > tasks.length * 0.3) {
      trends.push({
        text: "Multiple active tasks indicate good engagement",
        icon: "https://img.icons8.com/color/96/000000/activity.png",
      });
    }

    return trends;
  };

  const generatePerformanceSummary = (
    completionRate: number,
    overdueTasks: number,
    totalTasks: number,
    completedTasks: number,
    memberCount: number,
    avgTasksPerMember: number,
  ): string => {
    let summary = `Your team is currently tracking at ${completionRate}% completion rate with ${totalTasks} total tasks. `;

    if (completionRate > 80) {
      summary +=
        "Exceptional performance! Your team is shipping at a high velocity. ";
    } else if (completionRate > 60) {
      summary +=
        "Good progress on task completion. Continue maintaining this momentum. ";
    } else if (completionRate > 40) {
      summary +=
        "Moderate progress. Consider identifying blockers and prioritizing high-impact tasks. ";
    } else {
      summary +=
        "Low completion rate. Focus on breaking down tasks and removing blockers. ";
    }

    if (overdueTasks > 0) {
      summary += `With ${overdueTasks} overdue task(s), prioritize addressing these to maintain team velocity. `;
    }

    summary += `Average task distribution per team member is ${avgTasksPerMember} tasks${
      memberCount > 0 ? " across " + memberCount + " members" : ""
    }. Focus on maintaining momentum while addressing any blockers.`;

    return summary;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-white/40 text-lg">Loading analytics...</div>
      </div>
    );
  }

  // Check authorization - Analytics restricted to MANAGER+
  const authorizedRoles = ["MANAGER", "CO_OWNER", "OWNER"];
  if (
    currentUser &&
    currentUser.role &&
    !authorizedRoles.includes(currentUser.role)
  ) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-5">
        <div className="max-w-xs text-center bg-red-500/10 border border-red-500/30 rounded-lg p-10 flex flex-col items-center gap-4">
          <Lock size={48} className="text-red-400" />
          <h2 className="m-0 text-xl font-semibold text-white/62">
            Access Denied
          </h2>
          <p className="m-0 text-sm text-white/40 leading-relaxed">
            Analytics is restricted to managers and above. Your current role (
            <strong>{currentUser.role}</strong>) does not have permission to
            access this page.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-4 px-5 py-2 bg-blue-600 text-white rounded-md cursor-pointer text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-white/40 text-lg">Failed to load analytics</div>
      </div>
    );
  }

  return (
    <PageContainer title="ANALYTICS">
      {/* Key Metrics Grid - Using StatusCards for consistency */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatusCard
          count={analytics.totalTasks}
          label="Total Tasks"
          icon="clock"
          color="from-blue-500/20 to-blue-600/20"
        />
        <StatusCard
          count={analytics.completedTasks}
          label="Completed"
          icon="check"
          color="from-green-500/20 to-green-600/20"
        />
        <div className="bg-blue-400/10 backdrop-blur-lg border border-white/10 rounded-sm shadow-lg p-4 flex-1 flex-col justify-between h-full transition-all duration-300 w-auto min-w-[136px]">
          <div className="flex w-full items-center justify-center gap-4">
            <div className="text-purple-400">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-white/40 m-0">Success Rate</p>
              <p className="text-3xl font-normal text-white/62 mt-1 pl-0 m-0">
                {analytics.completionRate}%
              </p>
            </div>
          </div>
        </div>
        <StatusCard
          count={analytics.overdueTasks}
          label="Overdue"
          icon="alert"
          color="from-red-500/20 to-red-600/20"
        />
      </div>

      {/* Critical Path - Task Optimization using Dijkstra */}
      <div className="bg-blue-400/10 backdrop-blur-lg border border-white/10 rounded-sm shadow-xl p-5 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Network size={24} className="text-blue-400" />
          <h2 className="text-base font-semibold m-0 text-white/62">
            Optimal Task Sequence (Dijkstra's Algorithm)
          </h2>
        </div>

        {dijkstraError ? (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-400 text-xs flex gap-2 items-center">
            <AlertCircle size={18} />
            <span>{dijkstraError}</span>
          </div>
        ) : criticalPath ? (
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-md text-sm">
            <p className="m-0 text-white/62 font-semibold">
              🎯 <strong>Optimal Path:</strong> {criticalPath}
            </p>
            <p className="m-0 mt-2 text-xs text-white/40">
              This represents the critical path - the longest sequence of
              dependent tasks that determines the minimum project completion
              time.
            </p>
          </div>
        ) : (
          <p className="text-xs text-white/40 m-0">
            Loading optimal task sequence...
          </p>
        )}
      </div>

      {/* Two Column Layout - Campaign Performance Summary & AI Recommendations */}
      <div className="grid grid-cols-2 gap-5 mb-6">
        {/* Campaign Performance Summary - Left */}
        <div className="bg-green-500/10 border border-green-500/20 p-5 rounded-sm shadow-xl">
          <h3 className="text-sm font-semibold m-0 mb-3 text-white/62 flex items-center gap-2">
            <Sparkles size={16} className="text-green-400" /> Campaign
            Performance Summary
          </h3>
          <div className="text-xs text-white/70 leading-relaxed">
            <p>
              {analytics.performanceSummary ||
                `Your team is currently tracking at ${analytics.completionRate}% completion rate with ${analytics.totalTasks} total tasks. With ${analytics.completedTasks} completed and ${analytics.overdueTasks} overdue, the recommended focus is on maintaining momentum while addressing any blockers. Average task distribution per team member is ${analytics.avgTasksPerMember} tasks.`}
            </p>
          </div>

          {/* Completion Metrics */}
          {analytics.completedTasks > 0 && (
            <div className="mt-4 pt-4 border-t border-green-500/20">
              <div className="text-xs font-semibold text-green-300 mb-3 flex items-center gap-1">
                <CheckCircle size={14} className="text-green-400" /> Completion
                Metrics
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white/5 rounded text-xs border border-white/10">
                  <p className="text-white/40 m-0 mb-1">Total Completed</p>
                  <p className="text-white/62 font-semibold m-0 text-lg">
                    {analytics.completedTasks}
                  </p>
                </div>
                <div className="p-3 bg-white/5 rounded text-xs border border-white/10">
                  <p className="text-white/40 m-0 mb-1">Completion Rate</p>
                  <p className="text-white/62 font-semibold m-0 text-lg">
                    {analytics.completionRate}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* AI Recommendations - Right */}
        <div className="bg-blue-400/10 backdrop-blur-lg border border-white/10 rounded-sm shadow-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={18} className="text-yellow-400" />
            <h2 className="text-base font-semibold m-0 text-white/62">
              AI Recommendations
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {(analytics?.recommendations || []).length > 0 ? (
              analytics.recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="bg-white/5 border border-white/10 p-3 rounded-md hover:bg-white/10 transition-colors"
                >
                  <h3 className="text-xs font-semibold m-0 mb-1 text-white/62">
                    {rec.title}
                  </h3>
                  <p className="text-xs text-white/40 m-0 leading-relaxed">
                    {rec.description}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-white/40">
                No recommendations available yet
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Charts Grid - Weekly Progress and Task Summary (Reversed Layout) */}
      <div className="grid grid-cols-2 gap-5 mb-6">
        {/* Task Summary - Left */}
        <TaskSummary
          completed={analytics.completedTasks}
          total={analytics.totalTasks}
          inProgress={taskStatusCounts.inProgress}
          pending={
            analytics.totalTasks -
            analytics.completedTasks -
            taskStatusCounts.inProgress
          }
          overdue={analytics.overdueTasks}
          aiInsight={
            taskStatusCounts.done > taskStatusCounts.inProgress
              ? "Strong completion rate! Your team is shipping tasks at a healthy pace. Keep maintaining this momentum."
              : taskStatusCounts.inProgress > taskStatusCounts.stuck
                ? "Good progress on active work. Focus on reducing bottlenecks to improve completion rate."
                : "Many tasks are stuck. Prioritize unblocking these to accelerate delivery."
          }
        />

        {/* Weekly Progress Chart - Right */}
        <WeeklyProgressChart data={weeklyData} />
      </div>

      {/* Completed Tasks History (detailed with filters) */}
      <div className="mt-6 bg-blue-400/10 backdrop-blur-lg border border-white/10 rounded-sm shadow-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle size={18} className="text-green-400" />
          <h2 className="text-base font-semibold m-0 text-white/62">
            Completed Tasks
          </h2>
        </div>
        {/* Toolbar with welcome message, search, and sort */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-white/62">
            {currentUser
              ? `Welcome back, ${currentUser.name || currentUser.email}! Here are your completed tasks for today.`
              : "Completed Tasks"}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search task title or assignee..."
              className="bg-white/10 border border-white/20 text-white/62 placeholder-white/40 p-2 rounded-md text-xs w-72"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <label className="text-xs text-white/40">Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-white/5 text-white/62 p-2 rounded-md text-xs"
              >
                <option value="name">Name (A-Z)</option>
                <option value="created">Task Created</option>
                <option value="completed">Task Completed</option>
              </select>
              <button
                onClick={() =>
                  setSortDir((s) => (s === "asc" ? "desc" : "asc"))
                }
                className="bg-white/5 text-white/62 p-2 rounded-md text-xs"
                title="Toggle sort direction"
              >
                {sortDir === "asc" ? "Asc" : "Desc"}
              </button>
            </div>
          </div>
        </div>

        <PageContentCon className="h-[300px] overflow-y-auto rounded-md">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-blue-500/40 sticky top-0">
              <tr className="border-b border-black/10">
                <th className="px-3 py-2 text-left font-light text-white col-span-2">
                  Task
                </th>
                <th className="px-3 py-2 text-left font-light text-white">
                  Assignee
                </th>
                <th className="px-3 py-2 text-center font-light text-white">
                  Attachment
                </th>
                <th className="px-3 py-2 text-center font-light text-white">
                  Comment
                </th>
                <th className="px-3 py-2 text-center font-light text-white">
                  Priority
                </th>
                <th className="px-3 py-2 text-right font-light text-white">
                  Date Completed
                </th>
                <th className="px-3 py-2 text-center font-light text-white">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const q = searchQuery.trim().toLowerCase();
                let items = completedTasksHistory.filter((task) => {
                  if (!q) return true;
                  return (
                    task.title.toLowerCase().includes(q) ||
                    (task.assignedBy || "").toLowerCase().includes(q)
                  );
                });

                items = items.sort((a: any, b: any) => {
                  if (sortBy === "name") {
                    const an = a.title.toLowerCase();
                    const bn = b.title.toLowerCase();
                    return sortDir === "asc"
                      ? an.localeCompare(bn)
                      : bn.localeCompare(an);
                  }
                  if (sortBy === "created") {
                    const ac = new Date(a.createdDate).getTime();
                    const bc = new Date(b.createdDate).getTime();
                    return sortDir === "asc" ? ac - bc : bc - ac;
                  }
                  // default: completed
                  const ad = new Date(a.completedDate).getTime();
                  const bd = new Date(b.completedDate).getTime();
                  return sortDir === "asc" ? ad - bd : bd - ad;
                });

                const visible = items.slice(0, visibleCount);

                return (
                  <>
                    {visible.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-10 text-center text-blue-200"
                        >
                          {completedTasksHistory.length === 0
                            ? "No completed tasks"
                            : "No matching tasks"}
                        </td>
                      </tr>
                    ) : (
                      visible.map((task: any, i: number) => {
                        const completedDate = new Date(task.completedDate);
                        return (
                          <tr
                            key={task.id || i}
                            className="border-b border-white/6 hover:bg-white/2 transition-colors"
                          >
                            <td className="px-3 py-2 text-sm text-white/62 truncate">
                              {task.title}
                            </td>
                            <td className="px-3 py-2 truncate">
                              {task.assignedBy}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {task.attachments &&
                              task.attachments.length > 0 ? (
                                <a
                                  href={
                                    task.attachments[0].url ||
                                    task.attachments[0].filename ||
                                    "#"
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-white/60"
                                >
                                  <Paperclip size={14} />{" "}
                                  {task.attachments.length}
                                </a>
                              ) : (
                                <span className="text-white/40">0</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {task.comments && task.comments.length > 0 ? (
                                <span className="inline-flex items-center gap-1 text-white/60">
                                  <MessageSquare size={14} />{" "}
                                  {task.comments.length}
                                </span>
                              ) : (
                                <span className="text-white/40">0</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center capitalize">
                              {task.priority || "medium"}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {completedDate.toLocaleDateString()}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {isOwner(task) && (
                                <div className="relative">
                                  <button
                                    onClick={() =>
                                      setMenuOpenTaskId(
                                        menuOpenTaskId === task.id
                                          ? null
                                          : task.id,
                                      )
                                    }
                                    className="p-1 text-white/60 hover:text-white transition-colors"
                                    title="Actions"
                                  >
                                    ⋮
                                  </button>
                                  {menuOpenTaskId === task.id && (
                                    <div className="absolute right-0 top-[calc(100%+4px)] bg-blue-950 border border-white/10 rounded-lg shadow-xl z-50 min-w-[120px]">
                                      <button
                                        onClick={() => {
                                          setDeleteModalTaskId(task.id);
                                          setDeleteModalTaskTitle(task.title);
                                          setMenuOpenTaskId(null);
                                        }}
                                        className="w-full px-3 py-2 bg-none border-none text-white text-left cursor-pointer hover:bg-white/10 transition-colors text-sm"
                                      >
                                        Delete
                                      </button>
                                      <button
                                        onClick={async () => {
                                          try {
                                            const res = await fetch(
                                              `/api/tasks/${task.id}`,
                                              {
                                                method: "PATCH",
                                                headers: {
                                                  "Content-Type":
                                                    "application/json",
                                                },
                                                body: JSON.stringify({
                                                  status: "in-progress",
                                                }),
                                              },
                                            );
                                            if (res.ok) {
                                              setCompletedTasksHistory(
                                                completedTasksHistory.filter(
                                                  (t) => t.id !== task.id,
                                                ),
                                              );
                                              setMenuOpenTaskId(null);
                                              toast.success(
                                                "Task moved back to In Progress",
                                              );
                                            } else {
                                              toast.error(
                                                "Failed to undo task",
                                              );
                                            }
                                          } catch (error) {
                                            console.error(
                                              "Failed to undo task:",
                                              error,
                                            );
                                            toast.error("Failed to undo task");
                                          }
                                        }}
                                        className="w-full px-3 py-2 bg-none border-none text-white text-left cursor-pointer hover:bg-white/10 transition-colors text-sm"
                                      >
                                        Undo
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </>
                );
              })()}
            </tbody>
          </table>
        </PageContentCon>

        <div className="flex justify-center mt-3">
          {completedTasksHistory.length > visibleCount && (
            <button
              onClick={() => setVisibleCount((v) => v + 10)}
              className="px-3 py-1 rounded-md bg-blue-500/30 text-white text-xs"
            >
              Load more
            </button>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalTaskId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center rounded-md z-50">
          <div className="bg-gray-900 border border-white/20 rounded-md p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-white mb-2">
              Delete Task
            </h3>
            <p className="text-sm text-white/60 mb-4">
              Are you sure you want to permanently delete{" "}
              <strong className="text-white">"{deleteModalTaskTitle}"</strong>?
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteModalTaskId(null)}
                className="px-4 py-2 rounded-md bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/tasks/${deleteModalTaskId}`, {
                      method: "DELETE",
                    });
                    if (res.ok) {
                      setCompletedTasksHistory(
                        completedTasksHistory.filter(
                          (t) => t.id !== deleteModalTaskId,
                        ),
                      );
                      setDeleteModalTaskId(null);
                      toast.success("Task deleted permanently");
                    } else {
                      toast.error("Failed to delete task");
                    }
                  } catch (error) {
                    console.error("Failed to delete task:", error);
                    toast.error("Failed to delete task");
                  }
                }}
                className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
