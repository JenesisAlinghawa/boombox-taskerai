"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/utils/sessionManager";
import { useAuthProtection } from "@/app/hooks/useAuthProtection";
import { PageContainer } from "@/app/components/PageContainer";
import { PageContentCon } from "@/app/components/PageContentCon";
import DashboardHeader from "@/app/components/dashboard/DashboardHeader";
import TaskTimeline from "@/app/components/dashboard/TaskTimeline";
import DijkstraPanel from "@/app/components/dashboard/DijkstraPanel";
import PendingTasks from "@/app/components/dashboard/PendingTasks";
import StatusCard from "@/app/components/dashboard/StatusCards"; // ← singular version recommended
import WeeklyProgressChart from "@/app/components/dashboard/WeeklyProgressChart";
import TaskSummary from "@/app/components/dashboard/TaskSummary";

interface DashboardData {
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
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
          headers: {
            "x-user-id": String(user.id),
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

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
    <div className="flex flex-col md:flex-row gap-2 h-full min-h-[700px] max-h-[1100px]">
      
      {/* First (left) column: Header (top) + Dijkstra/Pending side by side + WeeklyProgressChart (bottom) */}
      <div className="w-full md:w-[80%] lg:w-[52%] flex flex-col gap-2">
        {/* Group Header + Dijkstra/Pending with no internal gap to make them closer */}
        <div className="flex flex-col gap--10">
          {/* Header */}
          <div className="min-h-[180px] max-h-[260px]">
            <DashboardHeader />
          </div>
          
{/* Dijkstra + Pending side by side horizontally, with negative margin-top to pull it closer if needed */}
          <div className="flex flex-col sm:flex-row gap-2 min-h-[200px] max-h-[300px] mt-[-92px]">
            <div className="flex-1 min-h-[280px] lg:h-[40%]">
              <DijkstraPanel />
            </div>
            <div className="flex-1 min-h-[300px] md:min-h-auto">
              <PendingTasks pending={data.pending} />
            </div>
          </div>
        </div>
        
        {/* Weekly task progress below */}
        <div className="flex-1 min-h-[120px] max-h-[320px] lg:h-[40%]">
          <WeeklyProgressChart data={data.weeklyData} />
        </div>
      </div>
      
      {/* Second (right) column: TaskTimeline (top) + 4 status cards side by side + TaskSummary (bottom) */}
      <div className="flex-1 flex flex-col gap-2 md:gap-2">
        {/* Task Timeline */}
        <div className="min-h-[270px] max-h-[400px] lg:h-[30%] overflow-hidden">
          <TaskTimeline
            currentMonth={currentMonth}
            currentYear={currentYear}
            setCurrentMonth={setCurrentMonth}
            setCurrentYear={setCurrentYear}
            calendarTasks={data.calendarTasks}
          />
        </div>
        
        {/* 4 status cards side by side horizontally */}
        <div className="flex flex-row gap-2 min-w-[100px] max-w-[200px] w-full">
          <div className="flex-1 min-h-[90px] max-h-[100px] lg:h-[32%] flex items-center justify-center">
            <StatusCard
              count={data.pending}
              label="Pending"
              icon="clock"
              color="from-purple-500/20 to-purple-600/20"
            />
          </div>
          <div className="flex-1 min-h-[90px] max-h-[100px] lg:h-[32%]  flex items-center justify-center">
            <StatusCard
              count={data.inProgress}
              label="In Progress"
              icon="play"
              color="from-blue-500/20 to-blue-600/20"
            />
          </div>
          <div className="flex-1 min-h-[90px] max-h-[100px] lg:h-[32%]  flex items-center justify-center">
            <StatusCard
              count={data.completed}
              label="Completed"
              icon="check"
              color="from-green-500/20 to-green-600/20"
            />
          </div>
          <div className="flex-1 min-h-[90px] max-h-[100px] lg:h-[32%]  flex items-center justify-center">
            <StatusCard
              count={data.overdue}
              label="Overdue"
              icon="alert"
              color="from-red-500/20 to-red-600/20"
            />
          </div>
        </div>
        
        {/* Task Summary below */}
        <div className="flex-1 min-h-[120px] max-h-[320px] lg:h-[40%]">
          <TaskSummary
            completed={data.completed}
            total={data.pending + data.inProgress + data.completed + data.overdue}
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