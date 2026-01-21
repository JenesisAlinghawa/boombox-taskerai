"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Lock, Network } from "lucide-react";
import TaskStatusChart from "@/app/components/TaskStatusChart";
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
  bg: "#ffffff",
  cardBg: "#F9FAFD",
  text: "#1f2937",
  muted: "#6b7280",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  info: "#3b82f6",
  shadow: "#E1F1FD",
  primary: "#5d8bb1",
  inProgress: "#3b82f6",
  done: "#10b981",
  stuck: "#ef4444",
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
  const router = useRouter();
  useAuthProtection(); // Protect this route
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
      <div
        style={{
          minHeight: "100vh",
          background: COLORS.bg,
          color: COLORS.text,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ fontSize: 18, color: COLORS.muted }}>
          Loading analytics...
        </div>
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
      <div
        style={{
          minHeight: "100vh",
          background: COLORS.bg,
          color: COLORS.text,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <div
          style={{
            maxWidth: "400px",
            textAlign: "center",
            background: "#fef2f2",
            border: "1px solid #fee2e2",
            borderRadius: "12px",
            padding: "40px 30px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <Lock size={48} color="#ef4444" />
          <h2 style={{ margin: "0", fontSize: "20px", fontWeight: "600" }}>
            Access Denied
          </h2>
          <p
            style={{
              margin: "0",
              fontSize: "14px",
              color: COLORS.muted,
              lineHeight: "1.6",
            }}
          >
            Analytics is restricted to managers and above. Your current role (
            <strong>{currentUser.role}</strong>) does not have permission to
            access this page.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            style={{
              marginTop: "16px",
              padding: "10px 20px",
              background: COLORS.primary,
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
            }}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: COLORS.bg,
          color: COLORS.text,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ fontSize: 18, color: COLORS.muted }}>
          Failed to load analytics
        </div>
      </div>
    );
  }

  return (
    <PageContainer title="ANALYTICS">
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            background: "none",
            border: "none",
            fontSize: 24,
            cursor: "pointer",
            color: COLORS.text,
            padding: 0,
          }}
        >
          ←
        </button>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 600,
            margin: 0,
            color: COLORS.text,
          }}
        >
          Analytics Overview
        </h1>
      </div>

      {/* Key Metrics Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {[
          {
            label: "Campaign Tasks",
            value: analytics.totalTasks,
            color: COLORS.info,
          },
          {
            label: "Delivered",
            value: analytics.completedTasks,
            color: COLORS.success,
          },
          {
            label: "Success Rate",
            value: `${analytics.completionRate}%`,
            color: COLORS.warning,
          },
          {
            label: "Timeline Risks",
            value: analytics.overdueTasks,
            color: COLORS.error,
          },
        ].map((metric, i) => (
          <div
            key={i}
            style={{
              background: COLORS.cardBg,
              border: "1px solid rgba(0,0,0,0.1)",
              filter: "drop-shadow(2px 2px 5px rgba(211, 212, 214, 0.5))",
              padding: 20,
              borderRadius: 8,
              display: "flex",
              gap: 16,
              alignItems: "flex-start",
            }}
          >
            <div>
              <p style={{ fontSize: 12, color: COLORS.muted, margin: 0 }}>
                {metric.label}
              </p>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: metric.color,
                  marginTop: 4,
                }}
              >
                {metric.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Critical Path - Task Optimization using Dijkstra */}
      <div
        style={{
          background: COLORS.cardBg,
          border: "1px solid rgba(0,0,0,0.1)",
          filter: "drop-shadow(2px 2px 5px rgba(211, 212, 214, 0.5))",
          padding: 20,
          borderRadius: 8,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <Network size={24} color={COLORS.info} />
          <h2
            style={{
              fontSize: 16,
              fontWeight: 600,
              margin: 0,
              color: COLORS.text,
            }}
          >
            Optimal Task Sequence (Dijkstra's Algorithm)
          </h2>
        </div>

        {dijkstraError ? (
          <div
            style={{
              padding: 12,
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: 6,
              color: COLORS.error,
              fontSize: 13,
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            <AlertCircle size={18} />
            <span>{dijkstraError}</span>
          </div>
        ) : criticalPath ? (
          <div
            style={{
              padding: 12,
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              borderRadius: 6,
              fontSize: 13,
            }}
          >
            <p style={{ margin: 0, color: COLORS.text, fontWeight: 500 }}>
              🎯 <strong>Optimal Path:</strong> {criticalPath}
            </p>
            <p
              style={{
                margin: "8px 0 0",
                fontSize: 12,
                color: COLORS.muted,
              }}
            >
              This represents the critical path - the longest sequence of
              dependent tasks that determines the minimum project completion
              time.
            </p>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: COLORS.muted, margin: 0 }}>
            Loading optimal task sequence...
          </p>
        )}
      </div>

      {/* Two Column Layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          marginBottom: 24,
        }}
      >
        {/* Recommendations */}
        <div
          style={{
            background: COLORS.cardBg,
            border: "1px solid rgba(0,0,0,0.1)",
            filter: "drop-shadow(2px 2px 5px rgba(211, 212, 214, 0.5))",
            padding: 20,
            borderRadius: 8,
          }}
        >
          <h2
            style={{
              fontSize: 16,
              fontWeight: 600,
              marginBottom: 16,
              margin: 0,
              color: "#333",
            }}
          >
            Smart Recommendations
          </h2>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              marginTop: 16,
            }}
          >
            {(analytics?.recommendations || []).length > 0 ? (
              analytics.recommendations.map((rec, i) => (
                <div
                  key={i}
                  style={{
                    background: "rgba(0, 0, 0, 0.02)",
                    border: "1px solid rgba(0, 0, 0, 0.1)",
                    padding: 12,
                    borderRadius: 6,
                  }}
                >
                  <h3
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      margin: "0 0 4px",
                      color: COLORS.text,
                    }}
                  >
                    {rec.title}
                  </h3>
                  <p
                    style={{
                      fontSize: 12,
                      color: COLORS.muted,
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    {rec.description}
                  </p>
                </div>
              ))
            ) : (
              <p style={{ fontSize: 12, color: COLORS.muted }}>
                No recommendations available yet
              </p>
            )}
          </div>
        </div>

        {/* Trends */}
        <div
          style={{
            background: COLORS.cardBg,
            border: "1px solid rgba(0,0,0,0.1)",
            filter: "drop-shadow(2px 2px 5px rgba(211, 212, 214, 0.5))",
            padding: 20,
            borderRadius: 8,
          }}
        >
          <h2
            style={{
              fontSize: 16,
              fontWeight: 600,
              marginBottom: 16,
              margin: 0,
              color: "#333",
            }}
          >
            Campaign Performance Trends
          </h2>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              marginTop: 16,
            }}
          >
            {(analytics?.trends || []).length > 0 ? (
              analytics.trends.map((trend, i) => {
                const trendData =
                  typeof trend === "string" ? { text: trend } : trend;
                return (
                  <div
                    key={i}
                    style={{
                      padding: 12,
                      background: "rgba(0, 0, 0, 0.02)",
                      borderRadius: 6,
                      border: "1px solid rgba(0, 0, 0, 0.1)",
                    }}
                  >
                    <span style={{ fontSize: 13, color: COLORS.text }}>
                      {trendData.text}
                    </span>
                  </div>
                );
              })
            ) : (
              <p style={{ fontSize: 12, color: COLORS.muted }}>
                No trends available yet
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Charts Grid - Overall Task Overview and Team Progress */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))",
          gap: 20,
          marginBottom: 24,
        }}
      >
        {/* Overall Task Overview - Detailed Pie Chart with AI Insights */}
        <div
          style={{
            background: "#F9FAFD",
            border: "1px solid rgba(0,0,0,0.1)",
            filter: "drop-shadow(2px 2px 5px rgba(211, 212, 214, 0.5))",
            padding: 20,
            borderRadius: 8,
          }}
        >
          <h3
            style={{
              fontSize: 15,
              fontWeight: 600,
              margin: "0 0 16px 0",
              color: "#333",
            }}
          >
            Overall task overview
          </h3>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 48,
                justifyContent: "center",
              }}
            >
              {/* Pie Chart SVG */}
              {analytics.totalTasks > 0 ? (
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <svg
                    width="280"
                    height="280"
                    viewBox="0 0 200 200"
                    style={{ flexShrink: 0 }}
                  >
                    <g transform="translate(100,100)">
                      {(() => {
                        const radius = 90;
                        const gap = 0.04;
                        let cumulative = -Math.PI / 2;

                        const segments = [
                          {
                            value: taskStatusCounts.inProgress,
                            color: COLORS.inProgress,
                            label: "Working on it",
                          },
                          {
                            value: taskStatusCounts.done,
                            color: COLORS.done,
                            label: "Done",
                          },
                          {
                            value: taskStatusCounts.stuck,
                            color: COLORS.stuck,
                            label: "Stuck",
                          },
                        ].filter((s) => s.value > 0);

                        return segments.map((segment, i) => {
                          const portion = segment.value / analytics.totalTasks;
                          const angle = portion * Math.PI * 2;
                          const startAngle = cumulative + gap / 2;
                          const endAngle = cumulative + angle - gap / 2;

                          const x1 = radius * Math.cos(startAngle);
                          const y1 = radius * Math.sin(startAngle);
                          const x2 = radius * Math.cos(endAngle);
                          const y2 = radius * Math.sin(endAngle);

                          const largeArc = angle > Math.PI ? 1 : 0;

                          // Calculate text position in the middle of the segment
                          const textAngle = cumulative + angle / 2;
                          const textRadius = radius * 0.65;
                          const textX = textRadius * Math.cos(textAngle);
                          const textY = textRadius * Math.sin(textAngle);

                          if (
                            segments.length === 1 &&
                            angle > 2 * Math.PI - 0.1
                          ) {
                            return (
                              <g key={i}>
                                <circle
                                  cx="0"
                                  cy="0"
                                  r={radius}
                                  fill={segment.color}
                                  stroke="#ffffff"
                                  strokeWidth="1.5"
                                  style={{
                                    cursor: "pointer",
                                    transition: "opacity 0.2s",
                                    opacity:
                                      hoveredSegment === null ||
                                      hoveredSegment === segment.label
                                        ? 1
                                        : 0.6,
                                  }}
                                  onMouseEnter={() =>
                                    setHoveredSegment(segment.label)
                                  }
                                  onMouseLeave={() => setHoveredSegment(null)}
                                />
                                {hoveredSegment === segment.label && (
                                  <text
                                    x={textX}
                                    y={textY}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fill="white"
                                    fontSize="16"
                                    fontWeight="bold"
                                    pointerEvents="none"
                                  >
                                    {segment.value}
                                  </text>
                                )}
                              </g>
                            );
                          }

                          const path = [
                            `M ${x1} ${y1}`,
                            `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
                            `L 0 0 Z`,
                          ].join(" ");

                          cumulative += angle;

                          return (
                            <g key={i}>
                              <path
                                d={path}
                                fill={segment.color}
                                stroke="#ffffff"
                                strokeWidth="1.5"
                                style={{
                                  cursor: "pointer",
                                  transition: "opacity 0.2s",
                                  opacity:
                                    hoveredSegment === null ||
                                    hoveredSegment === segment.label
                                      ? 1
                                      : 0.6,
                                }}
                                onMouseEnter={() =>
                                  setHoveredSegment(segment.label)
                                }
                                onMouseLeave={() => setHoveredSegment(null)}
                              />
                              {hoveredSegment === segment.label && (
                                <text
                                  x={textX}
                                  y={textY}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                  fill="white"
                                  fontSize="16"
                                  fontWeight="bold"
                                  pointerEvents="none"
                                >
                                  {segment.value}
                                </text>
                              )}
                            </g>
                          );
                        });
                      })()}
                    </g>
                  </svg>
                </div>
              ) : (
                <div
                  style={{
                    width: 280,
                    height: 280,
                    borderRadius: "50%",
                    background: "rgba(0,0,0,0.04)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: COLORS.muted,
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  No tasks yet
                </div>
              )}

              {/* Legend */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  minWidth: 180,
                }}
              >
                {[
                  {
                    label: "Working on it",
                    value: taskStatusCounts.inProgress,
                    color: COLORS.inProgress,
                  },
                  {
                    label: "Done",
                    value: taskStatusCounts.done,
                    color: COLORS.done,
                  },
                  {
                    label: "Stuck",
                    value: taskStatusCounts.stuck,
                    color: COLORS.stuck,
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontSize: 13.5,
                      fontWeight: 500,
                      color: "#333",
                    }}
                  >
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 3,
                        background: item.color,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                      }}
                    />
                    <span>
                      {item.label}{" "}
                      <strong>
                        {analytics.totalTasks > 0
                          ? Math.round(
                              (item.value / analytics.totalTasks) * 100,
                            )
                          : 0}
                        %
                      </strong>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Insights */}
            <div
              style={{
                background: "rgba(93, 139, 177, 0.05)",
                border: "1px solid rgba(93, 139, 177, 0.2)",
                padding: 12,
                borderRadius: 6,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: COLORS.primary,
                  marginBottom: 8,
                }}
              >
                AI Insight
              </div>
              <div
                style={{ fontSize: 12, color: COLORS.text, lineHeight: 1.6 }}
              >
                {taskStatusCounts.done > taskStatusCounts.inProgress
                  ? "Strong completion rate! Your team is shipping tasks at a healthy pace. Keep maintaining this momentum."
                  : taskStatusCounts.inProgress > taskStatusCounts.stuck
                    ? "Good progress on active work. Focus on reducing bottlenecks to improve completion rate."
                    : "Many tasks are stuck. Prioritize unblocking these to accelerate delivery."}
              </div>
            </div>
          </div>
        </div>

        {/* Overall Task Status Bar Chart - AI Enhanced */}
        <div
          style={{
            background: "#F9FAFD",
            border: "1px solid rgba(0,0,0,0.1)",
            filter: "drop-shadow(2px 2px 5px rgba(211, 212, 214, 0.5))",
            padding: 20,
            borderRadius: 8,
          }}
        >
          <TaskStatusChart
            title="Overall task status"
            data={[
              {
                status: "Working on it",
                count: taskStatusCounts.inProgress,
                color: COLORS.inProgress,
              },
              {
                status: "Stuck",
                count: taskStatusCounts.stuck,
                color: COLORS.stuck,
              },
              {
                status: "Done",
                count: taskStatusCounts.done,
                color: COLORS.done,
              },
            ]}
          />

          {/* AI Recommendations for Task Status */}
          {aiRecommendations.length > 0 && (
            <div
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: "1px solid rgba(0,0,0,0.1)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: COLORS.primary,
                  marginBottom: 12,
                }}
              >
                Recommended Actions
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {aiRecommendations
                  .slice(0, 3)
                  .map((rec: Recommendation, i: number) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        gap: 10,
                        padding: 10,
                        background: "rgba(0, 0, 0, 0.02)",
                        borderLeft: "3px solid #000",
                        borderRadius: 4,
                      }}
                    >
                      <div
                        style={{ fontSize: 12, minWidth: 16, color: "#000" }}
                      >
                        •
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#333",
                          }}
                        >
                          {rec.title}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: COLORS.text,
                            marginTop: 2,
                          }}
                        >
                          {rec.description}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Performance Summary with AI Insights */}
      <div
        style={{
          marginTop: 24,
          background: "rgba(16, 185, 129, 0.1)",
          border: "1px solid rgba(16, 185, 129, 0.2)",
          padding: 20,
          borderRadius: 8,
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 12px" }}>
          Campaign Performance Summary
        </h3>
        <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.8 }}>
          <p>
            {analytics.performanceSummary ||
              `Your team is currently tracking at ${analytics.completionRate}% completion rate with ${analytics.totalTasks} total tasks. With ${analytics.completedTasks} completed and ${analytics.overdueTasks} overdue, the recommended focus is on maintaining momentum while addressing any blockers. Average task distribution per team member is ${analytics.avgTasksPerMember} tasks.`}
          </p>
        </div>

        {/* AI Trends */}
        {aiTrends.length > 0 && (
          <div
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: "1px solid rgba(16, 185, 129, 0.2)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#059669",
                marginBottom: 10,
              }}
            >
              Current Trends
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 10,
              }}
            >
              {aiTrends.map((trend: any, i: number) => (
                <div
                  key={i}
                  style={{
                    padding: 10,
                    background: "rgba(0, 0, 0, 0.02)",
                    borderRadius: 4,
                    border: "1px solid rgba(0, 0, 0, 0.1)",
                    fontSize: 12,
                    color: COLORS.text,
                  }}
                >
                  {typeof trend === "object" ? trend.text : trend}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
