"use client";

import React from "react";
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Download } from "lucide-react";

interface MonthlySummaryChartsProps {
  statusCounts?: {
    todo: number;
    inProgress: number;
    done: number;
  };
  priorityCounts?: {
    low: number;
    medium: number;
    high: number;
  };
}

const MonthlySummaryCharts: React.FC<MonthlySummaryChartsProps> = ({
  statusCounts = { todo: 0, inProgress: 0, done: 0 },
  priorityCounts = { low: 0, medium: 0, high: 0 },
}) => {
  const handleDownloadMonthlySummary = () => {
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();
    const url = `/api/reports/monthly-summary?month=${month}&year=${year}`;
    window.open(url, "_blank");
  };

  const statusData = [
    { name: "To Do", value: statusCounts.todo, fill: "#3b82f6" },
    { name: "In Progress", value: statusCounts.inProgress, fill: "#f59e0b" },
    { name: "Done", value: statusCounts.done, fill: "#10b981" },
  ];

  const priorityData = [
    { name: "Low", value: priorityCounts.low, fill: "#6b7280" },
    { name: "Medium", value: priorityCounts.medium, fill: "#f59e0b" },
    { name: "High", value: priorityCounts.high, fill: "#ef4444" },
  ];

  return (
    <div className="w-full bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      {/* Header with download button */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Monthly Task Breakdown
        </h3>
        <button
          onClick={handleDownloadMonthlySummary}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          title="Download Monthly Summary Report (PDF)"
        >
          <Download size={14} />
          <span>Download PDF</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Status Distribution */}
        <div className="flex flex-col items-center">
          <h4 className="text-sm font-medium text-gray-700 mb-2">By Status</h4>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Legend layout="vertical" align="left" verticalAlign="middle" />
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                label={false}
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Priority Distribution */}
        <div className="flex flex-col items-center">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            By Priority
          </h4>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Legend layout="vertical" align="left" verticalAlign="middle" />
              <Pie
                data={priorityData}
                cx="50%"
                cy="50%"
                label={false}
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {priorityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart Comparison */}
        <div className="col-span-2">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Status & Priority Comparison
          </h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={[
                {
                  category: "Status",
                  "To Do": statusCounts.todo,
                  "In Progress": statusCounts.inProgress,
                  Done: statusCounts.done,
                },
                {
                  category: "Priority",
                  Low: priorityCounts.low,
                  Medium: priorityCounts.medium,
                  High: priorityCounts.high,
                },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
              <Bar dataKey="To Do" fill="#3b82f6" />
              <Bar dataKey="In Progress" fill="#f59e0b" />
              <Bar dataKey="Done" fill="#10b981" />
              <Bar dataKey="Low" fill="#6b7280" />
              <Bar dataKey="Medium" fill="#f59e0b" />
              <Bar dataKey="High" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default MonthlySummaryCharts;
