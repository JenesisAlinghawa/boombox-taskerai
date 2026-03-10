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

interface WeeklyData {
  labels: string[];
  inProgress: number[];
  completed: number[];
  overdue: number[];
}

interface WeeklyProgressChartProps {
  data: WeeklyData;
}

const WeeklyProgressChart = ({ data }: WeeklyProgressChartProps) => {
  // Transform data for recharts
  const chartData = React.useMemo(
    () =>
      data.labels.map((label, index) => ({
        name: label,
        inProgress: data.inProgress[index] || 0,
        completed: data.completed[index] || 0,
        overdue: data.overdue[index] || 0,
      })),
    [data],
  );

  return (
    <div className="bg-blue-100 backdrop-blur-lg border border-black/10 rounded-sm p-6 h-[262px] flex flex-col transition-all duration-200 hover:border-black/50">
      <h2 className="text-xs font-normal text-black mb-4">
        Weekly Task Progress
      </h2>
      <div className="ml-[-40px] flex-1 min-h-[200px] flex items-center justify-start overflow-hidden">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={300}
          minHeight={200}
        >
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.2)" />
            <XAxis dataKey="name" stroke="rgba(0,0,0,0.5)" />
            <YAxis stroke="rgba(0,0,0,0.5)" />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(0,0,0,0.8)",
                border: "1px solid rgba(0,0,0,0.2)",
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
