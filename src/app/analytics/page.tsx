"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, TrendingUp, Brain } from "lucide-react";
import { ToastProvider } from "@/app/components/providers-popups/ToastNotificationProviderComponent";
import { AnalyticsStatusCards } from "@/app/components/analytics/AnalyticsStatusCardsComponent";
import { AnalyticsTaskExecutionSummary } from "@/app/components/analytics/AnalyticsTaskExecutionSummaryPieChartComponent";
import { AnalyticsOverallWeeklyChart } from "@/app/components/analytics/AnalyticsOverallWeeklyChartComponent";
import { NaturalLanguageAutomatedInsights } from "@/app/components/analytics/NaturalLanguageAutomatedInsightsComponent";
import { getCurrentUser } from "@/utils/sessionManager";
import { useAuthProtection } from "@/app/hooks/useAuthProtection";
import { PageContainer } from "@/app/components/page-layouts/MainPageContainerLayoutComponent";
import { TeamWorkloadCard } from "@/app/components/analytics/TeamWorkloadCardComponent";
import { DeadlineRiskCard } from "@/app/components/analytics/DeadlineRiskCardComponent";

interface AnalyticsData {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  overdueTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
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
  useAuthProtection();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<
    Array<{
      date: string;
      completed: number;
      inProgress: number;
      overdue: number;
    }>
  >([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [teamWorkload, setTeamWorkload] = useState<any[]>([]);
  const [atRiskTasks, setAtRiskTasks] = useState<any[]>([]);
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          setCurrentUser(user);
        }
      } catch (error) {
        console.error("Failed to load user:", error);
      }
    };
    loadUser();
  }, []);

  // Fetch analytics data
  useEffect(() => {
    if (!currentUser) return;

    const fetchAnalytics = async () => {
      try {
        setAnalyticsError(null);
        const tasksRes = await fetch("/api/task-management", {
          headers: { "x-user-id": String(currentUser.id) },
        });
        if (!tasksRes.ok) {
          throw new Error("Failed to fetch tasks");
        }
        const tasksData = await tasksRes.json();
        const tasks = Array.isArray(tasksData?.tasks) ? tasksData.tasks : [];

        // Calculate metrics - align with TaskGroupedDisplay logic
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const totalTasks = tasks.length;

        // Helper function to normalize status
        const normalizeStatus = (status: any): string => {
          if (!status) return "todo";
          return String(status).toLowerCase().replace(/\s+/g, "");
        };

        // Categorize tasks by status using the same logic as TaskGroupedDisplay
        const completedTasks = tasks.filter((t: any) => {
          const status = normalizeStatus(t.status);
          return status === "completed" || status === "done";
        }).length;

        const inProgressTasks = tasks.filter((t: any) => {
          const status = normalizeStatus(t.status);
          return status === "inprogress" || status === "in_progress";
        }).length;

        const stuckTasks = tasks.filter((t: any) => {
          const status = normalizeStatus(t.status);
          return status === "stuck";
        }).length;

        const todoTasks = tasks.filter((t: any) => {
          const status = normalizeStatus(t.status);
          return status === "todo";
        }).length;

        // Pending: all incomplete tasks (not completed)
        const pendingTasks = totalTasks - completedTasks;

        // Overdue: not completed AND past due date
        const overdueTasks = tasks.filter((t: any) => {
          const status = normalizeStatus(t.status);
          const isDone = status === "completed" || status === "done";
          if (isDone) return false; // Completed tasks can't be overdue
          if (!t.dueDate) return false;

          const dueDate = new Date(t.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate < now;
        }).length;

        const completionRate =
          totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        // Calculate historical data
        const dateMap = new Map<
          string,
          { completed: number; inProgress: number; overdue: number }
        >();

        // Get date range from tasks
        let earliestDate = new Date();
        let latestDate = new Date();

        tasks.forEach((task: any) => {
          if (task.createdDate) {
            const taskDate = new Date(task.createdDate);
            if (taskDate < earliestDate) earliestDate = taskDate;
            if (taskDate > latestDate) latestDate = taskDate;
          }
          if (task.completedDate) {
            const completeDate = new Date(task.completedDate);
            if (completeDate > latestDate) latestDate = completeDate;
          }
        });

        // Generate all dates from earliest to latest
        const currentDate = new Date(earliestDate);
        while (currentDate <= latestDate) {
          const dateStr = currentDate.toISOString().split("T")[0];
          dateMap.set(dateStr, { completed: 0, inProgress: 0, overdue: 0 });
          currentDate.setDate(currentDate.getDate() + 1);
        }

        // Count tasks by status on each date - align with TaskGroupedDisplay logic
        dateMap.forEach((stats, dateStr) => {
          const checkDate = new Date(dateStr + "T00:00:00");
          checkDate.setHours(0, 0, 0, 0);

          tasks.forEach((task: any) => {
            const status = normalizeStatus(task.status);
            const isCompleted = status === "completed" || status === "done";
            const isInProgress =
              status === "inprogress" || status === "in_progress";
            const createdDate = task.createdAt
              ? new Date(task.createdAt)
              : null;
            const updatedDate = task.updatedAt
              ? new Date(task.updatedAt)
              : null;
            const dueDate = task.dueDate ? new Date(task.dueDate) : null;

            // Task must exist by this date
            if (!createdDate) return;
            createdDate.setHours(0, 0, 0, 0);
            if (createdDate > checkDate) return;

            // Only count completed tasks if they were completed on or before this date
            if (isCompleted) {
              // Only show completed on the date it was marked as completed
              if (updatedDate) {
                const completedDateStr = new Date(updatedDate);
                completedDateStr.setHours(0, 0, 0, 0);
                if (dateStr === completedDateStr.toISOString().split("T")[0]) {
                  stats.completed++;
                }
              }
              return;
            }

            // For non-completed tasks, check if overdue on this date
            if (dueDate) {
              const dueDateCheck = new Date(dueDate);
              dueDateCheck.setHours(0, 0, 0, 0);
              if (dueDateCheck < checkDate) {
                // Task is past its due date on this historical date
                stats.overdue++;
                return;
              }
            }

            // Task is active (in-progress or todo/stuck) and not overdue
            if (isInProgress) {
              stats.inProgress++;
            }
          });
        });

        // Convert to array and sort by date
        const historyArray = Array.from(dateMap.entries())
          .map(([date, stats]) => ({
            date,
            completed: stats.completed,
            inProgress: stats.inProgress,
            overdue: stats.overdue,
          }))
          .sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          );

        setHistoryData(historyArray);

        // Fetch team members and calculate workload
        try {
          const teamRes = await fetch("/api/team-management", {
            headers: { "x-user-id": String(currentUser.id) },
          });
          if (teamRes.ok) {
            const teamData = await teamRes.json();
            const members = Array.isArray(teamData?.teamMembers)
              ? teamData.teamMembers
              : [];
            setTeamMembers(members);

            // Calculate workload per team member
            const workloadData = members
              .map((member: any) => {
                const memberTasks = tasks.filter(
                  (t: any) => t.assignedToUser?.id === member.id || t.userId === member.id,
                );
                const completedByMember = memberTasks.filter((t: any) => {
                  const status = normalizeStatus(t.status);
                  return status === "completed" || status === "done";
                }).length;
                const inProgressByMember = memberTasks.filter((t: any) => {
                  const status = normalizeStatus(t.status);
                  return status === "inprogress" || status === "in_progress";
                }).length;
                const overdueByMember = memberTasks.filter((t: any) => {
                  const status = normalizeStatus(t.status);
                  const isDone = status === "completed" || status === "done";
                  if (isDone) return false;
                  if (!t.dueDate) return false;
                  const dueDate = new Date(t.dueDate);
                  dueDate.setHours(0, 0, 0, 0);
                  return dueDate < now;
                }).length;
                const capacity = Math.round(
                  (memberTasks.length / (tasks.length || 1)) * 100,
                );
                return {
                  userId: member.id,
                  userName: member.name || member.email,
                  totalTasks: memberTasks.length,
                  inProgress: inProgressByMember,
                  completed: completedByMember,
                  overdue: overdueByMember,
                  capacity: Math.max(0, Math.min(100, capacity)),
                };
              })
              .filter((member: any) => member.totalTasks > 0);
            setTeamWorkload(workloadData);
          }
        } catch (error) {
          console.error("[Analytics] Failed to fetch team data:", error);
        }

        // Get at-risk tasks (overdue + high priority + due soon)
        const riskTasks = tasks
          .filter((t: any) => {
            const status = normalizeStatus(t.status);
            const isDone = status === "completed" || status === "done";
            if (isDone) return false;
            if (!t.dueDate) return false;
            const dueDate = new Date(t.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return (
              dueDate <= today ||
              (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24) <= 3
            );
          })
          .map((t: any) => {
            const dueDate = new Date(t.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const daysUntilDue = Math.ceil(
              (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
            );
            const priorityMap: { [key: string]: number } = {
              high: 3,
              medium: 2,
              low: 1,
            };
            const urgencyScore = Math.min(
              100,
              (4 - daysUntilDue) * 20 + (priorityMap[t.priority] || 1) * 15,
            );
            return {
              id: t.id,
              title: t.title,
              daysUntilDue: daysUntilDue > 0 ? daysUntilDue : 0,
              daysOverdue:
                daysUntilDue < 0 ? Math.abs(daysUntilDue) : undefined,
              priority: (t.priority || "medium").toLowerCase(),
              assignee: t.assignedToUser?.name || "Unassigned",
              urgencyScore,
            };
          })
          .sort((a: any, b: any) => b.urgencyScore - a.urgencyScore)
          .slice(0, 5);
        setAtRiskTasks(riskTasks);

        setAnalytics({
          totalTasks,
          completedTasks,
          completionRate,
          overdueTasks,
          inProgressTasks,
          pendingTasks,
        });
      } catch (error) {
        console.error("[Analytics] Error:", error);
        setAnalyticsError(
          error instanceof Error ? error.message : "Unknown error",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [currentUser]);

  // Authorization check
  const authorizedRoles = ["ADMIN", "OWNER"];
  if (
    currentUser &&
    currentUser.role &&
    !authorizedRoles.includes(currentUser.role)
  ) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-5">
        <div className="max-w-xs text-center bg-red-500/10 border border-red-500/30 rounded-lg p-10 flex flex-col items-center gap-4">
          <Lock size={48} className="text-red-400" />
          <h2 className="m-0 text-xl font-semibold text-black/62">
            Access Denied
          </h2>
          <p className="m-0 text-sm text-black/60 leading-relaxed">
            Analytics is restricted to admins and above.
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

  return (
    <PageContainer title="Analytics">
      {/* Error Display */}
      {analyticsError && (
        <div className="mb-4 p-4 bg-red-100/80 border border-red-300/50 rounded-sm">
          <p className="text-sm text-red-700 font-medium">⚠️ Error</p>
          <p className="text-sm text-red-600 mt-1">{analyticsError}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-black/62">Loading AI Analytics...</div>
        </div>
      ) : !analytics ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-black/62">Failed to load analytics</div>
        </div>
      ) : analytics.totalTasks === 0 ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-center max-w-md">
            <div className="text-5xl mb-4">📋</div>
            <h2 className="text-xl font-semibold text-black/62 m-0 mb-2">
              No Tasks Yet
            </h2>
            <p className="text-sm text-black/50 m-0 mb-6">
              Start creating tasks to see AI-powered analytics and insights
              about your team's performance.
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Create Your First Task
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* SECTION 1: Status Overview + Task Execution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 mb-3.5">
            {/* Status Cards (left) */}
            <div className="lg:col-span-1.5">
              <AnalyticsStatusCards
                pending={analytics.pendingTasks}
                inProgress={analytics.inProgressTasks}
                completed={analytics.completedTasks}
                overdue={analytics.overdueTasks}
              />
            </div>

            {/* Task Execution Pie (right) */}
            <div className="lg:col-span-1.5 h-80">
              <AnalyticsTaskExecutionSummary
                completed={analytics.completedTasks}
                inProgress={analytics.inProgressTasks}
                pending={analytics.pendingTasks}
                overdue={analytics.overdueTasks}
              />
            </div>
          </div>

          {/* SECTION 2: Team Workload + Deadline Risk */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-3.5">
            <TeamWorkloadCard loading={loading} teamMembers={teamWorkload} />
            <DeadlineRiskCard
              loading={loading}
              tasks={atRiskTasks}
              overdueTasks={analytics.overdueTasks}
            />
          </div>

          {/* SECTION 3 & 4: Performance Trends + AI Insights (Side by Side) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-3.5">
            {/* Weekly Productivity Trend */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col h-80">
              <div className="border-b border-gray-300/50 p-4 shrink-0 flex items-center gap-2 bg-blue-50">
                <TrendingUp size={18} className="text-blue-700" />
                <h3 className="text-sm font-semibold text-gray-800 m-0">
                  Weekly Productivity
                </h3>
              </div>
              <div className="flex-1 p-4 overflow-hidden">
                <AnalyticsOverallWeeklyChart data={historyData} />
              </div>
            </div>

            {/* AI Insights & Recommendations */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col h-80 overflow-y-auto">
              <div className="border-b border-gray-300/50 p-4 shrink-0 flex items-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50">
                <Brain size={18} className="text-blue-700" />
                <h3 className="text-sm font-semibold text-gray-800 m-0">
                  AI Insights
                </h3>
              </div>
              <div className="flex-1 p-4 overflow-y-auto">
                <NaturalLanguageAutomatedInsights
                  loading={loading}
                  insights={[
                    {
                      text: `Your completion rate is at ${analytics.completionRate}%, which is ${
                        analytics.completionRate > 70
                          ? "excellent"
                          : analytics.completionRate > 50
                            ? "good"
                            : "needs improvement"
                      }. Keep pushing!`,
                      type:
                        analytics.completionRate > 70
                          ? "positive"
                          : analytics.completionRate > 50
                            ? "info"
                            : "warning",
                      icon: "chart",
                    },
                    {
                      text: `${analytics.inProgressTasks} task${analytics.inProgressTasks !== 1 ? "s are" : " is"} currently in progress. Steady pace maintained.`,
                      type: "info",
                      icon: "trending",
                    },
                    ...(analytics.overdueTasks > 0
                      ? [
                          {
                            text: `⚠️ ${analytics.overdueTasks} overdue task${analytics.overdueTasks !== 1 ? "s" : ""} need immediate attention to stay on track.`,
                            type: "warning" as const,
                            icon: "alert" as const,
                          },
                        ]
                      : []),
                  ]}
                  anomalies={[]}
                  naturalLanguageSummary={`Team has ${analytics.totalTasks} tasks in total. Completion rate is ${analytics.completionRate}%. Currently focused on ${analytics.inProgressTasks} in-progress tasks. ${analytics.overdueTasks > 0 ? `Urgent: ${analytics.overdueTasks} tasks are overdue.` : "On track with no overdue items."}`}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </PageContainer>
  );
}
