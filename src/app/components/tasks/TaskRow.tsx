import React from "react";
import type { Task } from "./types";

interface Props {
  task: Task;
  onOpenDetails: (taskId: number) => void;
  onDelete: (id: number) => void;
  onEdit: (taskId: number) => void;
  onContain: (taskId: number) => void;
  currentUserId?: number | null; // used to determine owner permissions
}

export default function TaskRow({
  task,
  onOpenDetails,
  onDelete,
  onEdit,
  onContain,
  currentUserId,
}: Props) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  // close menu on outside click
  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  const isOwner = currentUserId === task.createdById;

  return (
    <tr
      key={task.id}
      className="border-b border-white/10 transition-colors hover:bg-white/10"
    >
      <td className="px-4 py-2 text-white">
        {task.title}
        {task.description && (
          <div className="text-xs text-slate-300 overflow-hidden text-ellipsis whitespace-nowrap max-w-[300px]">
            {task.description}
          </div>
        )}
      </td>

      <td className="px-4 py-2 text-white">
        {task.assignee ? (
          `${task.assignee.name || task.assignee.email}`
        ) : (
          <span className="text-slate-400">Unassigned</span>
        )}
      </td>

      <td className="px-4 py-2 text-center">
        <span className="inline-block px-2 py-1 rounded bg-slate-600 text-white text-xs font-semibold">
          {task.status || "todo"}
        </span>
      </td>

      <td className="px-4 py-2 text-center text-white">
        {task.attachments?.length || 0}
      </td>
      <td className="px-4 py-2 text-center text-white">
        {task.comments?.length || 0}
      </td>
      <td className="px-4 py-2 text-center text-white">
        {task.priority || "—"}
      </td>
      <td className="px-4 py-2 text-center text-white">
        {task.dueDate
          ? new Date(task.dueDate).toLocaleDateString("en-US")
          : "—"}
      </td>

      <td className="px-4 py-2 text-center">
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="bg-none border-none text-slate-400 cursor-pointer text-lg p-1 hover:text-slate-300 transition-colors"
            title="Actions"
          >
            ⋮
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-[calc(100%+4px)] bg-blue-950 border border-white/10 rounded-lg shadow-xl z-50 min-w-[140px]">
              <button
                onClick={() => {
                  onContain(task.id);
                  setMenuOpen(false);
                }}
                className="w-full px-3 py-2 bg-none border-none text-white text-left cursor-pointer hover:bg-white/10 transition-colors text-sm"
              >
                Copy link
              </button>
              {isOwner && (
                <button
                  onClick={() => {
                    onEdit(task.id);
                    setMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 bg-none border-none text-white text-left cursor-pointer hover:bg-white/10 transition-colors text-sm"
                >
                  Edit
                </button>
              )}
              <button
                onClick={() => {
                  onOpenDetails(task.id);
                  setMenuOpen(false);
                }}
                className="w-full px-3 py-2 bg-none border-none text-white text-left cursor-pointer hover:bg-white/10 transition-colors text-sm"
              >
                View
              </button>
              {isOwner && (
                <button
                  onClick={() => {
                    onDelete(task.id);
                    setMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 bg-none border-none text-red-400 text-left cursor-pointer hover:bg-white/10 hover:text-red-300 transition-colors text-sm"
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
