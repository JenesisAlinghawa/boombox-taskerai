"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/utils/sessionManager";
import { useAuthProtection } from "@/app/hooks/useAuthProtection";
import { PageContainer } from "@/app/components/PageContainer";
import { PageContentCon } from "@/app/components/PageContentCon";
import { TaskCounter } from "@/app/components/dashboard/TaskCounter";
import { WeeklyLineChart } from "@/app/components/dashboard/WeeklyLineChart";
import { PieChartSummary } from "@/app/components/dashboard/PieChartSummary";
import { TrendingUp, AlertCircle, Calendar } from "lucide-react";

interface AnalyticsData {
  stats: {
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
  };
  monthlyTrends: Array<{
    month: string;
    completed: number;
    inProgress: number;
    pending: number;
  }>;
  taskCompletionRate: number;
  averageTaskDuration: number;
  weeklyData: {
    labels: string[];
    inProgress: number[];
    completed: number[];
    overdue: number[];
  };
}

export default function AnalyticsPage() {
  const router = useRouter();
  useAuthProtection();

  const [data, setData] = useState<AnalyticsData>({
    stats: { pending: 0, inProgress: 0, completed: 0, overdue: 0 },
    monthlyTrends: [],
    taskCompletionRate: 0,
    averageTaskDuration: 0,
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
  });

  const [viewMode, setViewMode] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          router.push("/auth/login");
          return;
        }

        const response = await fetch("/api/analytics", {
          headers: { "x-user-id": String(user.id) },
        });

        if (!response.ok) throw new Error("Failed to fetch analytics data");

        const analyticsData = await response.json();
        setData(analyticsData);
      } catch (error) {
        console.error("Failed to load analytics:", error);
      }
    };

    loadAnalytics();
  }, [router]);

  const total =
    data.stats.pending +
    data.stats.inProgress +
    data.stats.completed +
    data.stats.overdue;

  return (
    <PageContainer title="ANALYTICS">
      <div className="max-w-7xl mx-auto space-y-8 pb-8">
        {/* Key Metrics Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <PageContentCon className="space-y-2">
            <p className="text-black/62 text-sm">Completion Rate</p>
            <p className="text-3xl font-normal text-green-400">
              {data.taskCompletionRate.toFixed(1)}%
            </p>
            <p className="text-xs text-black/62">of all tasks completed</p>
          </PageContentCon>

          <PageContentCon className="space-y-2">
            <p className="text-black/62 text-sm">Avg Task Duration</p>
            <p className="text-3xl font-normal text-blue-400">
              {data.averageTaskDuration.toFixed(1)}
            </p>
            <p className="text-xs text-black/62">days per task</p>
          </PageContentCon>

          <PageContentCon className="space-y-2">
            <p className="text-black/62 text-sm">Total Tasks</p>
            <p className="text-3xl font-normal text-purple-400">{total}</p>
            <p className="text-xs text-black/62">all time</p>
          </PageContentCon>

          <PageContentCon className="space-y-2">
            <p className="text-black/62 text-sm">Overdue</p>
            <p className="text-3xl font-normal text-red-400">
              {data.stats.overdue}
            </p>
            <p className="text-xs text-black/62">tasks delayed</p>
          </PageContentCon>
        </div>

        {/* Main Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Status Overview */}
          <div className="lg:col-span-1 space-y-6">
            <PageContentCon className="space-y-4">
              <h3 className="text-lg font-normal text-black/62">Task Status</h3>
              <div className="space-y-3">
                <TaskCounter
                  label="Pending"
                  count={data.stats.pending}
                  color="purple"
                />
                <TaskCounter
                  label="In Progress"
                  count={data.stats.inProgress}
                  color="blue"
                />
                <TaskCounter
                  label="Completed"
                  count={data.stats.completed}
                  color="green"
                />
                <TaskCounter
                  label="Overdue"
                  count={data.stats.overdue}
                  color="red"
                />
              </div>
            </PageContentCon>

            {/* Insights Card */}
            <PageContentCon className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertCircle size={18} className="text-blue-400" />
                <h3 className="text-lg font-normal text-black/62">Insights</h3>
              </div>

              <div className="space-y-4 text-sm text-black/62">
                <div className="flex justify-between items-center p-3 bg-blue-500/10 rounded border border-blue-500/20">
                  <span>Active Tasks</span>
                  <span className="font-normal text-blue-400">
                    {data.stats.inProgress}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-green-500/10 rounded border border-green-500/20">
                  <span>Completion Rate</span>
                  <span className="font-normal text-green-400">
                    {data.taskCompletionRate.toFixed(0)}%
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-red-500/10 rounded border border-red-500/20">
                  <span>At Risk</span>
                  <span className="font-normal text-red-400">
                    {data.stats.overdue}
                  </span>
                </div>
              </div>
            </PageContentCon>
          </div>

          {/* Right Column: Trend Analysis */}
          <div className="lg:col-span-2 space-y-6">
            {/* Weekly Trend */}
            <PageContentCon className="space-y-4">
              <h3 className="text-lg font-normal text-black/62 flex items-center gap-2">
                <Calendar size={18} />
                Weekly Trends
              </h3>
              <WeeklyLineChart data={data.weeklyData} />
            </PageContentCon>
          </div>
        </div>

        {/* Full Width: Task Summary */}
        <PageContentCon className="space-y-6">
          <h2 className="text-lg font-normal text-black/62 flex items-center gap-2">
            <TrendingUp size={18} />
            Overall Summary
          </h2>
          <PieChartSummary
            completed={data.stats.completed}
            total={total || 1}
            inProgress={data.stats.inProgress}
            pending={data.stats.pending}
            overdue={data.stats.overdue}
            aiInsight={`Based on your current progress, you're on track with ${data.taskCompletionRate.toFixed(0)}% completion rate. Focus on reducing the ${data.stats.overdue} overdue tasks and maintaining momentum on ${data.stats.inProgress} active tasks.`}
          />
        </PageContentCon>
      </div>
    </PageContainer>
  );
}
