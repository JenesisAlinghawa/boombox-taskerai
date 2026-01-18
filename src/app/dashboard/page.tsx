"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import TaskStatusChart from "@/app/components/TaskStatusChart";
import { getCurrentUser } from "@/utils/sessionManager";
import { PageContainer } from "@/app/components/PageContainer";

// Colors and Theme properties from screenshots
const COLORS = {
  primary: "#5d8bb1",
  todo: "#8b5cf6",
  inProgress: "#3b82f6",
  stuck: "#ef4444",
  done: "#10b981",
  muted: "rgba(255, 255, 255, 0.6)",
  // Appearance Panel Specs:
  cardBg: "rgba(0, 0, 0, 0.40)",      // Fill: 000000 at 40%
  cardStroke: "rgba(255, 255, 255, 0.10)", // Stroke: FFFFFF at 10%
  shadowColor: "rgba(255, 255, 255, 0.10)", // Drop shadow color from image
};

// Reusable style object matching your screenshots
const glassContainerStyle: React.CSSProperties = {
  background: COLORS.cardBg,
  backdropFilter: "blur(5px)",        // Background blur: 5
  WebkitBackdropFilter: "blur(5px)",
  border: `1px solid ${COLORS.cardStroke}`, // Stroke Weight: 1, Position: Inside
  borderRadius: 12,                   // Corner radius: 12
  padding: 24,
  boxShadow: "1px 1px 2px 0px rgba(255, 255, 255, 0.10)", // X:1, Y:1, Blur:2
  color: "#ffffff",
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
  const [stats, setStats] = useState({ todo: 0, inProgress: 0, stuck: 0, done: 0 });
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [teamProgress, setTeamProgress] = useState<TeamMemberProgress[]>([]);

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

  useEffect(() => {
    if (!currentUser) return;
    fetch("/api/tasks", { headers: { "x-user-id": String(currentUser.id) } })
      .then((r) => r.json())
      .then((data) => {
        const taskList = Array.isArray(data?.tasks) ? data.tasks : [];
        setStats({
          todo: taskList.filter((t: any) => t.status === "todo").length,
          inProgress: taskList.filter((t: any) => t.status === "inprogress").length,
          stuck: taskList.filter((t: any) => t.status === "stuck").length,
          done: taskList.filter((t: any) => t.status === "completed").length,
        });
      })
      .catch(() => {});
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    fetch("/api/teams", { headers: { "x-user-id": String(currentUser.id) } })
      .then((r) => r.json())
      .then((data) => {
        if (!data?.team?.members) return;
        const members = data.team.members;
        Promise.all(
          members.map((member: any) =>
            fetch("/api/tasks", { headers: { "x-user-id": String(member.userId) } })
              .then((r) => r.json())
              .then((taskData) => {
                const tasks = Array.isArray(taskData?.tasks) ? taskData.tasks : [];
                const done = tasks.filter((t: any) => t.status === "completed" || t.status === "done").length;
                const total = tasks.length;
                return {
                  id: member.userId,
                  name: member.user?.name || "Unknown",
                  done,
                  total,
                  progress: total > 0 ? Math.round((done / total) * 100) : 0,
                };
              })
              .catch(() => ({ id: member.userId, name: member.user?.name || "Unknown", done: 0, total: 0, progress: 0 }))
          )
        ).then(setTeamProgress);
      });
  }, [currentUser]);

  const total = stats.todo + stats.inProgress + stats.stuck + stats.done;

  const statusData = [
    { label: "To do", value: stats.todo, color: COLORS.todo },
    { label: "Working on it", value: stats.inProgress, color: COLORS.inProgress },
    { label: "Done", value: stats.done, color: COLORS.done },
    { label: "Stuck", value: stats.stuck, color: COLORS.stuck },
  ].map(item => ({
    ...item,
    percent: total > 0 ? ((item.value / total) * 100).toFixed(1) : "0"
  }));

  return (
    <PageContainer title="DASHBOARD">
      <div style={{ maxWidth: "1600px", margin: "0 auto" }}>
        
        {/* Stat Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16, marginBottom: 32 }}>
          {[
            { label: "To do tasks", value: stats.todo },
            { label: "In progress tasks", value: stats.inProgress },
            { label: "Completed tasks", value: stats.done },
            { label: "Overdue tasks", value: stats.stuck },
          ].map((stat, i) => (
            <div key={i} style={glassContainerStyle}>
              <p style={{ fontSize: 13, color: COLORS.muted, margin: 0, marginBottom: 8 }}>{stat.label}</p>
              <div style={{ fontSize: 32, fontWeight: 600 }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Charts Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))", gap: 20, marginBottom: 24 }}>
          
          {/* Pie Chart Card */}
          <div 
            style={{ ...glassContainerStyle, cursor: "pointer" }} 
            onClick={() => router.push("/dashboard/analytics")}
          >
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 20px 0" }}>Overall task overview</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 40, justifyContent: "center" }}>
              {total > 0 ? (
                <svg width="180" height="180" viewBox="0 0 200 200">
                  <g transform="translate(100,100)">
                    {(() => {
                      const radius = 90;
                      const segments = statusData.filter(s => s.value > 0);
                      const gap = segments.length > 1 ? 0.04 : 0;
                      let cumulative = -Math.PI / 2;

                      return segments.map((segment, i) => {
                        const portion = segment.value / total;
                        const angle = portion * Math.PI * 2;
                        
                        if (portion >= 0.99) {
                          return <circle key={i} r={radius} fill={segment.color} stroke={COLORS.cardStroke} strokeWidth="1" />;
                        }

                        const x1 = radius * Math.cos(cumulative + gap/2);
                        const y1 = radius * Math.sin(cumulative + gap/2);
                        const x2 = radius * Math.cos(cumulative + angle - gap/2);
                        const y2 = radius * Math.sin(cumulative + angle - gap/2);
                        const path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${angle > Math.PI ? 1 : 0} 1 ${x2} ${y2} L 0 0 Z`;
                        cumulative += angle;
                        return <path key={i} d={path} fill={segment.color} stroke={COLORS.cardStroke} strokeWidth="1" />;
                      });
                    })()}
                  </g>
                </svg>
              ) : (
                <div style={{ width: 180, height: 180, borderRadius: "50%", border: "1px dashed rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.muted }}>No tasks</div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {statusData.map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: item.color }} />
                    <span style={{ color: COLORS.muted }}>{item.label} <strong style={{ color: "#fff" }}>{item.percent}%</strong></span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Team Progress Card */}
          <div style={glassContainerStyle}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 20px 0" }}>Overall team progress overview</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, maxHeight: 320, overflowY: "auto" }}>
              {teamProgress.length === 0 ? (
                <div style={{ textAlign: "center", color: COLORS.muted, padding: "40px 0" }}>No team members yet</div>
              ) : (
                teamProgress.map((member) => (
                  <div key={member.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: COLORS.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                      {member.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 13 }}>{member.name}</span>
                        <span style={{ fontSize: 12, color: COLORS.muted }}>{member.done}/{member.total}</span>
                      </div>
                      <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${member.progress}%`, background: COLORS.done, borderRadius: 3, transition: "width 0.4s ease" }} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Bar Chart */}
        <div style={glassContainerStyle}>
          <TaskStatusChart
            title="Overall task status"
            data={[
              { status: "To do", count: stats.todo, color: COLORS.todo },
              { status: "Working on it", count: stats.inProgress, color: COLORS.inProgress },
              { status: "Stuck", count: stats.stuck, color: COLORS.stuck },
              { status: "Done", count: stats.done, color: COLORS.done },
            ]}
          />
        </div>
      </div>
    </PageContainer>
  );
}