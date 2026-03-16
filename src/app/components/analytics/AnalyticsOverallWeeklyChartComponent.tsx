"use client";

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";

interface HistoryDataPoint {
  date: string;
  completed: number;
  inProgress: number;
  overdue: number;
}

interface Props {
  data: HistoryDataPoint[];
}

export const AnalyticsOverallWeeklyChart: React.FC<Props> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-full bg-blue-100 backdrop-blur-md rounded-sm border border-black/10 overflow-hidden transition-all duration-200 hover:border-black/50 flex flex-col p-4">
        <div className="flex items-center justify-between border-b border-black/10 pb-4 mb-4">
          <h3 className="text-sm font-semibold text-black/62 m-0 flex items-center gap-2">
            <TrendingUp size={18} /> Task History
          </h3>
        </div>
        <div className="flex items-center justify-center h-64 text-black/40">
          No task history yet
        </div>
      </div>
    );
  }

  // Format data for display - show last 30 days or all data if less
  const displayData = data.slice(Math.max(0, data.length - 30));

  const totalCompleted = displayData.reduce((sum, d) => sum + d.completed, 0);
  const totalInProgress = displayData.reduce((sum, d) => sum + d.inProgress, 0);
  const totalOverdue = displayData.reduce((sum, d) => sum + d.overdue, 0);

  // Format date for display (YYYY-MM-DD -> MM/DD)
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return `${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getDate().toString().padStart(2, "0")}`;
  };

  const chartData = displayData.map((point) => ({
    ...point,
    displayDate: formatDate(point.date),
  }));

  return (
    <div className="h-full bg-blue-100 backdrop-blur-md rounded-sm border border-black/10 overflow-hidden transition-all duration-200 hover:border-black/50 flex flex-col">
      <div className="flex items-center justify-between border-b border-gray-300/50 p-4 shrink-0 bg-blue-100">
        <h3 className="text-sm font-semibold text-black/62 m-0 flex items-center gap-2">
          <TrendingUp size={18} /> Task History
        </h3>
        <div className="text-right">
          <p className="text-xs text-black/40 m-0">Completion Rate</p>
          <p className="text-lg font-bold text-black/62 m-0">
            {totalCompleted > 0
              ? Math.round(
                  (totalCompleted /
                    (totalCompleted + totalInProgress + totalOverdue)) *
                    100,
                )
              : 0}
            %
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col p-4">
        {/* History Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4 shrink-0">
          <div className="bg-green-50 border border-green-200/30 rounded p-2 text-center">
            <p className="text-xs text-green-700 font-medium m-0">Completed</p>
            <p className="text-xl font-bold text-green-600 m-0">
              {totalCompleted}
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200/30 rounded p-2 text-center">
            <p className="text-xs text-blue-700 font-medium m-0">Active</p>
            <p className="text-xl font-bold text-blue-600 m-0">
              {totalInProgress}
            </p>
          </div>
          <div className="bg-red-50 border border-red-200/30 rounded p-2 text-center">
            <p className="text-xs text-red-700 font-medium m-0">Overdue</p>
            <p className="text-xl font-bold text-red-600 m-0">{totalOverdue}</p>
          </div>
        </div>

        {/* Chart */}
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 0, left: -25, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis
                dataKey="displayDate"
                tick={{ fontSize: 12 }}
                stroke="rgba(0,0,0,0.3)"
              />
              <YAxis tick={{ fontSize: 12 }} stroke="rgba(0,0,0,0.3)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255,255,255,0.95)",
                  border: "1px solid rgba(0,0,0,0.1)",
                  borderRadius: "6px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="completed"
                stroke="#10b981"
                dot={false}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="inProgress"
                stroke="#3b82f6"
                dot={false}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="overdue"
                stroke="#ef4444"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
