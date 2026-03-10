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
      <div className="flex flex-col justify-start gap-2">
        {payload.map((entry: any, idx: number) => (
          <div
            key={idx}
            className="flex items-center gap-1 text-[10px] text-black/70"
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
    <div className="bg-blue-100 backdrop-blur-lg border border-black/10 rounded-sm p-4 h-[262px] flex-1 flex flex-col transition-all duration-200 hover:border-black/50">
      <h2 className="text-xs font-normal text-black mb-4">Task Summary</h2>

      <div className="flex flex-1 flex-row items-end justify-between">
        <div className="flex flex-col gap-6 ml-5 mb-2">
          {/* Total stats on top of insight */}
          <div className="text-left pl-16">
            <p className="text-xl font-normal text-black">{completionRate}%</p>
            <p className="text-xs text-black">
              {completed} of {total} tasks completed
            </p>
          </div>

          {/* AI Insight */}
          <div className="flex items-start gap-2 text-xs border-t border-black/10 pb-10">
            <Zap size={14} className="text-yellow-500 flex-shrink-0 mt-0.5" />
            <p className="text-black max-w-[230px]">{aiInsight}</p>
          </div>
        </div>

        {/* Right Section: Pie Chart and Legend */}
        <div className="flex items-center gap-4 ml-10 flex-1 min-h-0 min-w-0">
          {/* Pie Chart */}
          <div className="w-[250px] h-[250px] min-h-0 min-w-0 m-0 mt-[-42px] ">
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={0}
              minHeight={0}
            >
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={0}
                  outerRadius={110}
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
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend at Right */}
          <div className="flex flex-col justify-center gap-2">
            {pieData.map((entry, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 text-[11px] text-black/70"
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 12,
                    height: 12,
                    background: COLORS[idx],
                    borderRadius: "2px",
                  }}
                ></span>
                <span>{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskSummary;
