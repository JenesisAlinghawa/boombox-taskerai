import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Zap } from "lucide-react";

interface PieChartSummaryProps {
  completed: number;
  total: number;
  inProgress: number;
  pending: number;
  overdue: number;
  aiInsight: string;
}

export const PieChartSummary = ({
  completed,
  total,
  inProgress,
  pending,
  overdue,
  aiInsight,
}: PieChartSummaryProps) => {
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const pieData = [
    { name: "Completed", value: completed },
    { name: "In Progress", value: inProgress },
    { name: "Pending", value: pending },
    { name: "Overdue", value: overdue },
  ];

  const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Pie Chart */}
      <div className="lg:col-span-1">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Stats */}
      <div className="lg:col-span-2 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-500/10 border border-green-500/20 rounded p-4">
            <p className="text-sm text-black/62">Completion Rate</p>
            <p className="text-3xl font-normal text-green-400">
              {completionRate}%
            </p>
            <p className="text-xs text-black/62 mt-1">
              {completed} of {total} completed
            </p>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded p-4">
            <p className="text-sm text-black/62">In Progress</p>
            <p className="text-3xl font-normal text-blue-400">{inProgress}</p>
            <p className="text-xs text-black/62 mt-1">active tasks</p>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-4">
            <p className="text-sm text-black/62">Pending</p>
            <p className="text-3xl font-normal text-yellow-400">{pending}</p>
            <p className="text-xs text-black/62 mt-1">to start</p>
          </div>

          <div className="bg-red-500/10 border border-red-500/20 rounded p-4">
            <p className="text-sm text-black/62">Overdue</p>
            <p className="text-3xl font-normal text-red-400">{overdue}</p>
            <p className="text-xs text-black/62 mt-1">delayed tasks</p>
          </div>
        </div>

        {/* AI Insight */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded p-4 flex gap-3">
          <Zap size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-normal text-black/62 mb-1">AI Insight</p>
            <p className="text-sm text-black/62">{aiInsight}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
