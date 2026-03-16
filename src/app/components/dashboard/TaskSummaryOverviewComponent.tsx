import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Zap, AlertCircle } from "lucide-react";
import type { Task } from "@/app/components/tasks/types";

interface TaskSummaryProps {
  tasks?: Task[];
}

const TaskSummary = ({ tasks = [] }: TaskSummaryProps) => {
  const router = useRouter();

  // Sort tasks by priority and deadline
  const sortedTasks = useMemo(() => {
    const priorityScore = { high: 3, medium: 2, low: 1 };

    // Sort by: priority (high first) → then deadline (soonest first)
    return [...tasks].sort((a, b) => {
      const aScore =
        priorityScore[a.priority as keyof typeof priorityScore] || 0;
      const bScore =
        priorityScore[b.priority as keyof typeof priorityScore] || 0;

      if (aScore !== bScore) return bScore - aScore; // Higher priority first

      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(); // Soonest deadline first
      }
      return 0;
    });
  }, [tasks]);

  return (
    <div
      className="
        bg-gradient-to-b from-amber-50 to-white
        border border-amber-200
        rounded-xl
        shadow-sm
        overflow-hidden
        h-full
        flex
        flex-col
        transition-all
        duration-200
        hover:shadow-md
      "
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-amber-50/80 flex items-center gap-2">
        <Zap size={18} className="text-amber-600" />
        <h2 className="text-base font-medium text-gray-900">Do This First</h2>
      </div>

      {/* Content - Scrollable list of tasks */}
      <div className="flex-1 overflow-y-auto p-2.5">
        {sortedTasks.length > 0 ? (
          <div className="space-y-2">
            {sortedTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => router.push(`/tasks?focus=${task.id}`)}
                className="
                  flex items-start gap-3.5 
                  bg-amber-100 
                  hover:bg-amber-200/80 
                  active:bg-amber-200 
                  transition-all duration-200 
                  cursor-pointer 
                  rounded-lg 
                  px-4 py-2.5
                  border border-amber-200/60 
                  hover:border-amber-300/70 
                  hover:shadow-sm
                "
              >
                <Zap size={18} className="text-amber-600 flex-shrink-0 mt-1" />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {task.title}
                  </p>

                  <div className="mt-1 text-xs text-gray-600 flex flex-wrap gap-x-3">
                    {task.createdBy && (
                      <span>
                        by {task.createdBy.name || task.createdBy.email}
                      </span>
                    )}
                    {task.dueDate && <span>due {task.dueDate}</span>}
                  </div>
                </div>

                {task.priority && (
                  <span
                    className={`
                      text-xs px-2.5 py-1 rounded-full font-medium self-start mt-0.5 flex-shrink-0
                      ${
                        task.priority === "high"
                          ? "bg-red-200/80 text-red-800"
                          : task.priority === "medium"
                            ? "bg-yellow-200/80 text-yellow-800"
                            : "bg-green-200/80 text-green-800"
                      }
                    `}
                  >
                    {task.priority}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center px-6 text-center">
            <div>
              <AlertCircle size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No tasks to prioritize</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskSummary;
