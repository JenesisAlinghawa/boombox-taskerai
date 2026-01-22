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
import StatusCards from "@/app/components/dashboard/StatusCards"; // ← assuming you created/renamed to singular
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
      <PageContentCon>
        <div
          className="
            grid 
            h-full 
            min-h-screen
            gap-4
            grid-cols-5
            grid-rows-8
          "
        >
          {/* Col 1: DashboardHeader (rows 1-4) */}
          <div className="row-start-1 row-end-5 col-start-1 col-end-2">
            <DashboardHeader />
          </div>

          {/* Cols 1-2: TaskTimeline (rows 5-8) */}
          <div className="row-start-5 row-end-9 col-start-1 col-end-3 h-full">
            <TaskTimeline
              currentMonth={currentMonth}
              currentYear={currentYear}
              setCurrentMonth={setCurrentMonth}
              setCurrentYear={setCurrentYear}
              calendarTasks={data.calendarTasks}
            />
          </div>

          {/* Cols 2-3: DijkstraPanel (rows 1-2) */}
          <div className="row-start-1 row-end-3 col-start-2 col-end-4 h-full">
            <DijkstraPanel />
          </div>

          {/* Cols 2-3: PendingTasks (rows 3-4) */}
          <div className="row-start-3 row-end-5 col-start-2 col-end-4 h-full">
            <PendingTasks pending={data.pending} />
          </div>

          {/* Cols 4-5: Weekly Progress Chart (rows 1-4) */}
          <div className="row-start-1 row-end-5 col-start-4 col-end-6 h-full">
            <WeeklyProgressChart data={data.weeklyData} />
          </div>

          {/* Col 3: Status Cards stacked (rows 5-8) */}
          <div className="row-start-5 row-end-6 col-start-3 col-end-4">
            <StatusCards
              count={data.pending}
              label="Pending"
              icon="clock"
              color="from-purple-500/20 to-purple-600/20"
            />
          </div>

          <div className="row-start-6 row-end-7 col-start-3 col-end-4">
            <StatusCards
              count={data.inProgress}
              label="In Progress"
              icon="play"
              color="from-blue-500/20 to-blue-600/20"
            />
          </div>

          <div className="row-start-7 row-end-8 col-start-3 col-end-4">
            <StatusCards
              count={data.completed}
              label="Completed"
              icon="check"
              color="from-green-500/20 to-green-600/20"
            />
          </div>

          <div className="row-start-8 row-end-9 col-start-3 col-end-4">
            <StatusCards
              count={data.overdue}
              label="Overdue"
              icon="alert"
              color="from-red-500/20 to-red-600/20"
            />
          </div>

          {/* Cols 4-5: Task Summary (rows 5-8) */}
          <div className="row-start-5 row-end-9 col-start-4 col-end-6 h-full">
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
      </PageContentCon>
    </PageContainer>
  );
}
