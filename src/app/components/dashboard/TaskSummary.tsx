import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Zap } from "lucide-react";

interface TaskSummaryProps {
  completed: number;
  total: number;
  inProgress: number;
  pending: number;
  overdue: number;
  aiInsight: string;
}

const TaskSummary = ({
  completed,
  total,
  inProgress,
  pending,
  overdue,
  aiInsight,
}: TaskSummaryProps) => {
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const pieData = [
    { name: "Completed", value: completed },
    { name: "In Progress", value: inProgress },
    { name: "Pending", value: pending },
    { name: "Overdue", value: overdue },
  ];

  const COLORS = ["#10b981", "#3b82f6", "#9D00FF", "#ef4444"];

  // activeIndex retained for tooltip color calculation below
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  const activeColor = activeIndex !== null ? COLORS[activeIndex] : "#ffffff";

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const { name, value } = payload[0];
    const idx = pieData.findIndex((e) => e.name === name);
    const color = COLORS[idx] || "#000";
    const plural = value !== 1 ? "s" : "";
    return (
      <div
        style={{
          background: color,
          padding: "4px 8px",
          borderRadius: 4,
          border: "1px solid #fff",
          fontSize: 10,
          color: "#fff",
        }}
      >
        {value} {name.toLowerCase()} task{plural}
      </div>
    );
  };

  const CustomLegend = ({ payload }: any) => {
    if (!payload) return null;
    return (
      <div className="flex justify-center gap-4">
        {payload.map((entry: any, idx: number) => (
          <div
            key={idx}
            className="flex items-center gap-1 text-[10px] text-white/70"
          >
            <span
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                background: entry.color,
              }}
            ></span>
            <span>{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-blue-400/10 backdrop-blur-lg border border-white/10 rounded-sm shadow-lg p-4 h-[300px] flex-1 flex flex-col">
      <h2 className="text-lg font-normal text-white/62 mb-4">Task Summary</h2>

      <div className="flex flex-1 flex-row items-end justify-between">
        <div className="flex flex-col gap-6 ml-20 mb-4">
          {/* Total stats on top of insight */}
          <div className="text-left pl-20">
            <p className="text-3xl font-normal">{completionRate}%</p>
            <p className="text-md">
              {completed} of {total} tasks completed
            </p>
          </div>

          {/* AI Insight */}
          <div className="flex items-start gap-2 text-sm border-t border-white/10 pb-10">
            <Zap size={14} className="text-purple-400 flex-shrink-0" />
            <p className="max-w-[230px]">
              {aiInsight ||
                (overdue > 0
                  ? `⚠️ You have ${overdue} overdue task${overdue !== 1 ? "s" : ""}`
                  : "Great! All tasks are on track")}
            </p>
          </div>
        </div>

        {/* Right Section: Pie Chart */}
        <div className="w-[300px] h-[300px] mt-[-62px] pr-20px ">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={0}
                outerRadius={124}
                paddingAngle={0}
                dataKey="value"
                nameKey="name"
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index]} />
                ))}
              </Pie>

              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "rgba(255,255,255,0.1)" }}
              />
              {/* custom legend with color swatches */}
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default TaskSummary;
