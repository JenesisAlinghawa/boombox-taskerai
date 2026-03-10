import React, { useMemo, useState, useEffect } from "react";
import { Activity, TrendingUp, Target, Clock, ArrowRight } from "lucide-react";
import {
  dijkstraTaskScheduler,
  type TaskNode,
  type DijkstraResult,
} from "@/utils/dijkstraTaskScheduler";
import { useTasks } from "@/hooks/useTasks";
import { getCurrentUser, type Employee } from "@/utils/sessionManager";

const DijkstraPanel = () => {
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const user = await getCurrentUser();
      setCurrentEmployee(user);
    };
    fetchUser();
  }, []);

  const { tasks } = useTasks(currentEmployee);

  const optimizationResults = useMemo(() => {
    if (!tasks || tasks.length === 0) return null;

    try {
      // Create mapping from string UUIDs to numeric IDs for Dijkstra algorithm
      const idMapping = new Map<string, number>();
      const reverseIdMapping = new Map<number, string>();

      tasks.forEach((task, index) => {
        const numericId = index + 1; // Start from 1 to avoid 0
        idMapping.set(task.id, numericId);
        reverseIdMapping.set(numericId, task.id);
      });

      // Convert tasks to Dijkstra format
      const taskNodes: TaskNode[] = tasks.map((task) => ({
        id: idMapping.get(task.id)!, // Use mapped numeric ID
        title: task.title,
        priority: task.priority as "low" | "medium" | "high" | null,
        dueDate: task.dueDate || null,
        status: task.status || null,
        createdAt: task.createdAt || null,
        dependsOnTaskIds: (task as any).dependsOnTaskIds || [], // Handle missing property
        estimatedEffort: (task as any).estimatedEffort || 0, // Handle missing property
      }));

      // Run Dijkstra algorithm
      const results = dijkstraTaskScheduler(taskNodes);

      // Filter and sort by priority, and map back to string IDs
      const validResults = results
        .filter((r) => r.taskId !== 0)
        .map((result) => ({
          ...result,
          originalTaskId: reverseIdMapping.get(result.taskId)!, // Add original string ID
        }))
        .sort((a, b) => a.priority - b.priority);

      return {
        results: validResults,
        criticalPathTasks: validResults.filter((r) => r.criticalPath),
        totalTasks: validResults.length,
        averageUrgency:
          validResults.reduce((sum, r) => sum + r.urgencyScore, 0) /
          validResults.length,
      };
    } catch (error) {
      console.error("Error calculating task optimization:", error);
      return null;
    }
  }, [tasks]);

  const getUrgencyColor = (score: number) => {
    if (score >= 80) return "text-red-400";
    if (score >= 60) return "text-orange-400";
    if (score >= 40) return "text-yellow-400";
    return "text-blue-400";
  };

  const getPriorityIcon = (priority: number) => {
    if (priority <= 10) return <Target size={14} className="text-red-400" />;
    if (priority <= 20) return <Clock size={14} className="text-orange-400" />;
    return <TrendingUp size={14} className="text-blue-400" />;
  };

  if (!optimizationResults) {
    return (
      <div className="bg-blue-100 backdrop-blur-lg border border-black/10 rounded-sm p-3 h-full flex flex-col">
        <h2 className="text-sm font-normal text-black/80 mb-2">
          Recommended Task Order
        </h2>
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
          <Activity size={24} className="text-blue-400" />
          <p className="text-xs text-black/62">
            Analyzing your tasks to find the best order
          </p>
          <p className="text-xs text-black/62">
            Help complete what matters first
          </p>
        </div>
      </div>
    );
  }

  const { results, criticalPathTasks, totalTasks, averageUrgency } =
    optimizationResults;

  return (
    <div className="bg-blue-100 backdrop-blur-lg border border-black/10 rounded-sm p-3 h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-normal text-black/80">
          Recommended Task Order
        </h2>
        <div className="flex items-center gap-1 text-xs text-black/60">
          <Activity size={12} />
          <span>{totalTasks} tasks</span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div
          className="bg-black/5 rounded-sm p-2 border border-black/10"
          title="Tasks that block other work"
        >
          <div className="text-xs text-black/60 mb-0.5">Blocking Tasks</div>
          <div className="text-base font-bold text-blue-400">
            {criticalPathTasks.length}
          </div>
          <div className="text-xs text-black/60">must do first</div>
        </div>
        <div
          className="bg-black/5 rounded-sm p-2 border border-black/10"
          title="How urgent your tasks are"
        >
          <div className="text-xs text-black/60 mb-0.5">Overall Priority</div>
          <div
            className={`text-base font-bold ${getUrgencyColor(averageUrgency)}`}
          >
            {averageUrgency >= 80
              ? "High"
              : averageUrgency >= 60
                ? "Med"
                : "Low"}
          </div>
          <div className="text-xs text-black/60">level</div>
        </div>
      </div>

      {/* Optimized Task List */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="text-xs text-black/60 mb-1 font-semibold">Do First</div>
        <div className="space-y-1 overflow-y-auto flex-1">
          {results.slice(0, 12).map((result, index) => (
            <div
              key={result.originalTaskId}
              className="bg-black/5 rounded-sm p-1.5 border border-black/10 hover:bg-black/10 transition-colors text-xs"
            >
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded-full bg-blue-600/50 flex items-center justify-center text-[8px] font-bold text-black">
                    {index + 1}
                  </div>
                  {getPriorityIcon(result.priority)}
                  <span className="text-xs font-medium text-black truncate max-w-[120px]">
                    {result.title}
                  </span>
                </div>
                {result.criticalPath && (
                  <div
                    className="flex items-center gap-0.5 text-xs text-red-400"
                    title="This blocks other tasks"
                  >
                    <Target size={8} />
                    <span className="text-xs">Blocking</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={getUrgencyColor(result.urgencyScore)}>
                    {result.urgencyScore >= 80
                      ? "High"
                      : result.urgencyScore >= 60
                        ? "Med"
                        : "Low"}
                  </span>
                  {result.dependencyWeight > 0 && (
                    <span
                      className="text-black/60"
                      title="Other tasks depend on this"
                    >
                      {result.dependencyWeight} block
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {results.length > 12 && (
            <div className="text-center py-0.5">
              <span className="text-[10px] text-black/60">
                +{results.length - 12} more...
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-1 pt-1 border-t border-black/10">
        <div className="flex items-center justify-center gap-1 text-[9px] text-black/60 flex-wrap">
          <div className="flex items-center gap-1">
            <Target size={8} className="text-red-400" />
            <span title="These block other tasks">Blocking</span>
          </div>
          <ArrowRight size={8} />
          <div className="flex items-center gap-1">
            <Clock size={8} className="text-orange-400" />
            <span>Urgent</span>
          </div>
          <ArrowRight size={8} />
          <div className="flex items-center gap-1">
            <TrendingUp size={8} className="text-blue-400" />
            <span>Standard</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DijkstraPanel;
