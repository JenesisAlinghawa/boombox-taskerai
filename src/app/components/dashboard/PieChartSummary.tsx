"use client";

import React from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

interface PieChartSummaryProps {
  completed: number;
  total: number;
  inProgress: number;
  pending: number;
  overdue: number;
  aiInsight?: string;
}

export const PieChartSummary: React.FC<PieChartSummaryProps> = ({
  completed,
  total,
  inProgress,
  pending,
  aiInsight,
}) => {
  const chartData = {
    labels: ["Completed", "In Progress", "Pending"],
    datasets: [
      {
        data: [completed, inProgress, pending],
        backgroundColor: [
          "#10b981", // green
          "#3b82f6", // blue
          "#8b5cf6", // purple
        ],
        borderColor: [
          "rgba(16, 185, 129, 0.2)",
          "rgba(59, 130, 246, 0.2)",
          "rgba(139, 92, 246, 0.2)",
        ],
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "#fff",
        bodyColor: "#e5e7eb",
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
        padding: 12,
        titleFont: {
          size: 13,
          weight: "bold" as const,
        },
        bodyFont: {
          size: 12,
        },
        callbacks: {
          label: function (context: any) {
            const label = context.label || "";
            const value = context.parsed || 0;
            const percentage =
              total > 0 ? ((value / total) * 100).toFixed(1) : "0";
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-center">
        <div className="relative w-48 h-48">
          <Doughnut data={chartData} options={options} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-400">{completed}</p>
              <p className="text-sm text-gray-400">/</p>
              <p className="text-2xl font-semibold text-gray-300">{total}+</p>
              <p className="text-xs text-gray-400 mt-1">TOTAL</p>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-sm text-gray-300">
            Completed ({((completed / total) * 100).toFixed(0)}%)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-sm text-gray-300">
            In Progress ({((inProgress / total) * 100).toFixed(0)}%)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500"></div>
          <span className="text-sm text-gray-300">
            Pending ({((pending / total) * 100).toFixed(0)}%)
          </span>
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-sm font-semibold text-blue-300 mb-2">AI Insights</p>
        <p className="text-sm text-gray-300 leading-relaxed">
          {aiInsight ||
            "With 1 overdue tasks, the user/team might be dealing with missed deadlines as priorities shift. Consider revisiting task deadlines if dependencies are blocking progress, or if anyone needs help."}
        </p>
      </div>
    </div>
  );
};
