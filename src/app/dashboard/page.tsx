"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/utils/sessionManager";
import { useAuthProtection } from "@/app/hooks/useAuthProtection";
import { PageContainer } from "@/app/components/page-layouts/MainPageContainerLayoutComponent";
import { ToastProvider } from "@/app/components/providers-popups/ToastNotificationProviderComponent";
import { ConfirmProvider } from "@/app/components/providers-popups/ConfirmationDialogProviderComponent";
import DashboardHeader from "@/app/components/dashboard/DashboardPageHeaderComponent";
import TaskTimeline from "@/app/components/dashboard/TaskTimelineVisualizationComponent";
import DijkstraPanel from "@/app/components/dashboard/TaskOptimizationDijkstraAlgorithmPanelComponent";
import PendingTasks from "@/app/components/dashboard/PendingTasksDisplaySectionComponent";
import StatusCard from "@/app/components/dashboard/TaskStatusSummaryCardsComponent";
import WeeklyProgressChart from "@/app/components/dashboard/WeeklyTaskTrendLineChartComponent";
import TaskSummary from "@/app/components/dashboard/TaskSummaryOverviewComponent";

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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        setIsLoading(true);
        const user = await getCurrentUser();
        if (!user) {
          router.push("/auth/login");
          return;
        }

        const response = await fetch("/api/dashboard-data", {
          headers: { "x-user-id": String(user.id) },
        });

        if (!response.ok) throw new Error("Failed to fetch dashboard data");

        const dashboardData = await response.json();

        if (isMounted) {
          setData(dashboardData);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Failed to load dashboard:", error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDashboard();

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, []); // Remove router from dependencies to prevent unnecessary re-runs

  return (
    <ConfirmProvider>
      <ToastProvider>
        <PageContainer title="Dashboard">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-black/62">Loading dashboard...</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-11 gap-2 w-full h-full mx-auto lg:overflow-hidden p-0">
              {/* LEFT COLUMN: */}
              <div className="lg:col-span-6 flex flex-col gap-2 h-full min-h-0">
                <div className="shrink-0">
                  <DashboardHeader />
                </div>

                {/* Dijkstra Con*/}
                <div className="flex-[0.7] grid grid-cols-1 sm:grid-cols-2 gap-2 min-h-0">
                  <div className="h-full bg-blue-100 backdrop-blur-md rounded-sm border border-black/10 overflow-hidden transition-all duration-200 hover:border-black/50">
                    <DijkstraPanel />
                  </div>
                  {/* Pending Con*/}
                  <div className="h-full bg-blue-100 backdrop-blur-md rounded-sm border border-black/10 overflow-hidden transition-all duration-200 hover:border-black/50">
                    <PendingTasks tasks={data.pendingTasks} />
                  </div>
                </div>

                {/* Weekly Chart: */}
                <div className="flex-[0.6] mb-0 p-0 overflow-hidden transition-all duration-200 hover:border-black/50">
                  <WeeklyProgressChart data={data.weeklyData} />
                </div>
              </div>

              {/* RIGHT COLUMN: */}
              <div className="lg:col-span-5 flex flex-col gap-2 h-full min-h-0">
                {/* Task Timeline:  */}
                <div className="flex-[0.7] min-h-0 backdrop-blur-lg border border-black/10 rounded-sm overflow-hidden bg-blue-100 transition-all duration-200 hover:border-black/50">
                  <TaskTimeline
                    currentMonth={currentMonth}
                    currentYear={currentYear}
                    setCurrentMonth={setCurrentMonth}
                    setCurrentYear={setCurrentYear}
                    calendarTasks={data.calendarTasks}
                  />
                </div>

                {/* Status Cards */}
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
                <div className="flex-[0.6] mb-0 p-0 transition-all duration-200 hover:border-black/50">
                  <TaskSummary
                    completed={data.completed}
                    total={
                      data.pending +
                      data.inProgress +
                      data.completed +
                      data.overdue
                    }
                    inProgress={data.inProgress}
                    pending={data.pending}
                    overdue={data.overdue}
                    aiInsight={data.aiInsight}
                  />
                </div>
              </div>
            </div>
          )}
        </PageContainer>
      </ToastProvider>
    </ConfirmProvider>
  );
}
