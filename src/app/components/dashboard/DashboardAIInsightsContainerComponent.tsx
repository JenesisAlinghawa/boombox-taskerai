"use client";

import React from "react";
import { Brain } from "lucide-react";

interface TaskData {
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  pendingTasks: any[];
  inProgressTasks: any[];
  overdueTasks: any[];
  completedTasks: any[];
}

interface Props {
  data: TaskData;
  loading?: boolean;
}

export const DashboardAIInsightsContainer: React.FC<Props> = ({
  data,
  loading,
}) => {
  const generateInsights = (): Array<{
    text: string;
    type: "positive" | "warning" | "info";
  }> => {
    const insights: Array<{
      text: string;
      type: "positive" | "warning" | "info";
    }> = [];
    const totalTasks =
      data.pending + data.inProgress + data.completed + data.overdue;

    // Completion rate insight
    if (totalTasks > 0) {
      const completionRate = Math.round((data.completed / totalTasks) * 100);
      if (completionRate === 100) {
        insights.push({
          text: "All tasks have been completed. This is an excellent achievement. Consider planning your next goals.",
          type: "positive",
        });
      } else if (completionRate >= 75) {
        insights.push({
          text: `You are ${completionRate}% done. Keep the momentum going with your remaining tasks.`,
          type: "positive",
        });
      } else if (completionRate >= 50) {
        insights.push({
          text: `You are halfway through. Progress is solid at ${completionRate}%. Focus on the tasks ahead.`,
          type: "info",
        });
      } else if (completionRate > 0) {
        insights.push({
          text: `You have completed ${completionRate}% of your tasks. There is room to accelerate.`,
          type: "warning",
        });
      } else {
        insights.push({
          text: "No tasks have been completed yet. Starting with the most urgent items will help build momentum.",
          type: "warning",
        });
      }
    }

    // Progress insight
    if (data.inProgress === 0) {
      if (data.pending > 0) {
        insights.push({
          text: `You have ${data.pending} pending task${data.pending !== 1 ? "s" : ""} waiting to be started. Choose one and begin.`,
          type: "info",
        });
      } else if (totalTasks === 0) {
        insights.push({
          text: "Your task board is clear. This is a good time to plan ahead or adjust priorities.",
          type: "info",
        });
      }
    } else if (data.inProgress === 1) {
      insights.push({
        text: "You are focused on one task. This focused approach can lead to better quality work.",
        type: "positive",
      });
    } else {
      insights.push({
        text: `You are working on ${data.inProgress} tasks simultaneously. Consider if all require immediate attention.`,
        type: "info",
      });
    }

    // Overdue insight
    if (data.overdue > 0) {
      insights.push({
        text: `You have ${data.overdue} overdue task${data.overdue !== 1 ? "s" : ""}. Addressing these will help restore your schedule to track.`,
        type: "warning",
      });
    }

    // Workload insight
    if (totalTasks > 0) {
      const workloadPercentage = Math.round(
        ((data.pending + data.inProgress) / totalTasks) * 100,
      );
      if (workloadPercentage > 80) {
        insights.push({
          text: "Your workload is substantial. Breaking tasks into smaller steps can make them more manageable.",
          type: "warning",
        });
      } else if (workloadPercentage > 50) {
        insights.push({
          text: "Your workload is balanced. Continue at this pace while maintaining quality.",
          type: "positive",
        });
      }
    }

    return insights;
  };

  const getBackgroundColor = (type: string) => {
    switch (type) {
      case "positive":
        return "bg-green-50 border-green-200";
      case "warning":
        return "bg-amber-50 border-amber-200";
      case "info":
        return "bg-blue-50 border-blue-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const getTextColor = (type: string) => {
    switch (type) {
      case "positive":
        return "text-green-800";
      case "warning":
        return "text-amber-800";
      case "info":
        return "text-blue-800";
      default:
        return "text-gray-800";
    }
  };

  const insights = generateInsights();

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col h-full">
      <div className="border-b border-gray-300/50 p-4 shrink-0 flex items-center gap-2 bg-blue-50">
        <Brain size={18} className="text-blue-700" />
        <h3 className="text-sm font-semibold text-gray-800 m-0">AI Insights</h3>
      </div>

      <div className="p-4 space-y-3 overflow-y-auto flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <div className="flex items-center gap-2">
              <Brain size={16} className="animate-spin" />
              <span className="text-sm">Analyzing your progress...</span>
            </div>
          </div>
        ) : insights.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">
            No insights available
          </div>
        ) : (
          insights.map((insight, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg border ${getBackgroundColor(
                insight.type,
              )}`}
            >
              <p
                className={`text-sm leading-relaxed ${getTextColor(insight.type)}`}
              >
                {insight.text}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
