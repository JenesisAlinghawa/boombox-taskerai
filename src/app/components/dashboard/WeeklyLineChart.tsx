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

interface WeeklyLineChartProps {
  data: {
    labels: string[];
    inProgress: number[];
    completed: number[];
    overdue: number[];
  };
}

export const WeeklyLineChart = ({ data }: WeeklyLineChartProps) => {
  const chartData = data.labels.map((label: string, index: number) => ({
    name: label,
    inProgress: data.inProgress[index] || 0,
    completed: data.completed[index] || 0,
    overdue: data.overdue[index] || 0,
  }));

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
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
  );
};
