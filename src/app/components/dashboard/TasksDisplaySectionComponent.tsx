import React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react";

interface Task {
  id: string;
  title: string;
  priority?: string;
  dueDate?: string;
  assigner?: string;
}

type TaskStatus = "pending" | "inProgress" | "overdue" | "completed";

interface TaskListSectionProps {
  tasks?: Task[];
  status: TaskStatus;
}

const TaskListSection = ({ tasks = [], status }: TaskListSectionProps) => {
  const router = useRouter();

  const statusConfig = {
    pending: {
      label: "Pending",
      icon: Circle,
      iconColor: "text-purple-700",
      headerBg: "bg-purple-100",
      taskCardBg: "bg-purple-100",
      taskCardHover: "hover:bg-purple-200/80",
      taskCardBorder: "border-purple-200/60",
      taskCardHoverBorder: "hover:border-purple-300/70",
      accent: "border-l-4 border-purple-400/80",
      empty: "No pending tasks",
    },
    inProgress: {
      label: "In Progress",
      icon: Clock,
      iconColor: "text-blue-700",
      headerBg: "bg-blue-100",
      taskCardBg: "bg-blue-100",
      taskCardHover: "hover:bg-blue-200/80",
      taskCardBorder: "border-blue-200/60",
      taskCardHoverBorder: "hover:border-blue-300/70",
      accent: "border-l-4 border-blue-400/80",
      empty: "No tasks in progress",
    },
    overdue: {
      label: "Overdue",
      icon: AlertCircle,
      iconColor: "text-red-700",
      headerBg: "bg-red-100",
      taskCardBg: "bg-red-100",
      taskCardHover: "hover:bg-red-200/80",
      taskCardBorder: "border-red-200/60",
      taskCardHoverBorder: "hover:border-red-300/70",
      accent: "border-l-4 border-red-400/80",
      empty: "No overdue tasks",
    },
    completed: {
      label: "Completed",
      icon: CheckCircle2,
      iconColor: "text-green-700",
      headerBg: "bg-green-100",
      taskCardBg: "bg-green-100",
      taskCardHover: "hover:bg-green-200/80",
      taskCardBorder: "border-green-200/60",
      taskCardHoverBorder: "hover:border-green-300/70",
      accent: "border-l-4 border-green-400/80",
      empty: "No completed tasks",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className="
        bg-white 
        border border-gray-200 
        rounded-xl 
        overflow-hidden 
        h-full 
        flex 
        flex-col 
        shadow-sm
      "
    >
      {/* Header – status-specific -100 background */}
      <div
        className={`
          px-4 py-2.5 flex items-center justify-between 
          border-b border-gray-300/50 
          ${config.headerBg}
        `}
      >
        <div className="flex items-center gap-2.5">
          <Icon size={18} className={config.iconColor} />
          <h2 className="text-sm font-medium text-gray-800">{config.label}</h2>
        </div>
        <span className="text-xs font-medium text-gray-700 bg-white/70 px-2.5 py-1 rounded-full shadow-sm">
          {tasks.length}
        </span>
      </div>

      {/* All task cards consistently blue-100 */}
      <div className="flex-1 overflow-y-auto p-2.5">
        {tasks.length > 0 ? (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => router.push(`/tasks?focus=${task.id}`)}
                className={`
                  flex items-start gap-3.5 
                  ${config.taskCardBg}
                  ${config.taskCardHover}
                  active:opacity-75
                  transition-all duration-200 
                  cursor-pointer 
                  rounded-lg 
                  px-4 py-2.5 
                  border ${config.taskCardBorder}
                  ${config.taskCardHoverBorder}
                  hover:shadow-sm
                `}
              >
                <div className={`mt-1 ${config.accent}`}>
                  <Icon
                    size={18}
                    className={`${config.iconColor} flex-shrink-0`}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {task.title}
                  </p>

                  <div className="mt-1 text-xs text-gray-600 flex flex-wrap gap-x-3">
                    {task.assigner && <span>by {task.assigner}</span>}
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
              <p className="text-sm text-gray-500">{config.empty}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const PendingTasks = (props: { tasks?: Task[] }) => (
  <TaskListSection {...props} status="pending" />
);

export default TaskListSection;
