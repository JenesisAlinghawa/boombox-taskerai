"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Download } from "lucide-react";

interface TeamMember {
  name: string;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  overdueTasks: number;
}

interface TeamPerformanceChartsProps {
  memberStats: TeamMember[];
}

const TeamPerformanceCharts: React.FC<TeamPerformanceChartsProps> = ({
  memberStats = [],
}) => {
  const handleDownloadTeamPerformance = () => {
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();
    const url = `/api/reports/team-performance?format=pdf&month=${month}&year=${year}`;
    window.open(url, "_blank");
  };

  if (memberStats.length === 0) {
    return (
      <div className="w-full bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        {/* Header with download button */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            Team Performance Analytics
          </h3>
          <button
            onClick={handleDownloadTeamPerformance}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            title="Download Team Performance Report (PDF)"
          >
            <Download size={14} />
            <span>Download PDF</span>
          </button>
        </div>
        <div className="flex items-center justify-center h-64 text-gray-500">
          No team data available
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      {/* Header with download button */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-800">
          Team Performance Analytics
        </h3>
        <button
          onClick={handleDownloadTeamPerformance}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          title="Download Team Performance Report (PDF)"
        >
          <Download size={14} />
          <span>Download PDF</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Task Distribution by Team Member */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Tasks Assigned & Completed
          </h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={memberStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
              <Bar dataKey="totalTasks" fill="#0284c7" name="Total Tasks" />
              <Bar dataKey="completedTasks" fill="#10b981" name="Completed" />
              <Bar dataKey="overdueTasks" fill="#dc2626" name="Overdue" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Completion Rate Trend */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Completion Rate by Team Member
          </h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={memberStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                domain={[0, 100]}
                label={{
                  value: "Percentage",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <Tooltip
                formatter={(value) => `${value}%`}
                contentStyle={{
                  backgroundColor: "#f9fafb",
                  border: "1px solid #e5e7eb",
                }}
              />
              <Line
                type="monotone"
                dataKey="completionRate"
                stroke="#0ea5e9"
                strokeWidth={2}
                name="Completion Rate"
                dot={{ fill: "#0ea5e9", r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Team Member Summary Stats */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Team Member Summary
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {memberStats.map((member, index) => (
              <div
                key={index}
                className="p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200"
              >
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {member.name}
                </p>
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Tasks:</span>
                    <span className="font-medium text-gray-900">
                      {member.totalTasks}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Completed:</span>
                    <span className="font-medium text-green-600">
                      {member.completedTasks}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Completion Rate:</span>
                    <span className="font-medium text-blue-600">
                      {member.completionRate}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Overdue:</span>
                    <span className="font-medium text-red-600">
                      {member.overdueTasks}
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div className="mt-2">
                    <div className="w-full bg-gray-300 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          member.completionRate >= 95
                            ? "bg-emerald-500"
                            : member.completionRate >= 75
                              ? "bg-cyan-500"
                              : member.completionRate >= 50
                                ? "bg-amber-500"
                                : "bg-red-500"
                        }`}
                        style={{ width: `${member.completionRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamPerformanceCharts;
