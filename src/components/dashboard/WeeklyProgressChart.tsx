import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useDashboardStore } from "@/store/dashboardStore";

const WeeklyProgressChart = () => {
  const { data } = useDashboardStore();

  // Transform data for recharts
  const chartData = data.weeklyData.labels.map(
    (label: string, index: number) => ({
      name: label,
      inProgress: data.weeklyData.inProgress[index] || 0,
      completed: data.weeklyData.completed[index] || 0,
      overdue: data.weeklyData.overdue[index] || 0,
    }),
  );

  return (
    <div className="bg-white/10 backdrop-blur rounded-xl p-4 h-full flex flex-col">
      <h2 className="text-lg font-semibold text-white mb-4">
        Weekly Task Progress
      </h2>
      <div className="flex-1 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.1)"
            />
            <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
            <YAxis stroke="rgba(255,255,255,0.5)" />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(0,0,0,0.8)",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            />
            <Legend />
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
  );
};

export default WeeklyProgressChart;
