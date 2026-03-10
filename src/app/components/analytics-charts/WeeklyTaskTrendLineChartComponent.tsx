import React from "react";

interface WeeklyDataPoint {
  day?: string;
  label?: string;
  completed?: number;
  inProgress?: number;
  pending?: number;
  [key: string]: any;
}

interface WeeklyLineChartProps {
  data: {
    labels?: string[];
    data?: WeeklyDataPoint[];
    [key: string]: any;
  };
}

export function WeeklyLineChart({ data }: WeeklyLineChartProps) {
  return (
    <div className="bg-gray-800 border border-white/10 rounded-md p-4">
      <div className="text-white font-semibold mb-3">Weekly Progress</div>
      <div className="h-64 flex items-center justify-center text-white/40 text-sm">
        Chart visualization placeholder
      </div>
    </div>
  );
}
