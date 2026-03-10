"use client";

import React, { useMemo } from "react";
import {
  dijkstraTaskScheduler,
  type TaskNode,
  type DijkstraResult,
} from "@/utils/dijkstraTaskScheduler";
import { AlertCircle, TrendingUp, Target, Clock } from "lucide-react";

interface TaskPriorityPanelProps {
  tasks: any[];
  isOpen: boolean;
  onClose: () => void;
}

export default function TaskPriorityPanel({
  tasks,
  isOpen,
  onClose,
}: TaskPriorityPanelProps) {
  const prioritizedTasks = useMemo(() => {
    if (tasks.length === 0) return [];

    try {
      // Convert tasks to Dijkstra format
      const taskNodes: TaskNode[] = tasks.map((task) => ({
        id: task.id,
        title: task.title,
        priority: task.priority || null,
        dueDate: task.dueDate || null,
        status: task.status || null,
        createdAt: task.createdAt || null,
        dependsOnTaskIds: task.dependsOnTaskIds || [],
        estimatedEffort: task.estimatedEffort || 0,
      }));

      // Run Dijkstra algorithm
      const results = dijkstraTaskScheduler(taskNodes);

      // Filter out invalid results and sort by priority
      return results
        .filter((r) => r.taskId !== 0)
        .sort((a, b) => a.priority - b.priority);
    } catch (error) {
      console.error("Error calculating task priorities:", error);
      return [];
    }
  }, [tasks]);

  const getUrgencyColor = (urgencyScore: number) => {
    if (urgencyScore >= 80) return "text-red-400";
    if (urgencyScore >= 60) return "text-orange-400";
    if (urgencyScore >= 40) return "text-yellow-400";
    return "text-blue-400";
  };

  const getUrgencyBgColor = (urgencyScore: number) => {
    if (urgencyScore >= 80) return "bg-red-500/10 border-red-400/30";
    if (urgencyScore >= 60) return "bg-orange-500/10 border-orange-400/30";
    if (urgencyScore >= 40) return "bg-yellow-500/10 border-yellow-400/30";
    return "bg-blue-500/10 border-blue-400/30";
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[999] p-5"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-blue-400/10 backdrop-blur-lg rounded-sm border border-white/10 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center sticky top-0 bg-blue-400/10 z-10">
          <div className="flex items-center gap-3">
            <TrendingUp size={20} className="text-blue-400" />
            <div>
              <h2 className="text-lg font-bold text-white">
                Task Priority Recommendations
              </h2>
              <p className="text-xs text-white/60">
                Optimized execution order based on dependencies and deadlines
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors text-xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6">
          {prioritizedTasks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/60 text-sm">No tasks to prioritize</p>
            </div>
          ) : (
            <div className="space-y-3">
              {prioritizedTasks.map((task, index) => (
                <div
                  key={task.taskId}
                  className={`p-4 rounded-sm border transition-all hover:border-white/30 ${getUrgencyBgColor(
                    task.urgencyScore,
                  )} border-white/10`}
                >
                  <div className="flex items-start gap-4">
                    {/* Order Badge */}
                    <div className="flex items-center justify-center w-8 h-8 rounded-sm bg-blue-600/50 flex-shrink-0 text-white font-bold text-sm">
                      {index + 1}
                    </div>

                    {/* Task Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-white font-semibold text-sm truncate flex-1">
                          {task.title}
                        </h3>
                        {task.criticalPath && (
                          <span className="px-2 py-1 rounded-sm bg-red-500/20 text-red-400 text-xs font-semibold flex-shrink-0">
                            Critical
                          </span>
                        )}
                      </div>

                      {/* Metrics Row */}
                      <div className="flex flex-wrap gap-4 text-xs">
                        {/* Urgency Score */}
                        <div className="flex items-center gap-1">
                          <AlertCircle
                            size={14}
                            className={getUrgencyColor(task.urgencyScore)}
                          />
                          <span className="text-white/70">Urgency:</span>
                          <span
                            className={`font-semibold ${getUrgencyColor(task.urgencyScore)}`}
                          >
                            {task.urgencyScore}%
                          </span>
                        </div>

                        {/* Priority Score */}
                        <div className="flex items-center gap-1">
                          <Target size={14} className="text-blue-400" />
                          <span className="text-white/70">Priority:</span>
                          <span className="font-semibold text-blue-400">
                            {Math.round(task.priority)}
                          </span>
                        </div>

                        {/* Dependencies */}
                        {task.dependencyWeight > 0 && (
                          <div className="flex items-center gap-1">
                            <Clock size={14} className="text-yellow-400" />
                            <span className="text-white/70">Dependencies:</span>
                            <span className="font-semibold text-yellow-400">
                              {task.dependencyWeight}
                            </span>
                          </div>
                        )}

                        {/* Total Distance (weighted priority) */}
                        <div className="flex items-center gap-1">
                          <TrendingUp size={14} className="text-green-400" />
                          <span className="text-white/70">Score:</span>
                          <span className="font-semibold text-green-400">
                            {Math.round(task.totalDistance)}
                          </span>
                        </div>
                      </div>

                      {/* Reason/Insight */}
                      <p className="text-xs text-white/50 mt-2">
                        {task.criticalPath
                          ? "This task is on the critical path. Delaying it will delay the entire project."
                          : task.urgencyScore >= 80
                            ? "High urgency due to approaching deadline or priority."
                            : task.urgencyScore >= 60
                              ? "Medium urgency. Should be prioritized when possible."
                              : "Lower urgency. Can be scheduled after higher priority tasks."}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-blue-400/5 text-xs text-white/60 flex items-center gap-2">
          <InfoIcon size={14} />
          <span>
            Priorities calculated using Dijkstra's algorithm based on
            dependencies, deadlines, and task properties.
          </span>
        </div>
      </div>
    </div>
  );
}

function InfoIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}
