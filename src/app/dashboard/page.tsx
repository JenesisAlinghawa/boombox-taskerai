// app/dashboard/page.tsx
"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import TaskStatusChart from "@/app/components/TaskStatusChart";
import { getCurrentUser } from "@/utils/sessionManager";

const COLORS = {
  primary: "#5d8bb1",
  darkPrimary: "#01162B",
  light: "#a0d8ef",
  bg: "#ffffff",
  cardBg: "#F9FAFD",
  text: "#1f2937",
  muted: "#6b7280",
  progressBg: "#e8f4fc",
  progressFill: "#3b82f6",
  todo: "#8b5cf6",
  inProgress: "#3b82f6",
  stuck: "#ef4444",
  done: "#10b981",
  shadow: "#E1F1FD",
};

interface TeamMemberProgress {
  id: number;
  name: string;
  done: number;
  total: number;
  progress: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    todo: 0,
    inProgress: 0,
    stuck: 0,
    done: 0,
  });
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [teamProgress, setTeamProgress] = useState<TeamMemberProgress[]>([]);

  // Load current user from session API
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          setCurrentUser(user);
        }
      } catch (error) {
        console.error("Failed to load user session:", error);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    // Fetch task stats from API
    fetch("/api/tasks", {
      headers: {
        "x-user-id": String(currentUser.id),
      },
    })
      .then((r) => r.json())
      .then((data) => {
        const taskList = Array.isArray(data?.tasks) ? data.tasks : [];
        const counts = {
          todo: taskList.filter((t: any) => t.status === "todo").length,
          inProgress: taskList.filter((t: any) => t.status === "inprogress")
            .length,
          stuck: taskList.filter((t: any) => t.status === "stuck").length,
          done: taskList.filter((t: any) => t.status === "completed").length,
        };
        setStats(counts);
      })
      .catch(() => {});
  }, [currentUser]);

  // Fetch team members and their progress
  useEffect(() => {
    if (!currentUser) return;
    fetch("/api/teams", {
      headers: {
        "x-user-id": String(currentUser.id),
      },
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data?.team?.members) return;
        const members = data.team.members;
        const progressData: TeamMemberProgress[] = [];

        // For each team member, fetch their tasks to calculate progress
        Promise.all(
          members.map((member: any) =>
            fetch("/api/tasks", {
              headers: {
                "x-user-id": String(member.userId),
              },
            })
              .then((r) => r.json())
              .then((taskData) => {
                const tasks = Array.isArray(taskData?.tasks)
                  ? taskData.tasks
                  : [];
                const completedTasks = tasks.filter(
                  (t: any) => t.status === "completed" || t.status === "done"
                ).length;
                const totalTasks = tasks.length;
                const progress =
                  totalTasks > 0
                    ? Math.round((completedTasks / totalTasks) * 100)
                    : 0;

                return {
                  id: member.userId,
                  name: member.user?.name || "Unknown",
                  done: completedTasks,
                  total: totalTasks,
                  progress,
                };
              })
              .catch(() => ({
                id: member.userId,
                name: member.user?.name || "Unknown",
                done: 0,
                total: 0,
                progress: 0,
              }))
          )
        )
          .then((results) => {
            setTeamProgress(results);
          })
          .catch(() => {});
      })
      .catch(() => {});
  }, [currentUser]);

  const total = stats.todo + stats.inProgress + stats.stuck + stats.done;
  const statusData = [
    {
      label: "Working on it",
      value: stats.inProgress,
      color: COLORS.inProgress,
      percent: total > 0 ? ((stats.inProgress / total) * 100).toFixed(1) : 0,
    },
    {
      label: "Done",
      value: stats.done,
      color: COLORS.done,
      percent: total > 0 ? ((stats.done / total) * 100).toFixed(1) : 0,
    },
    {
      label: "Stuck",
      value: stats.stuck,
      color: COLORS.stuck,
      percent: total > 0 ? ((stats.stuck / total) * 100).toFixed(1) : 0,
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.bg,
        color: COLORS.text,
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "20px",
      }}
    >
      <div style={{ maxWidth: "1600px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 500,
              margin: "0 0 6px",
              color: COLORS.text,
            }}
          >
            Dashboard
          </h1>
        </div>

        {/* Stat Cards - 4 Column - Responsive */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          {[
            { label: "To do tasks", value: stats.todo },
            {
              label: "In progress tasks",
              value: stats.inProgress,
              color: COLORS.inProgress,
            },
            {
              label: "Completed tasks",
              value: stats.done,
              color: COLORS.done,
            },
            {
              label: "Overdue tasks",
              value: stats.stuck,
              color: COLORS.stuck,
            },
          ].map((stat, i) => (
            <div
              key={i}
              style={{
                background: "#F9FAFD",
                border: "1px solid rgba(0,0,0,0.1)",
                filter: "drop-shadow(2px 2px 5px rgba(211, 212, 214, 0.5))",
                padding: 16,
                borderRadius: 8,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <p style={{ fontSize: 12, color: COLORS.muted, margin: 0 }}>
                    {stat.label}
                  </p>
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 600,
                      color: stat.color || COLORS.text,
                      marginTop: 4,
                    }}
                  >
                    {stat.value}
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  gap: 8,
                }}
              ></div>
            </div>
          ))}
        </div>

        {/* Charts Grid - Responsive */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))",
            gap: 20,
            marginBottom: 24,
          }}
        >
          {/* Tasks Status - Pie Chart */}
          <div
            style={{
              background: "#F9FAFD",
              border: "1px solid rgba(0,0,0,0.1)",
              filter: "drop-shadow(2px 2px 5px rgba(211, 212, 214, 0.5))",
              padding: 20,
              borderRadius: 8,
              cursor: "pointer",
              transition: "border-color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(0,0,0,0.1)";
            }}
            onClick={() => router.push("/dashboard/analytics")}
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
                alignItems: "center",
                gap: 32,
                justifyContent: "center",
              }}
            >
              {/* Pie Chart SVG */}
              {total > 0 ? (
                <svg
                  width="180"
                  height="180"
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
                          value: stats.inProgress,
                          color: COLORS.inProgress,
                          label: "Working on it",
                        },
                        {
                          value: stats.done,
                          color: COLORS.done,
                          label: "Done",
                        },
                        {
                          value: stats.stuck,
                          color: COLORS.stuck,
                          label: "Stuck",
                        },
                      ].filter((s) => s.value > 0);

                      return segments.map((segment, i) => {
                        const portion = segment.value / total;
                        const angle = portion * Math.PI * 2;
                        const startAngle = cumulative + gap / 2;
                        const endAngle = cumulative + angle - gap / 2;

                        const x1 = radius * Math.cos(startAngle);
                        const y1 = radius * Math.sin(startAngle);
                        const x2 = radius * Math.cos(endAngle);
                        const y2 = radius * Math.sin(endAngle);

                        const largeArc = angle > Math.PI ? 1 : 0;

                        if (
                          segments.length === 1 &&
                          angle > 2 * Math.PI - 0.1
                        ) {
                          return (
                            <circle
                              key={i}
                              cx="0"
                              cy="0"
                              r={radius}
                              fill={segment.color}
                              stroke="#ffffff"
                              strokeWidth="1.5"
                            />
                          );
                        }

                        const path = [
                          `M ${x1} ${y1}`,
                          `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
                          `L 0 0 Z`,
                        ].join(" ");

                        cumulative += angle;

                        return (
                          <path
                            key={i}
                            d={path}
                            fill={segment.color}
                            stroke="#ffffff"
                            strokeWidth="1.5"
                          />
                        );
                      });
                    })()}
                  </g>
                </svg>
              ) : (
                <div
                  style={{
                    width: 180,
                    height: 180,
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
                {statusData.map((item, i) => (
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
                      {item.label} <strong>{item.percent}%</strong>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Team Progress - Bar Chart */}
          <div
            style={{
              background: "#F9FAFD",
              border: "1px solid rgba(0,0,0,0.1)",
              filter: "drop-shadow(2px 2px 5px rgba(211, 212, 214, 0.5))",
              padding: 20,
              borderRadius: 8,
              cursor: "pointer",
              transition: "border-color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(0,0,0,0.1)";
            }}
            onClick={() => router.push("/dashboard/analytics")}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h3
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  margin: 0,
                  color: "#333",
                }}
              >
                Overall team progress overview
              </h3>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                maxHeight: 260,
                overflow: "auto",
                paddingRight: 4,
              }}
            >
              {teamProgress.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    color: COLORS.muted,
                    padding: "40px 20px",
                    fontSize: 13,
                  }}
                >
                  No team members yet
                </div>
              ) : (
                teamProgress.map((member) => (
                  <div
                    key={member.id}
                    style={{
                      display: "flex",
                      gap: 5,
                      alignItems: "center",
                      padding: "3px",
                      borderRadius: 4,
                      background: "rgba(0,0,0,0.02)",
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        "rgba(0,0,0,0.05)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        "rgba(0,0,0,0.02)";
                    }}
                  >
                    {/* Member avatar */}
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: COLORS.primary,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        fontSize: 10,
                        fontWeight: 600,
                        color: "#fff",
                      }}
                      title={member.name}
                    >
                      {member.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>

                    {/* Member info and progress */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Member name and task count */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 8,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 500,
                            color: "#333",
                          }}
                        >
                          {member.name}
                        </div>
                        <div
                          style={{
                            fontSize: 9,
                            color: COLORS.muted,
                          }}
                        >
                          {member.done}/{member.total}
                        </div>
                      </div>

                      {/* Progress bar background */}
                      <div
                        style={{
                          width: "100%",
                          height: 10,
                          background: "rgba(0,0,0,0.08)",
                          borderRadius: 2,
                          overflow: "hidden",
                        }}
                      >
                        {/* Progress fill */}
                        <div
                          style={{
                            height: "100%",
                            width: `${member.progress}%`,
                            background: COLORS.done,
                            borderRadius: 6,
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>

                      {/* Progress percentage */}
                      <div
                        style={{
                          fontSize: 8,
                          color: COLORS.muted,
                          marginTop: 1,
                        }}
                      >
                        {member.progress}%
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Overall Task Status Bar Chart */}
        <TaskStatusChart
          title="Overall task status"
          data={[
            {
              status: "Working on it",
              count: stats.inProgress,
              color: COLORS.inProgress,
            },
            {
              status: "Stuck",
              count: stats.stuck,
              color: COLORS.stuck,
            },
            {
              status: "Done",
              count: stats.done,
              color: COLORS.done,
            },
          ]}
        />
      </div>
    </div>
  );
}
