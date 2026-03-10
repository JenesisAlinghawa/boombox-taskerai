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
    <div className="bg-blue-100 backdrop-blur-lg border border-black/10 rounded-sm p-3 h-full flex flex-col transition-all duration-200 hover:border-black/50">
      <h2 className="text-sm font-normal text-black/80 mb-2">Pending Tasks</h2>
      <div className="flex-1 flex flex-col overflow-hidden">
        {tasks.length > 0 ? (
          <div className="overflow-y-auto flex-1 space-y-1 pr-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => router.push(`/tasks?focus=${task.id}`)}
                className="flex items-start gap-2 p-2 bg-blue-500/30 rounded-lg hover:bg-blue-800/40 transition-colors cursor-pointer"
              >
                <Circle
                  size={20}
                  className="text-purple-400 mt-1.5 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-black/70 truncate">
                    {task.title}
                  </p>
                  {task.assigner && (
                    <p className="text-xs text-black/50 mt-0.5 truncate">
                      by {task.assigner}
                    </p>
                  )}
                  {task.dueDate && (
                    <p className="text-xs text-black/50 mt-0.5">
                      Due {task.dueDate}
                    </p>
                  )}
                </div>
                {task.priority && (
                  <span
                    className={`text-xs px-4 py-2 blackspace-nowrap flex-shrink-0 rounded text-center ${
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
          <div className="flex-1 flex flex-col justify-center items-center ">
            <div className="text-center">
              <CheckCircle2 size={24} className="text-green-400 mx-auto mb-1" />
              <p className="text-xs text-black/62">No pending tasks</p>
            </div>
          </div>
        )}
      </div>
      <div className="text-xs text-black/62 text-center mt-auto pt-1">
        {tasks.length} task{tasks.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
};

export default PendingTasks;
