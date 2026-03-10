import React from "react";
import { Edit2 } from "lucide-react";
import type { Task } from "./types";

interface Props {
  task: Task;
  onOpenDetails: (taskId: string) => void;
  onDelete: (id: string) => void;
  onEdit: (taskId: string) => void;
  onContain: (taskId: string) => void;
  onStatusChange?: (taskId: string, newStatus: string) => void;
  currentUserId?: number | null; // used to determine owner permissions
}

export default function TaskRow({
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
        return "bg-amber-500 text-white";
      case "stuck":
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
    <tr
      key={task.id}
      onClick={handleRowClick}
      className="border-b border-black/10 transition-colors hover:bg-black/5 cursor-pointer"
    >
      <td className="px-4 py-2 text-black">
        {task.title}
        {task.description && (
          <div className="text-xs text-black/60 overflow-hidden text-ellipsis whitespace-nowrap max-w-[300px]">
            {task.description}
          </div>
        )}
      </td>

      <td className="px-4 py-2 text-black">
        {task.assignee ? (
          `${task.assignee.name || task.assignee.email}`
        ) : (
          <span className="text-black/40">Unassigned</span>
        )}
      </td>

      <td className="px-4 py-2 text-center">
        <div ref={statusMenuRef} className="relative inline-block">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setStatusMenuOpen(!statusMenuOpen);
            }}
            className={`inline-block px-2 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${getStatusColor(task.status || "todo")}`}
          >
            {task.status === "inprogress"
              ? "In Progress"
              : task.status === "overdue"
                ? "Overdue"
                : task.status === "todo"
                  ? "To Do"
                  : task.status === "completed" || task.status === "done"
                    ? "Done"
                    : task.status?.charAt(0).toUpperCase()}
          </button>
          {statusMenuOpen && (
            <div className="absolute left-0 top-[calc(100%+4px)] bg-blue-100 border border-black/10 rounded-lg z-50 min-w-[120px]">
              {["inprogress", "stuck", "completed"].map((status) => (
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
                    : status === "completed"
                      ? "Done"
                      : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      </td>

      <td className="px-4 py-2 text-center text-black">
        {(task as any)._count?.attachments || task.attachments?.length || 0}
      </td>
      <td className="px-4 py-2 text-center text-black">
        {(task as any)._count?.comments || task.comments?.length || 0}
      </td>
      <td className="px-4 py-2 text-center">
        {task.priority ? (
          <span
            className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getPriorityColor(task.priority)}`}
          >
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
          </span>
        ) : (
          <span className="text-black/60">—</span>
        )}
      </td>
      <td className="px-4 py-2 text-center text-black">
        {task.dueDate
          ? new Date(task.dueDate).toLocaleDateString("en-US")
          : "—"}
      </td>

      <td className="px-4 py-2 text-center">
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="bg-none border-none text-black/60 cursor-pointer text-lg p-1 hover:text-black/80 transition-colors"
            title="Actions"
          >
            ⋮
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-[calc(100%+4px)] bg-blue-100 border border-black/10 rounded-lg z-50 min-w-[140px]">
              <button
                onClick={() => {
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
                  onClick={() => {
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
      </td>
    </tr>
  );
}
