import React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";

interface Task {
  id: number;
  title: string;
  priority?: string;
  dueDate?: string;
  assigner?: string; // name or identifier of who assigned the task
}

interface PendingTasksProps {
  tasks?: Task[];
}

const PendingTasks = ({ tasks = [] }: PendingTasksProps) => {
  const router = useRouter();

  return (
    <div className="bg-blue-400/10 backdrop-blur-lg border border-white/10 rounded-sm shadow-lg p-4 h-full flex flex-col">
      <h2 className="text-lg font-normal text-white/80 mb-4">Pending Tasks</h2>
      <div className="flex-1 flex flex-col overflow-hidden">
        {tasks.length > 0 ? (
          <div className="overflow-y-auto flex-1 space-y-2 pr-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => router.push(`/tasks?focus=${task.id}`)}
                className="flex items-start gap-3 p-3 bg-blue-500/30 rounded-xl hover:bg-blue-800/40 transition-colors cursor-pointer"
              >
                <Circle
                  size={28}
                  className="text-purple-400 mt-0.5 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/70 truncate">
                    {task.title}
                  </p>
                  {task.assigner && (
                    <p className="text-xs text-white/50 mt-0.5">
                      Assigned by {task.assigner}
                    </p>
                  )}
                  {task.dueDate && (
                    <p className="text-xs text-white/50 mt-1">
                      Due {task.dueDate}
                    </p>
                  )}
                </div>
                {task.priority && (
                  <span
                    className={`text-sm px-2 py-1 mt-1 pl-6 pr-6 mr-5 rounded  whitespace-nowrap flex-shrink-0 ${
                      task.priority === "high"
                        ? "bg-red-100/50 text-red-700"
                        : task.priority === "medium"
                          ? "bg-yellow-100/50 text-yellow-700"
                          : "bg-green-100/50 text-green-700"
                    }`}
                  >
                    {task.priority}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center">
            <div className="text-center">
              <CheckCircle2 size={32} className="text-green-400 mx-auto mb-2" />
              <p className="text-sm text-white/62 mt-1">No pending tasks</p>
            </div>
          </div>
        )}
      </div>
      <div className="text-xs text-white/62 text-center mt-auto pt-2">
        {tasks.length} task{tasks.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
};

export default PendingTasks;
