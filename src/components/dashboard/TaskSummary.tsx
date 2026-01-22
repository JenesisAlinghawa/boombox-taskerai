import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Zap } from "lucide-react";
import { useDashboardStore } from "@/store/dashboardStore";

const TaskSummary = () => {
  const { data } = useDashboardStore();
  const total = data.pending + data.inProgress + data.completed + data.overdue;
  const completionRate =
    total > 0 ? Math.round((data.completed / total) * 100) : 0;

  const pieData = [
    { name: "Completed", value: data.completed },
    { name: "In Progress", value: data.inProgress },
    { name: "Pending", value: data.pending },
    { name: "Overdue", value: data.overdue },
  ];

  const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"];

  return (
    <div className="bg-white/10 backdrop-blur rounded-xl p-4 h-full flex flex-col">
      <h2 className="text-lg font-normal text-black/62 mb-4">Task Summary</h2>

      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="w-full flex justify-center">
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
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

        <div className="text-center">
          <p className="text-2xl font-normal text-black/62">
            {completionRate}%
          </p>
          <p className="text-sm text-black/62">
            {data.completed} of {total} tasks completed
          </p>
        </div>

        <div className="w-full pt-3 border-t border-white/10">
          <div className="flex items-start gap-2 text-xs text-black/62">
            <Zap size={14} className="text-yellow-400 flex-shrink-0 mt-0.5" />
            <p>
              {data.aiInsight ||
                (data.overdue > 0
                  ? `⚠️ You have ${data.overdue} overdue task${data.overdue !== 1 ? "s" : ""}`
                  : "Great! All tasks are on track")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskSummary;
