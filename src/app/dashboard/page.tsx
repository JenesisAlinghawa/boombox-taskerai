"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { getCurrentUser } from "@/utils/sessionManager";
import { useAuthProtection } from "@/app/hooks/useAuthProtection";
import { PageContainer } from "@/app/components/PageContainer";
import { PageContentCon } from "@/app/components/PageContentCon";
import { TaskCounter } from "@/app/components/dashboard/TaskCounter";
import { WeeklyLineChart } from "@/app/components/dashboard/WeeklyLineChart";
import { PieChartSummary } from "@/app/components/dashboard/PieChartSummary";
import { CalendarTimeline } from "@/app/components/dashboard/CalendarTimeline";
import { DijkstraPlaceholder } from "@/app/components/dashboard/DijkstraPlaceholder";
import { Clock } from "lucide-react";

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
      labels: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      inProgress: [0, 0, 0, 0, 0, 0, 0],
      completed: [0, 0, 0, 0, 0, 0, 0],
      overdue: [0, 0, 0, 0, 0, 0, 0],
    },
    calendarTasks: [],
    aiInsight: "",
  });

  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Load current time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(format(now, "h:mm a"));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Load user and fetch dashboard data
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

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("Dashboard API error:", {
            status: response.status,
            statusText: response.statusText,
            data: errorData,
          });
          throw new Error(
            `Failed to fetch dashboard data: ${response.status} ${response.statusText}`,
          );
        }

        const dashboardData = await response.json();
        setData(dashboardData);
      } catch (error) {
        console.error("Failed to load dashboard:", error);
      }
    };

    loadDashboard();
  }, [router]);

  const today = new Date();
  const formattedDate = format(today, "MMMM d, yyyy");
  const dayName = format(today, "EEEE");
  const total = data.pending + data.inProgress + data.completed + data.overdue;

  return (
    <PageContainer title="DASHBOARD">
      <div className="max-w-7xl mx-auto space-y-6 pb-8">
        {/* Top section: Date and Time */}
        <div className="bg-gradient-to-r from-blue-900/40 to-blue-800/40 backdrop-blur-md rounded-lg p-6 border border-blue-500/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-white">
                {formattedDate}
              </p>
              <p className="text-gray-300 text-sm sm:text-base mt-1">
                {dayName}
              </p>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <Clock size={18} />
              <span className="text-sm sm:text-base">{currentTime}</span>
            </div>
          </div>
        </div>

        {/* Main grid layout */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Left column (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Top row: Dijkstra + Pending tasks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Dijkstra card */}
              <PageContentCon className="space-y-4">
                <h2 className="text-lg font-semibold text-white">
                  Dijkstra Task Optimization
                </h2>
                <DijkstraPlaceholder />
              </PageContentCon>

              {/* Pending tasks card */}
              <PageContentCon className="space-y-4">
                <h2 className="text-lg font-semibold text-white">
                  Pending tasks
                </h2>
                <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center min-h-96 border-2 border-dashed border-gray-300">
                  <div className="text-center">
                    <p className="text-gray-400 font-semibold text-lg">
                      TO DO TASKS APPEARS HERE (COMPACT)
                    </p>
                    <p className="text-gray-300 text-sm mt-2">
                      {data.pending} pending task{data.pending !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </PageContentCon>
            </div>

            {/* Weekly Task Progress Chart */}
            <PageContentCon className="space-y-4">
              <h2 className="text-lg font-semibold text-white">
                Weekly Task Progress
              </h2>
              <WeeklyLineChart data={data.weeklyData} />
            </PageContentCon>
          </div>

          {/* Right column (1/3 width) */}
          <div className="lg:col-span-1 space-y-6">
            {/* Tasks Timeline Calendar */}
            <PageContentCon className="space-y-4">
              <h2 className="text-lg font-semibold text-white">
                Tasks Timeline
              </h2>
              <CalendarTimeline
                month={currentMonth}
                year={currentYear}
                tasks={data.calendarTasks}
                currentDay={today.getDate()}
                onPrevMonth={() => {
                  if (currentMonth === 0) {
                    setCurrentMonth(11);
                    setCurrentYear(currentYear - 1);
                  } else {
                    setCurrentMonth(currentMonth - 1);
                  }
                }}
                onNextMonth={() => {
                  if (currentMonth === 11) {
                    setCurrentMonth(0);
                    setCurrentYear(currentYear + 1);
                  } else {
                    setCurrentMonth(currentMonth + 1);
                  }
                }}
              />
            </PageContentCon>

            {/* Task counters */}
            <div className="grid grid-cols-2 gap-3">
              <TaskCounter
                label="Pending"
                count={data.pending}
                color="purple"
              />
              <TaskCounter
                label="Tasks in progress"
                count={data.inProgress}
                color="blue"
              />
              <TaskCounter
                label="Completed Tasks"
                count={data.completed}
                color="green"
              />
              <TaskCounter
                label="Overdue Tasks"
                count={data.overdue}
                color="red"
              />
            </div>
          </div>
        </div>

        {/* Bottom section: Task Summary */}
        <PageContentCon className="space-y-6">
          <h2 className="text-lg font-semibold text-white">Task Summary</h2>
          <PieChartSummary
            completed={data.completed}
            total={total || 1}
            inProgress={data.inProgress}
            pending={data.pending}
            overdue={data.overdue}
            aiInsight={data.aiInsight}
          />
        </PageContentCon>
      </div>
    </PageContainer>
  );
}
