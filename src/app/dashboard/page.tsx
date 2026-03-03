"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/utils/sessionManager";
import { useAuthProtection } from "@/app/hooks/useAuthProtection";
import { PageContainer } from "@/app/components/PageContainer";
import DashboardHeader from "@/app/components/dashboard/DashboardHeader";
import TaskTimeline from "@/app/components/dashboard/TaskTimeline";
import DijkstraPanel from "@/app/components/dashboard/DijkstraPanel";
import PendingTasks from "@/app/components/dashboard/PendingTasks";
import StatusCard from "@/app/components/dashboard/StatusCards";
import WeeklyProgressChart from "@/app/components/dashboard/WeeklyProgressChart";
import TaskSummary from "@/app/components/dashboard/TaskSummary";

interface DashboardData {
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  pendingTasks: Array<{
    id: number;
    title: string;
    priority: string;
    dueDate?: string;
  }>;
  weeklyData: {
    labels: string[];
    inProgress: number[];
    completed: number[];
    overdue: number[];
  };
  calendarTasks: Array<{
    date: number;
    taskCount: number;
  }>;
  aiInsight: string;
}

export default function DashboardPage() {
  const router = useRouter();
  useAuthProtection();

  const [data, setData] = useState<DashboardData>({
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
    pendingTasks: [],
    weeklyData: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      inProgress: [0, 0, 0, 0, 0, 0, 0],
      completed: [0, 0, 0, 0, 0, 0, 0],
      overdue: [0, 0, 0, 0, 0, 0, 0],
    },
    calendarTasks: [],
    aiInsight: "",
  });

  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          router.push("/auth/login");
          return;
        }
        const response = await fetch("/api/dashboard", {
          headers: { "x-user-id": String(user.id) },
        });
        if (!response.ok) throw new Error("Failed to fetch dashboard data");
        const dashboardData = await response.json();
        setData(dashboardData);
      } catch (error) {
        console.error("Failed to load dashboard:", error);
      }
    };
    loadDashboard();
  }, [router]);

  return (
    <PageContainer title="DASHBOARD">
      <div className="grid grid-cols-1 lg:grid-cols-11 gap-2 w-full h-auto lg:h-[calc(100vh-60px)] max-w-[1650px] mx-auto lg:overflow-hidden p-0">
        {/* LEFT COLUMN: */}
        <div className="lg:col-span-6 flex flex-col gap-2 h-full">
          <div className="shrink-0">
            <DashboardHeader />
          </div>

          {/* Dijkstra & Pending*/}
          <div className="flex-[0.6] grid grid-cols-1 sm:grid-cols-2 gap-2 min-h-[318px]">
            <div className="h-full bg-white/5 backdrop-blur-md rounded-sm border border-white/10 overflow-hidden shadow-xl">
              <DijkstraPanel />
            </div>
            <div className="h-full bg-white/5 backdrop-blur-md rounded-sm border border-white/10 overflow-hidden shadow-xl">
              <PendingTasks tasks={data.pendingTasks} />
            </div>
          </div>

          {/* Weekly Chart: */}
          <div className="flex-[0.8] min-h-[320px] backdrop-blur-md rounded-sm border border-white/10 p-0 overflow-hidden">
            <WeeklyProgressChart data={data.weeklyData} />
          </div>
        </div>

        {/* RIGHT COLUMN: */}
        <div className="lg:col-span-5 flex flex-col gap-2 h-full">
          {/* Task Timeline:  */}
          <div className="flex-[0.7] min-h-[320px] backdrop-blur-lg border border-white/10 rounded-sm shadow-2xl overflow-hidden bg-white/5">
            <TaskTimeline
              currentMonth={currentMonth}
              currentYear={currentYear}
              setCurrentMonth={setCurrentMonth}
              setCurrentYear={setCurrentYear}
              calendarTasks={data.calendarTasks}
            />
          </div>

          {/* Status Cards: Fixed height block */}
          <div className="grid grid-cols-2 xl:grid-cols-4 lg:grid-cols-2 gap-2 shrink-0">
            <StatusCard
              count={data.pending}
              label="Pending tasks"
              icon="clock"
              color="from-purple-500/20 to-purple-600/20"
            />
            <StatusCard
              count={data.inProgress}
              label="In Progress"
              icon="play"
              color="from-blue-500/20 to-blue-600/20"
            />
            <StatusCard
              count={data.completed}
              label="Completed"
              icon="check"
              color="from-green-500/20 to-green-600/20"
            />
            <StatusCard
              count={data.overdue}
              label="Overdue"
              icon="alert"
              color="from-red-500/20 to-red-600/20"
            />
          </div>

          {/* Task Summary*/}
          <div className="flex-[0.7] min-h-[320px] overflow-y-hidden p-0">
            <TaskSummary
              completed={data.completed}
              total={
                data.pending + data.inProgress + data.completed + data.overdue
              }
              inProgress={data.inProgress}
              pending={data.pending}
              overdue={data.overdue}
              aiInsight={data.aiInsight}
            />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
