"use client";

import React from "react";

interface Props {
  completed: number;
  inProgress: number;
  pending: number;
  overdue: number;
}

export const AnalyticsTaskExecutionSummary: React.FC<Props> = ({
  completed,
  inProgress,
  pending,
  overdue,
}) => {
  const total = completed + inProgress + pending + overdue;

  if (total === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white rounded-lg border border-gray-200">
        <div className="text-gray-400 text-sm">No tasks to display</div>
      </div>
    );
  }

  const completedPercent = Math.round((completed / total) * 100);
  const inProgressPercent = Math.round((inProgress / total) * 100);
  const pendingPercent = Math.round((pending / total) * 100);
  const overduePercent = Math.round((overdue / total) * 100);

  return (
    <div className="w-full h-full bg-white rounded-lg border border-gray-200 p-4 flex flex-col">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">Task Summary</h3>

      <div className="flex-1 flex flex-col justify-around space-y-3">
        {/* Status rows */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: "#10b981" }}
            ></div>
            <span className="text-xs text-gray-700">Completed</span>
          </div>
          <span className="text-sm font-semibold text-gray-900">
            {completed}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: "#3b82f6" }}
            ></div>
            <span className="text-xs text-gray-700">In Progress</span>
          </div>
          <span className="text-sm font-semibold text-gray-900">
            {inProgress}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: "#6b7280" }}
            ></div>
            <span className="text-xs text-gray-700">Pending</span>
          </div>
          <span className="text-sm font-semibold text-gray-900">{pending}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: "#ef4444" }}
            ></div>
            <span className="text-xs text-gray-700">Overdue</span>
          </div>
          <span className="text-sm font-semibold text-gray-900">{overdue}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex h-4 gap-1 rounded-full overflow-hidden bg-gray-100">
          {completed > 0 && (
            <div
              style={{
                width: `${completedPercent}%`,
                backgroundColor: "#10b981",
              }}
            />
          )}
          {inProgress > 0 && (
            <div
              style={{
                width: `${inProgressPercent}%`,
                backgroundColor: "#3b82f6",
              }}
            />
          )}
          {pending > 0 && (
            <div
              style={{
                width: `${pendingPercent}%`,
                backgroundColor: "#6b7280",
              }}
            />
          )}
          {overdue > 0 && (
            <div
              style={{
                width: `${overduePercent}%`,
                backgroundColor: "#ef4444",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
