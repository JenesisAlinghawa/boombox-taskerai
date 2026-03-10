import React from "react";

interface PieChartSummaryProps {
  stats: {
    pending?: number;
    inProgress?: number;
    completed?: number;
    [key: string]: any;
  };
}

export function PieChartSummary({ stats }: PieChartSummaryProps) {
  return (
    <div className="bg-gray-800 border border-white/10 rounded-md p-4">
      <div className="text-white font-semibold mb-3">Task Distribution</div>
      <div className="h-64 flex items-center justify-center text-white/40 text-sm">
        Pie chart visualization placeholder
      </div>
    </div>
  );
}
