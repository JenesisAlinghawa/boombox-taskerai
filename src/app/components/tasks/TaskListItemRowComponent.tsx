import React from "react";
import { Edit2, AlertCircle, MoreVertical } from "lucide-react";
import type { Task } from "./types";

interface Props {
  task: Task;
  onOpenDetails: (taskId: string) => void;
  onDelete: (id: string) => void;
  onEdit: (taskId: string) => void;
  onContain: (taskId: string) => void;
  onStatusChange?: (taskId: string, newStatus: string) => void;
  currentUserId?: string | null; // used to determine owner permissions (UUID)
}

const getOverdueInfo = (dueDate?: string | null, status?: string) => {
  if (!dueDate) return null;

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const isDone = status === "done" || status === "completed";
  if (isDone) return null; // Don't show overdue for done tasks

  if (due < now) {
    const daysOverdue = Math.floor(
      (now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24),
    );
    return {
      isOverdue: true,
      daysOverdue,
      displayText:
        daysOverdue === 0
          ? "Today (overdue)"
          : daysOverdue === 1
            ? "1 day ago"
            : `${daysOverdue} days ago`,
    };
  }

  return null;
};

export default function TaskListItemRowComponent({
  task,
  onOpenDetails,
  onDelete,
  onEdit,
  onContain,
  onStatusChange,
  currentUserId,
}: Props) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const statusMenuRef = React.useRef<HTMLDivElement>(null);
  // close menu on outside click
  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (
        statusMenuRef.current &&
        !statusMenuRef.current.contains(e.target as Node)
      ) {
        setStatusMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  const isOwner = currentUserId === task.createdById;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "todo":
        return "bg-purple-500 text-white";
      case "inprogress":
        return "bg-blue-500 text-white";
      case "stuck":
        return "bg-orange-500 text-white";
      case "overdue":
        return "bg-red-500 text-white";
      case "completed":
      case "done":
        return "bg-green-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "low":
        return "bg-blue-500 text-white";
      case "medium":
        return "bg-orange-500 text-white";
      case "high":
        return "bg-red-600 text-white";
      default:
        return "text-black/60";
    }
  };

  const handleRowClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking the menu button
    if ((e.target as HTMLElement).closest('[role="button"]')) {
      return;
    }
    onOpenDetails(task.id);
  };

  return (
    <div
      key={task.id}
      onClick={handleRowClick}
      className="border-b bg-white border-black/10 transition-colors hover:bg-blue-100/50  cursor-pointer py-2 px-4 flex items-center justify-between gap-3 relative overflow-visible"
    >
      {/* Task Title & Description */}
      <div className="flex-1 min-w-0">
        <div className="text-black font-medium text-sm">{task.title}</div>
        {task.description && (
          <div className="text-xs text-black/60 overflow-hidden text-ellipsis whitespace-nowrap max-w-[300px]">
            {task.description}
          </div>
        )}
      </div>

      {/* Assignee */}
      <div className="w-[120px] text-black text-xs truncate">
        {task.assignees && task.assignees.length > 0 ? (
          <div className="flex items-center gap-1 flex-wrap">
            {task.assignees.slice(0, 1).map((assignment) => (
              <span key={assignment.assignee?.id}>
                {assignment.assignee?.name || assignment.assignee?.email}
              </span>
            ))}
            {task.assignees.length > 1 && (
              <span className="text-black/60">
                +{task.assignees.length - 1}
              </span>
            )}
          </div>
        ) : task.assignee ? (
          `${task.assignee.name || task.assignee.email}`
        ) : (
          <span className="text-black/40">Unassigned</span>
        )}
      </div>

      {/* Status */}
      <div className="w-[100px] text-center ">
        <div ref={statusMenuRef} className="relative inline-block">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setStatusMenuOpen(!statusMenuOpen);
            }}
            className={`inline-block z-[9999999] px-2 py-1 rounded text-xs font-semibold cursor-pointer transition-all duration-200 ${getStatusColor(task.status || "todo")}`}
          >
            {task.status === "inprogress"
              ? "In Progress"
              : task.status === "overdue"
                ? "Overdue"
                : task.status === "todo"
                  ? "To Do"
                  : task.status === "stuck"
                    ? "Stuck"
                    : task.status === "completed" || task.status === "done"
                      ? "Done"
                      : task.status?.charAt(0).toUpperCase()}
          </button>
          {statusMenuOpen && (
            <div className="absolute left-0 top-[calc(100%+4px)] bg-blue-100 border border-black/10 rounded-lg z-[99999] min-w-[120px] shadow-lg animate-in fade-in slide-in-from-top-1 duration-200">
              {["todo", "inprogress", "stuck", "done"].map((status) => (
                <button
                  key={status}
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange?.(task.id, status);
                    setStatusMenuOpen(false);
                  }}
                  className={`w-full px-3 py-2 bg-none border-none text-left cursor-pointer hover:bg-black/5 transition-colors text-sm ${
                    task.status === status
                      ? "text-blue-600 font-semibold"
                      : "text-black"
                  }`}
                >
                  {status === "inprogress"
                    ? "In Progress"
                    : status === "stuck"
                      ? "Stuck"
                      : status === "done"
                        ? "Done"
                        : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Attachments Count */}
      <div className="w-[60px] text-center text-black text-xs">
        {(task as any)._count?.attachments || task.attachments?.length || 0}
      </div>

      {/* Comments Count */}
      <div className="w-[60px] text-center text-black text-xs">
        {(task as any)._count?.comments || task.comments?.length || 0}
      </div>

      {/* Priority */}
      <div className="w-[70px] text-center">
        {task.priority ? (
          <span
            className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getPriorityColor(task.priority)}`}
          >
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
          </span>
        ) : (
          <span className="text-black/60 text-xs">—</span>
        )}
      </div>

      {/* Due Date */}
      <div className="w-[110px] text-center">
        {task.dueDate ? (
          (() => {
            const overdueInfo = getOverdueInfo(task.dueDate, task.status);
            if (overdueInfo?.isOverdue) {
              return (
                <div className="flex items-center justify-center gap-1">
                  <AlertCircle className="w-3 h-3 text-red-600" />
                  <span className="text-red-600 font-semibold text-xs">
                    {overdueInfo.displayText}
                  </span>
                </div>
              );
            }
            return (
              <span className="text-black/80 text-xs">
                {new Date(task.dueDate).toLocaleDateString("en-US")}
              </span>
            );
          })()
        ) : (
          <span className="text-black/40 text-xs">—</span>
        )}
      </div>

      {/* Actions */}
      <div className="w-[50px] text-center flex-shrink-0 z-[99998]">
        <div ref={menuRef} className="relative inline-block w-full">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((o) => !o);
            }}
            className="bg-none border-none text-black/60 cursor-pointer p-1 hover:text-black/80 transition-colors w-full flex justify-center"
            title="Actions"
          >
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-[calc(100%+4px)] bg-blue-100 border border-black/10 rounded-lg z-[99999] min-w-[140px] shadow-lg animate-in fade-in slide-in-from-top-1 duration-200">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(task.id);
                  setMenuOpen(false);
                }}
                className="w-full px-3 py-2 bg-none border-none text-blue-600 text-left cursor-pointer hover:bg-blue-200 hover:text-blue-700 transition-colors text-sm flex items-center gap-2"
              >
                <Edit2 size={14} />
                Edit
              </button>
              {isOwner && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(task.id);
                    setMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 bg-none border-none text-red-600 text-left cursor-pointer hover:bg-red-100 hover:text-red-700 transition-colors text-sm"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
