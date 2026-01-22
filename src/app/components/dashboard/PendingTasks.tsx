import React from "react";
import { CheckCircle2 } from "lucide-react";

interface PendingTasksProps {
  pending: number;
}

const PendingTasks = ({ pending }: PendingTasksProps) => {
  // For now, display pending count since we don't have the full task list in the store
  // This can be enhanced when the backend provides the actual task list

  return (
    <div className="bg-white/10 backdrop-blur rounded-xl p-4 h-full flex flex-col">
      <h2 className="text-lg font-semibold text-white mb-4">Pending Tasks</h2>
      <div className="flex-1 flex flex-col justify-center items-center">
        <div className="text-center">
          <CheckCircle2 size={32} className="text-yellow-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{pending}</p>
          <p className="text-sm text-gray-300 mt-1">
            pending task{pending !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
      <div className="text-xs text-gray-400 text-center mt-auto">
        View details in Tasks section
      </div>
    </div>
  );
};

export default PendingTasks;
