"use client";

import React from "react";
import TaskRow from "./TaskListItemRowComponent";
import type { Task, User } from "./types";
import {
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Circle,
  Play,
  Zap,
} from "lucide-react";

interface TaskStatusGroupSectionProps {
  groupName: string;
  groupKey: "overdue" | "todo" | "inprogress" | "stuck" | "done";
  tasks: Task[];
  currentUser: User | null;
  isCollapsed?: boolean;
  isOverdue?: boolean;
  onEdit: (taskId: string) => void;
  onView: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, newStatus: string) => void;
  onContain: (taskId: string) => void;
}

const STATUS_COLORS = {
  overdue: "border-red-500/30 bg-red-500/5",
  todo: "border-slate-300/30 bg-slate-500/5",
  inprogress: "border-blue-300/30 bg-blue-500/5",
  stuck: "border-orange-300/30 bg-orange-500/5",
  done: "border-green-300/30 bg-green-500/5",
};

const HEADER_BG = {
  overdue: "bg-red-200",
  todo: "bg-purple-200",
  inprogress: "bg-blue-200",
  stuck: "bg-orange-200",
  done: "bg-green-200",
};

const BADGE_BG = {
  overdue: "bg-red-200 text-red-700",
  todo: "bg-slate-200 text-slate-700",
  inprogress: "bg-blue-200 text-blue-700",
  stuck: "bg-orange-200 text-orange-700",
  done: "bg-green-200 text-green-700",
};

const ICON_COLOR = {
  overdue: "text-red-600",
  todo: "text-slate-600",
  inprogress: "text-blue-600",
  stuck: "text-orange-600",
  done: "text-green-600",
};

const getGroupIcon = (groupKey: string) => {
  const iconProps = {
    className: `w-4 h-4 ${ICON_COLOR[groupKey as keyof typeof ICON_COLOR]}`,
  };
  switch (groupKey) {
    case "overdue":
      return <AlertCircle {...iconProps} />;
    case "todo":
      return <Circle {...iconProps} />;
    case "inprogress":
      return <Play {...iconProps} />;
    case "stuck":
      return <Zap {...iconProps} />;
    case "done":
      return <CheckCircle2 {...iconProps} />;
    default:
      return null;
  }
};

export default function TaskStatusGroupSection({
  groupName,
  groupKey,
  tasks,
  currentUser,
  isCollapsed = true,
  isOverdue = false,
  onEdit,
  onView,
  onDelete,
  onStatusChange,
  onContain,
}: TaskStatusGroupSectionProps) {
  const [collapsed, setCollapsed] = React.useState(isCollapsed);

  return (
    <div
      className={`shadow-black shadow-sm rounded-sm overflow-visible mb-2 ${STATUS_COLORS[groupKey]}`}
    >
      {/* Group Header */}
      <div
        className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-colors hover:border-1 border-black ${HEADER_BG[groupKey]}`}
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          {getGroupIcon(groupKey)}
          <h3 className="text-sm font-semibold text-black/80">{groupName}</h3>
          <span
            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${BADGE_BG[groupKey]}`}
          >
            {tasks.length}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-black/60 transition-transform ${
            collapsed ? "rotate-180" : ""
          }`}
        />
      </div>

      {/* Group Content */}
      {!collapsed && (
        <div>
          {/* Column Headers */}
          {tasks.length > 0 && (
            <div className="px-4 py-2 flex items-center justify-between gap-3 bg-blue-400/20 border-0.5 border-black text-sm font-semibold text-black/70">
              <div className="flex-1 min-w-0">Task</div>
              <div className="w-[120px]">Assignee</div>
              <div className="w-[100px] text-center">Status</div>
              <div className="w-[60px] text-center">Attach.</div>
              <div className="w-[60px] text-center">Comments</div>
              <div className="w-[70px] text-center">Priority</div>
              <div className="w-[110px] text-center">Due Date</div>
              <div className="w-[50px] text-center">Actions</div>
            </div>
          )}

          {/* Tasks List */}
          <div className="divide-y divide-black overflow-visible">
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  currentUserId={currentUser?.id}
                  onEdit={onEdit}
                  onContain={onContain}
                  onOpenDetails={onView}
                  onDelete={onDelete}
                  onStatusChange={onStatusChange}
                />
              ))
            ) : (
              <div className="py-4 text-center text-black/40 text-sm">
                No tasks in this group
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
