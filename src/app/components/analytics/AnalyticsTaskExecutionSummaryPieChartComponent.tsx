"use client";

import React, { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Sparkles } from "lucide-react";

interface Props {
  completed: number;
  inProgress: number;
  pending: number;
  overdue: number;
}

export const AnalyticsTaskExecutionSummary: React.FC<Props> = ({
  completed,
  inProgress,
  pending,
  overdue,
}) => {
  const total = completed + inProgress + pending + overdue;
  const [aiInsight, setAiInsight] = useState<string>("");
  const [loadingInsight, setLoadingInsight] = useState(false);

  const getPercentage = (value: number) => {
    return total === 0 ? 0 : Math.round((value / total) * 100);
  };

  // Fetch AI insight on data change
  useEffect(() => {
    const fetchAIInsight = async () => {
      setLoadingInsight(true);
      try {
        const response = await fetch("/api/analytics/ai-insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            completed,
            inProgress,
            pending,
            overdue,
            total,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setAiInsight(data.insight);
        }
      } catch (error) {
        console.error("[TaskExecution] Failed to fetch AI insight:", error);
      } finally {
        setLoadingInsight(false);
      }
    };

    if (total > 0) {
      fetchAIInsight();
    } else {
      setAiInsight(
        "No tasks yet. Start by creating your first task for your team to begin tracking progress.",
      );
    }
  }, [completed, inProgress, pending, overdue, total]);

  // Ordered by task lifecycle: Pending → In Progress → Completed → Overdue
  const orderedData = [
    {
      name: "Pending",
      value: pending,
      color: "#8b5cf6",
      percentage: getPercentage(pending),
    },
    {
      name: "In Progress",
      value: inProgress,
      color: "#3b82f6",
      percentage: getPercentage(inProgress),
    },
    {
      name: "Completed",
      value: completed,
      color: "#10b981",
      percentage: getPercentage(completed),
    },
    {
      name: "Overdue",
      value: overdue,
      color: "#ef4444",
      percentage: getPercentage(overdue),
    },
  ];

  const chartData = orderedData.filter((item) => item.value > 0);

  // Check if all tasks are in a single status
  const nonZeroStatuses = chartData.length;
  const isSingleStatus = nonZeroStatuses === 1;
  const dominantStatus = isSingleStatus ? chartData[0] : null;

  return (
    <div className="h-full bg-white rounded-xl border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-sm shadow-sm flex flex-col">
      <div className="border-b border-gray-300/50 p-4 shrink-0 flex items-center justify-between bg-blue-100">
        <h3 className="text-sm font-semibold text-gray-800 m-0 flex items-center gap-2">
          <TrendingUp size={18} className="text-blue-700" /> Overall Task
          Execution
        </h3>
        {loadingInsight && (
          <Sparkles size={14} className="text-blue-700 animate-spin" />
        )}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col p-6">
        {total === 0 ? (
          // Empty state
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-sm text-black/40 m-0">
                No tasks yet. Start creating to see execution data.
              </p>
            </div>
          </div>
        ) : isSingleStatus && dominantStatus ? (
          // Single status: Show as progress bar instead of pie
          <div className="flex flex-col justify-center items-center space-y-6 h-full">
            <div className="w-full max-w-xs">
              <div className="mb-3 text-center">
                <p className="text-xl font-bold text-gray-800 m-0">{total}</p>
                <p className="text-xs text-gray-600 m-0 mt-1">
                  Total Task{total !== 1 ? "s" : ""}
                </p>
              </div>
              <div
                className="bg-gray-100 rounded-full h-12 flex items-center justify-center border-2"
                style={{ borderColor: dominantStatus.color }}
              >
                <div className="text-sm font-semibold text-gray-700">
                  {dominantStatus.name}
                </div>
              </div>
              <div className="mt-4 text-center">
                <div
                  className="inline-block px-3 py-1 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: dominantStatus.color }}
                >
                  100% {dominantStatus.name}
                </div>
              </div>
            </div>

            {/* AI Insight Summary */}
            <div className="w-full text-center">
              <p className="text-xs text-gray-600 leading-relaxed m-0 flex items-start gap-2">
                <Sparkles size={12} className="text-blue-700 mt-0.5 shrink-0" />
                {loadingInsight ? (
                  <span className="text-gray-500 italic">Analyzing...</span>
                ) : (
                  aiInsight
                )}
              </p>
            </div>
          </div>
        ) : (
          // Multiple statuses: Show donut chart
          <>
            <div className="flex-1 min-h-0 flex items-center justify-center px-4">
              <div className="relative w-full" style={{ height: "220px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={false}
                      outerRadius={70}
                      innerRadius={45}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name, props) => {
                        const percentage = props.payload?.percentage || 0;
                        return [
                          `${value} task${value !== 1 ? "s" : ""} (${percentage}%)`,
                          props.payload?.name,
                        ];
                      }}
                      contentStyle={{
                        backgroundColor: "rgba(255,255,255,0.95)",
                        border: "1px solid rgb(229, 231, 235)",
                        borderRadius: "8px",
                        padding: "8px 12px",
                      }}
                    />

                  </PieChart>
                </ResponsiveContainer>
                {/* Center text for donut hole */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-sm font-bold text-gray-800 m-0">{total}</p>
                  <p className="text-xs text-gray-600 m-0">Total</p>
                </div>
              </div>
            </div>

            {/* Ordered legend with detailed breakdown */}
            <div className="mt-4 space-y-2 shrink-0 px-2">
              {orderedData.map((status) => (
                <div
                  key={status.name}
                  className="flex items-center justify-between text-xs py-1"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: status.color }}
                    />
                    <span className="font-medium text-gray-700">
                      {status.name}
                    </span>
                  </div>
                  <span className="text-gray-600 whitespace-nowrap ml-2">
                    {status.value} ({status.percentage}%)
                  </span>
                </div>
              ))}
            </div>

            {/* AI-Generated Summary */}
            <div className="mt-4 pt-4 border-t border-gray-300/50">
              <p className="text-xs text-gray-600 leading-relaxed m-0 flex items-start gap-2">
                <Sparkles size={12} className="text-blue-700 mt-0.5 shrink-0" />
                {loadingInsight ? (
                  <span className="text-gray-500 italic">Analyzing...</span>
                ) : (
                  aiInsight
                )}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
