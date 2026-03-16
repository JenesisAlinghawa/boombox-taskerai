"use client";

import React from "react";
import { AlertCircle, Zap } from "lucide-react";

interface AtRiskTask {
  id: string;
  title: string;
  daysOverdue?: number;
  daysUntilDue?: number;
  priority: "high" | "medium" | "low";
  assignee?: string;
  urgencyScore?: number; // 0-100
}

interface Props {
  tasks: AtRiskTask[];
  loading?: boolean;
  overdueTasks: number;
}

export const DeadlineRiskCard: React.FC<Props> = ({
  tasks = [],
  loading,
  overdueTasks,
}) => {
  // Use real task data
  const displayTasks: AtRiskTask[] = tasks;

  const getPriorityColor = (priority: string) => {
    if (priority === "high") return "bg-red-100 text-red-700 border-red-200";
    if (priority === "medium")
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    return "bg-blue-100 text-blue-700 border-blue-200";
  };

  const getRiskStatus = (task: AtRiskTask) => {
    if (task.daysOverdue && task.daysOverdue > 0) {
      return {
        text: `${task.daysOverdue} days overdue`,
        color: "text-red-700",
      };
    }
    if (task.daysUntilDue && task.daysUntilDue === 0) {
      return { text: "Due today", color: "text-red-700" };
    }
    if (task.daysUntilDue && task.daysUntilDue === 1) {
      return { text: "Due tomorrow", color: "text-orange-700" };
    }
    if (task.daysUntilDue && task.daysUntilDue > 0) {
      return {
        text: `${task.daysUntilDue} days until due`,
        color: "text-yellow-700",
      };
    }
    return { text: "Check deadline", color: "text-gray-600" };
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col h-full">
      <div className="border-b border-gray-300/50 p-4 shrink-0 flex items-center justify-between gap-2 bg-red-50">
        <div className="flex items-center gap-2">
          <AlertCircle size={18} className="text-red-700" />
          <h3 className="text-sm font-semibold text-gray-800 m-0">
            Deadline Risks
          </h3>
        </div>
        {overdueTasks > 0 && (
          <span className="text-xs font-bold bg-red-600 text-white px-2 py-1 rounded-full">
            {overdueTasks}
          </span>
        )}
      </div>

      <div className="p-2 space-y-1 max-h-48 overflow-y-auto flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            Loading...
          </div>
        ) : displayTasks.length === 0 ? (
          <div className="text-center py-4">
            <AlertCircle size={24} className="mx-auto text-gray-300 mb-1" />
            <p className="text-xs text-gray-500">No at-risk tasks</p>
          </div>
        ) : (
          displayTasks.map((task: AtRiskTask, index) => {
            const riskStatus = getRiskStatus(task);
            const borderLeftColor =
              task.priority === "high"
                ? "border-l-red-500"
                : task.priority === "medium"
                  ? "border-l-yellow-500"
                  : "border-l-blue-500";
            const bgColor =
              task.priority === "high"
                ? "bg-red-50 hover:bg-red-100 border-red-100 hover:border-red-200"
                : task.priority === "medium"
                  ? "bg-yellow-50 hover:bg-yellow-100 border-yellow-100 hover:border-yellow-200"
                  : "bg-blue-50 hover:bg-blue-100 border-blue-100 hover:border-blue-200";

            return (
              <div
                key={task.id}
                className={`
                  flex items-start gap-2
                  ${bgColor}
                  transition-colors duration-150
                  rounded-md
                  px-3 py-2
                  border border-l-4 ${borderLeftColor}
                  group
                `}
              >
                {/* Number */}
                <span className="text-xs font-bold text-gray-700 flex-shrink-0 min-w-[18px]">
                  {index + 1}.
                </span>

                {/* Task Content */}
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  {/* Title */}
                  <p className="text-xs font-semibold text-gray-900 line-clamp-1">
                    {task.title}
                  </p>

                  {/* Status & Details */}
                  <div className="text-xs text-gray-600 flex flex-wrap gap-x-2">
                    <span className={`font-medium ${riskStatus.color}`}>
                      {riskStatus.text}
                    </span>
                    {task.assignee && (
                      <span className="text-gray-700">• {task.assignee}</span>
                    )}
                  </div>
                </div>

                {/* Priority Badge & Urgency */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {task.urgencyScore && (
                    <div className="flex items-center gap-0.5 text-amber-600 font-semibold text-xs">
                      <Zap size={12} />
                      {task.urgencyScore}%
                    </div>
                  )}
                  <span
                    className={`
                      text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap
                      ${getPriorityColor(task.priority)}
                    `}
                  >
                    {task.priority.charAt(0).toUpperCase() +
                      task.priority.slice(1)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
