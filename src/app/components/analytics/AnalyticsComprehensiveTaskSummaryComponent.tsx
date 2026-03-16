"use client";

import React from "react";
import { TrendingUp, AlertCircle, CheckCircle, Clock } from "lucide-react";

interface Props {
  completed: number;
  total: number;
  inProgress: number;
  pending: number;
  overdue: number;
  completionRate: number;
  aiInsight?: string;
}

export const AnalyticsComprehensiveTaskSummary: React.FC<Props> = ({
  completed,
  total,
  inProgress,
  pending,
  overdue,
  completionRate,
  aiInsight,
}) => {
  const velocity = total > 0 ? Math.round((completed / total) * 100) : 0;
  const healthStatus =
    total === 0
      ? { status: "Getting Started", color: "text-blue-600", bg: "bg-blue-50" }
      : completionRate > 70
        ? { status: "Excellent", color: "text-green-600", bg: "bg-green-50" }
        : completionRate > 50
          ? { status: "Good", color: "text-blue-600", bg: "bg-blue-50" }
          : {
              status: "Needs Attention",
              color: "text-orange-600",
              bg: "bg-orange-50",
            };

  return (
    <div className="h-full bg-blue-100 backdrop-blur-md rounded-sm border border-black/10 overflow-hidden transition-all duration-200 hover:border-black/50 flex flex-col">
      <div className="border-b border-black/10 p-4 shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-black/62 m-0 flex items-center gap-2">
            <TrendingUp size={18} /> Task Execution Summary
          </h3>
          <div
            className={`px-3 py-1 rounded-full text-xs font-semibold ${healthStatus.bg} ${healthStatus.color}`}
          >
            {healthStatus.status}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Completion Rate */}
        <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-200/20 rounded-md p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-black/62">
              Overall Completion Rate
            </span>
            <span className="text-2xl font-bold text-green-600">
              {completionRate}%
            </span>
          </div>
          <div className="w-full h-2 bg-black/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        {/* Task Breakdown Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-blue-50 border border-blue-200/30 rounded p-3">
            <p className="text-xs text-blue-700 font-medium m-0 mb-1">Active</p>
            <p className="text-2xl font-bold text-blue-600 m-0">{inProgress}</p>
            <p className="text-xs text-blue-600 m-0 mt-1">In progress</p>
          </div>
          <div className="bg-orange-50 border border-orange-200/30 rounded p-3">
            <p className="text-xs text-orange-700 font-medium m-0 mb-1">
              Pending
            </p>
            <p className="text-2xl font-bold text-orange-600 m-0">{pending}</p>
            <p className="text-xs text-orange-600 m-0 mt-1">Not started</p>
          </div>
          <div className="bg-green-50 border border-green-200/30 rounded p-3">
            <p className="text-xs text-green-700 font-medium m-0 mb-1">
              Complete
            </p>
            <p className="text-2xl font-bold text-green-600 m-0">{completed}</p>
            <p className="text-xs text-green-600 m-0 mt-1">Of {total} total</p>
          </div>
          <div className="bg-red-50 border border-red-200/30 rounded p-3">
            <p className="text-xs text-red-700 font-medium m-0 mb-1">Overdue</p>
            <p className="text-2xl font-bold text-red-600 m-0">{overdue}</p>
            <p className="text-xs text-red-600 m-0 mt-1">Needs action</p>
          </div>
        </div>

        {/* AI Insight */}
        {aiInsight && (
          <div className="bg-purple-50 border border-purple-200/30 rounded-md p-3">
            <div className="flex gap-2 items-start">
              <CheckCircle
                size={16}
                className="text-purple-600 shrink-0 mt-0.5"
              />
              <p className="text-xs text-purple-800 m-0 leading-relaxed">
                {aiInsight}
              </p>
            </div>
          </div>
        )}

        {/* Status Message */}
        {total === 0 ? (
          <div className="bg-blue-50 border border-blue-200/30 rounded-md p-3 flex gap-2 items-start">
            <CheckCircle size={16} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 m-0">
              Create tasks to get started with AI-powered analytics and team
              performance insights.
            </p>
          </div>
        ) : overdue > 0 ? (
          <div className="bg-red-100/80 border border-red-300/50 rounded-md p-3 flex gap-2 items-start">
            <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 m-0">
              <strong>
                {overdue} overdue task{overdue !== 1 ? "s" : ""}.
              </strong>{" "}
              Prioritize addressing these to maintain momentum.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
};
