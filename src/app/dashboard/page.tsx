"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import TaskStatusChart from "@/app/components/TaskStatusChart";
import { getCurrentUser } from "@/utils/sessionManager";
import { useAuthProtection } from "@/app/hooks/useAuthProtection";
import { PageContainer } from "@/app/components/PageContainer";
import { PageContentCon } from "@/app/components/PageContentCon";

// Theme properties aligned with your spec
const COLORS = {
  primary: "#5d8bb1",
  todo: "#8b5cf6",
  inProgress: "#3b82f6",
  stuck: "#ef4444",
  done: "#10b981",
  muted: "#000000",
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
  useAuthProtection(); // Protect this route
  const [stats, setStats] = useState({
    todo: 0,
    inProgress: 0,
    stuck: 0,
    done: 0,
  });
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [teamProgress, setTeamProgress] = useState<TeamMemberProgress[]>([]);

  // Load User Session
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await getCurrentUser();
        if (user) setCurrentUser(user);
      } catch (error) {
        console.error("Failed to load user session:", error);
      }
    };
    loadUser();
  }, []);

  // Fetch Tasks for current user
  useEffect(() => {
    if (!currentUser) return;
    fetch("/api/tasks", { headers: { "x-user-id": String(currentUser.id) } })
      .then((r) => r.json())
      .then((data) => {
        const taskList = Array.isArray(data?.tasks) ? data.tasks : [];
        setStats({
          todo: taskList.filter((t: any) => t.status === "todo").length,
          inProgress: taskList.filter((t: any) => t.status === "inprogress")
            .length,
          stuck: taskList.filter((t: any) => t.status === "stuck").length,
          done: taskList.filter((t: any) => t.status === "completed").length,
        });
      })
      .catch(() => {});
  }, [currentUser]);

  // Fetch Team Progress
  useEffect(() => {
    if (!currentUser) return;
    fetch("/api/teams", { headers: { "x-user-id": String(currentUser.id) } })
      .then((r) => r.json())
      .then((data) => {
        if (!data?.team?.members) return;
        const members = data.team.members;
        Promise.all(
          members.map((member: any) =>
            fetch("/api/tasks", {
              headers: { "x-user-id": String(member.userId) },
            })
              .then((r) => r.json())
              .then((taskData) => {
                const tasks = Array.isArray(taskData?.tasks)
                  ? taskData.tasks
                  : [];
                const done = tasks.filter(
                  (t: any) => t.status === "completed" || t.status === "done",
                ).length;
                const total = tasks.length;
                return {
                  id: member.userId,
                  name: member.user?.name || "Unknown",
                  done,
                  total,
                  progress: total > 0 ? Math.round((done / total) * 100) : 0,
                };
              })
              .catch(() => ({
                id: member.userId,
                name: member.user?.name || "Unknown",
                done: 0,
                total: 0,
                progress: 0,
              })),
          ),
        ).then(setTeamProgress);
      });
  }, [currentUser]);

  const total = stats.todo + stats.inProgress + stats.stuck + stats.done;

  const statusData = [
    { label: "To do", value: stats.todo, color: COLORS.todo },
    {
      label: "Working on it",
      value: stats.inProgress,
      color: COLORS.inProgress,
    },
    { label: "Done", value: stats.done, color: COLORS.done },
    { label: "Stuck", value: stats.stuck, color: COLORS.stuck },
  ].map((item) => ({
    ...item,
    percent: total > 0 ? ((item.value / total) * 100).toFixed(1) : "0",
  }));

  return (
    <PageContainer title="DASHBOARD">
      <div className="max-w-[1600px] mx-auto space-y-8">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "To do tasks", value: stats.todo },
            { label: "In progress tasks", value: stats.inProgress },
            { label: "Completed tasks", value: stats.done },
            { label: "Overdue tasks", value: stats.stuck },
          ].map((stat, i) => (
            <PageContentCon
              key={i}
              className="flex flex-col justify-center min-h-[120px]"
            >
              <p className="text-[13px] text-black/50 mb-2 uppercase tracking-tight">
                {stat.label}
              </p>
              <div className="text-3xl font-bold">{stat.value}</div>
            </PageContentCon>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* Pie Chart Card */}
          <PageContentCon className="cursor-pointer hover:bg-black/50 transition-colors">
            <h3 className="text-sm font-semibold mb-6 uppercase tracking-widest text-black/80">
              Overall task overview
            </h3>
            <div className="flex flex-col md:flex-row items-center justify-around gap-8">
              {total > 0 ? (
                <div className="relative w-[200px] h-[200px]">
                  <svg
                    width="200"
                    height="200"
                    viewBox="0 0 200 200"
                    className="transform -rotate-90"
                  >
                    <g transform="translate(100,100)">
                      {(() => {
                        const radius = 90;
                        const segments = statusData.filter((s) => s.value > 0);
                        let cumulative = 0;

                        return segments.map((segment, i) => {
                          const portion = segment.value / total;
                          const angle = portion * Math.PI * 2;

                          if (portion >= 0.99) {
                            return (
                              <circle key={i} r={radius} fill={segment.color} />
                            );
                          }

                          const x1 = radius * Math.cos(cumulative);
                          const y1 = radius * Math.sin(cumulative);
                          const x2 = radius * Math.cos(cumulative + angle);
                          const y2 = radius * Math.sin(cumulative + angle);
                          const path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${angle > Math.PI ? 1 : 0} 1 ${x2} ${y2} L 0 0 Z`;

                          cumulative += angle;
                          return (
                            <path
                              key={i}
                              d={path}
                              fill={segment.color}
                              className="stroke-black/20"
                              strokeWidth="1"
                            />
                          );
                        });
                      })()}
                    </g>
                  </svg>
                </div>
              ) : (
                <div className="w-[180px] h-[180px] rounded-full border border-dashed border-white/20 flex items-center justify-center text-black/40">
                  No tasks
                </div>
              )}

              <div className="flex flex-col gap-4">
                {statusData.map((item, i) => (
                  <div key={i} className="flex items-center gap-5 text-sm">
                    <div
                      className="w-3 h-3 rounded-[2px]"
                      style={{ background: item.color }}
                    />
                    <span className="text-black/60">{item.label}</span>
                    <span className="font-bold ml-auto">{item.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
          </PageContentCon>

          {/* Team Progress Card */}
          <PageContentCon>
            <h3 className="text-sm font-semibold mb-6 uppercase tracking-widest text-black/80">
              Overall team progress overview
            </h3>
            <div className="flex flex-col gap-5 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
              {teamProgress.length === 0 ? (
                <div className="text-center py-10 text-black/30 italic">
                  No team members yet
                </div>
              ) : (
                teamProgress.map((member) => (
                  <div key={member.id} className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-xs font-bold shrink-0">
                      {member.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-medium">
                          {member.name}
                        </span>
                        <span className="text-[10px] text-black/40">
                          {member.done}/{member.total} Tasks
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all duration-700"
                          style={{ width: `${member.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </PageContentCon>
        </div>

        {/* Bar Chart Full Width */}
        <PageContentCon className="w-full">
          <TaskStatusChart
            title="Overall task status"
            data={[
              { status: "To do", count: stats.todo, color: COLORS.todo },
              {
                status: "Working on it",
                count: stats.inProgress,
                color: COLORS.inProgress,
              },
              { status: "Stuck", count: stats.stuck, color: COLORS.stuck },
              { status: "Done", count: stats.done, color: COLORS.done },
            ]}
          />
        </PageContentCon>
      </div>
    </PageContainer>
  );
}
