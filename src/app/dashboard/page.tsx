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
import TaskStatusGrid from "@/app/components/dashboard/TaskStatusGridComponent";
import { AnalyticsTaskExecutionSummary } from "@/app/components/dashboard/AnalyticsTaskExecutionSummaryPieChartComponent";
import { CombinedTaskSummaryAndInsights } from "@/app/components/dashboard/CombinedTaskSummaryAndInsightsComponent";

interface DashboardData {
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  pendingTasks: Array<{
    id: string;
    title: string;
    priority: string;
    dueDate?: string;
  }>;
  inProgressTasks: Array<{
    id: string;
    title: string;
    priority: string;
    dueDate?: string;
  }>;
  overdueTasks: Array<{
    id: string;
    title: string;
    priority: string;
    dueDate?: string;
  }>;
  completedTasks: Array<{
    id: string;
    title: string;
    priority: string;
    dueDate?: string;
  }>;
  calendarTasks: Array<{
    date: number;
    taskCount: number;
  }>;
  aiInsight: string;
  userRole?: "ADMIN" | "OWNER" | "EMPLOYEE";
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
    inProgressTasks: [],
    overdueTasks: [],
    completedTasks: [],
    calendarTasks: [],
    aiInsight: "",
  });

  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Log task data for debugging
  useEffect(() => {
    const totalTasks =
      data.overdueTasks.length +
      data.inProgressTasks.length +
      data.pendingTasks.length;
    console.log("[Dashboard] Do This First receiving tasks:", totalTasks);
    if (totalTasks > 0) {
      console.log(
        "[Dashboard] Overdue:",
        data.overdueTasks.length,
        "In Progress:",
        data.inProgressTasks.length,
        "Pending:",
        data.pendingTasks.length,
      );
    }
  }, [data.overdueTasks, data.inProgressTasks, data.pendingTasks]);

  // Function to refresh dashboard data
  const refreshDashboard = React.useCallback(
    async (user?: any) => {
      try {
        const userToUse = user || currentUser;
        if (!userToUse?.id) return;

        console.log("[Dashboard] Refreshing dashboard data");
        const response = await fetch("/api/dashboard-data", {
          headers: { "x-user-id": String(userToUse.id) },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error ||
              `Failed to fetch dashboard data (${response.status})`,
          );
        }

        const dashboardData = await response.json();
        console.log("[Dashboard] Refreshed data received:", dashboardData);
        setData(dashboardData);
        setErrorMessage(null);
      } catch (error) {
        console.error("[Dashboard] Error refreshing dashboard:", error);
      }
    },
    [currentUser],
  );

  // Initial dashboard load - runs once on mount
  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const user = await getCurrentUser();
        console.log("[Dashboard] Current user:", user);
        if (!user) {
          console.log("[Dashboard] No user found, redirecting to login");
          router.push("/auth/login");
          return;
        }

        console.log("[Dashboard] Fetching dashboard data for user:", user.id);
        const response = await fetch("/api/dashboard-data", {
          headers: { "x-user-id": String(user.id) },
        });

        console.log("[Dashboard] API response status:", response.status);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error ||
              `Failed to fetch dashboard data (${response.status})`,
          );
        }

        const dashboardData = await response.json();
        console.log("[Dashboard] Data received:", dashboardData);

        if (isMounted) {
          setData(dashboardData);
          setCurrentUser(user);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("[Dashboard] Error loading dashboard:", error);
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error occurred";
        if (isMounted) {
          setErrorMessage(errorMsg);
          setIsLoading(false);
        }
      }
    };

    loadDashboard();

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, [router]);

  // Set up periodic refresh and event listeners - separate effect
  useEffect(() => {
    if (!currentUser?.id) return;

    let isMounted = true;

    // Set up periodic refresh every 10 seconds
    const refreshInterval = setInterval(() => {
      if (isMounted) {
        refreshDashboard();
      }
    }, 10000);

    // Listen for task update events from other tabs/windows
    const handleStorageChange = () => {
      console.log("[Dashboard] Storage change detected, refreshing...");
      if (isMounted) {
        refreshDashboard();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
      clearInterval(refreshInterval);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [currentUser, refreshDashboard]);

  // Update calendar when month/year changes - separate effect to avoid full dashboard refresh
  useEffect(() => {
    if (!currentUser) return;

    let isMounted = true;

    const fetchCalendarTasks = async () => {
      try {
        console.log(
          `[Dashboard] Fetching calendar tasks for ${currentMonth}/${currentYear}`,
        );
        const response = await fetch(
          `/api/dashboard-data/calendar?month=${currentMonth}&year=${currentYear}`,
          {
            headers: { "x-user-id": String(currentUser.id) },
          },
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("Calendar fetch error:", errorData);
          return;
        }

        const { calendarTasks } = await response.json();
        console.log("[Dashboard] Calendar tasks updated:", calendarTasks);

        if (isMounted) {
          setData((prev) => ({
            ...prev,
            calendarTasks,
          }));
        }
      } catch (error) {
        console.error("[Dashboard] Error fetching calendar tasks:", error);
      }
    };

    fetchCalendarTasks();

    return () => {
      isMounted = false;
    };
  }, [currentMonth, currentYear, currentUser]);

  return (
    <ConfirmProvider>
      <ToastProvider>
        <PageContainer title="Dashboard">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-black/62">Loading dashboard...</div>
            </div>
          ) : errorMessage ? (
            <div className="flex items-center justify-center h-64">
              <div className="bg-red-100/80 border border-red-300/50 rounded-sm p-6 max-w-md">
                <p className="text-red-700 font-medium mb-2">
                  Error Loading Dashboard
                </p>
                <p className="text-sm text-red-600">{errorMessage}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-sm hover:bg-red-700 text-sm"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full mx-auto p-0 overflow-y-auto h-screen">
              <div className="grid grid-cols-1 lg:grid-cols-11 gap-2 w-full p-0 min-h-full">
                {/* LEFT COLUMN: Task Grid + AI Insights */}
                <div className="lg:col-span-6 flex flex-col gap-2">
                  <div className="shrink-0">
                    <DashboardHeader />
                  </div>

                  {/* Task Status Grid */}
                  <div className="h-[620px] min-h-[500px]">
                    <TaskStatusGrid
                      pending={data.pending}
                      inProgress={data.inProgress}
                      completed={data.completed}
                      overdue={data.overdue}
                      pendingTasks={data.pendingTasks}
                      inProgressTasks={data.inProgressTasks}
                      overdueTasks={data.overdueTasks}
                      completedTasks={data.completedTasks}
                    />
                  </div>
                </div>

                {/* RIGHT COLUMN: Timeline, Task Summary, Task Execution + AI Insights */}
                <div className="lg:col-span-5 flex flex-col gap-2">
                  {/* Timeline */}
                  <div className="h-90">
                    <TaskTimeline
                      currentMonth={currentMonth}
                      currentYear={currentYear}
                      setCurrentMonth={setCurrentMonth}
                      setCurrentYear={setCurrentYear}
                      calendarTasks={data.calendarTasks}
                    />
                  </div>

                  {/* Task Summary - Do This First */}
                  <div className="h-[600px]">
                    <CombinedTaskSummaryAndInsights
                      tasks={[
                        ...data.overdueTasks,
                        ...data.inProgressTasks,
                        ...data.pendingTasks,
                        ...data.completedTasks,
                      ]}
                      currentUser={currentUser}
                      userRole={data.userRole}
                      filterMode="dashboard"
                    />
                  </div>

                  {/* Task Execution Summary - Overall Pie Chart */}
                  <div className="h-64">
                    <AnalyticsTaskExecutionSummary
                      completed={data.completed}
                      inProgress={data.inProgress}
                      pending={data.pending}
                      overdue={data.overdue}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </PageContainer>
      </ToastProvider>
    </ConfirmProvider>
  );
}
