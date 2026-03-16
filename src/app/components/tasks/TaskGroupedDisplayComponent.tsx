"use client";

import React, { useMemo } from "react";
import TaskStatusGroupSection from "./TaskStatusGroupSectionComponent";
import type { Task, User } from "./types";

interface TaskGroupedDisplayProps {
  tasks: Task[];
  currentUser: User | null;
  onEdit: (taskId: string) => void;
  onView: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, newStatus: string) => void;
  onContain: (taskId: string) => void;
  filterByAssignee?: boolean;
}

export default function TaskGroupedDisplay({
  tasks,
  currentUser,
  onEdit,
  onView,
  onDelete,
  onStatusChange,
  onContain,
  filterByAssignee = false,
}: TaskGroupedDisplayProps) {
  // Group tasks by status and handle overdue
  const groupedTasks = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let filteredTasks = tasks;

    // If filterByAssignee is true, only show tasks assigned to current user
    if (filterByAssignee && currentUser) {
      filteredTasks = tasks.filter(
        (task) =>
          task.assignees?.some((a) => a.assignee?.id === currentUser.id) ||
          task.assignee?.id === currentUser.id,
      );
    }

    // Separate by status
    const overdue: Task[] = [];
    const todo: Task[] = [];
    const inProgress: Task[] = [];
    const stuck: Task[] = [];
    const done: Task[] = [];

    filteredTasks.forEach((task) => {
      const status = (task.status || "todo").toLowerCase();
      const isDone = status === "done" || status === "completed";

      // Check if task is overdue
      if (task.dueDate && !isDone) {
        const dueDate = new Date(task.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        if (dueDate < now) {
          overdue.push(task);
          // ALSO add to the actual status group, not just overdue
        }
      }

      // Categorize by status (INCLUDING overdue tasks in their actual status)
      switch (status) {
        case "todo":
          todo.push(task);
          break;
        case "inprogress":
        case "in_progress":
          inProgress.push(task);
          break;
        case "stuck":
          stuck.push(task);
          break;
        case "done":
        case "completed":
          done.push(task);
          break;
        default:
          todo.push(task);
      }
    });

    return { overdue, todo, inProgress, stuck, done };
  }, [tasks, filterByAssignee, currentUser]);

  return (
    <div className="space-y-4">
      {/* Overdue Section - Always first if any exist */}
      {groupedTasks.overdue.length > 0 && (
        <TaskStatusGroupSection
          groupKey="overdue"
          groupName="Overdue"
          tasks={groupedTasks.overdue}
          currentUser={currentUser}
          isOverdue
          isCollapsed={false}
          onEdit={onEdit}
          onView={onView}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
          onContain={onContain}
        />
      )}

      {/* To Do Section */}
      {groupedTasks.todo.length > 0 && (
        <TaskStatusGroupSection
          groupKey="todo"
          groupName="To Do"
          tasks={groupedTasks.todo}
          currentUser={currentUser}
          isCollapsed={false}
          onEdit={onEdit}
          onView={onView}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
          onContain={onContain}
        />
      )}

      {/* In Progress Section */}
      {groupedTasks.inProgress.length > 0 && (
        <TaskStatusGroupSection
          groupKey="inprogress"
          groupName="In Progress"
          tasks={groupedTasks.inProgress}
          currentUser={currentUser}
          isCollapsed={false}
          onEdit={onEdit}
          onView={onView}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
          onContain={onContain}
        />
      )}

      {/* Stuck Section */}
      {groupedTasks.stuck.length > 0 && (
        <TaskStatusGroupSection
          groupKey="stuck"
          groupName="Stuck"
          tasks={groupedTasks.stuck}
          currentUser={currentUser}
          isCollapsed={false}
          onEdit={onEdit}
          onView={onView}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
          onContain={onContain}
        />
      )}

      {/* Done Section - Usually collapsed */}
      {groupedTasks.done.length > 0 && (
        <TaskStatusGroupSection
          groupKey="done"
          groupName="Done"
          tasks={groupedTasks.done}
          currentUser={currentUser}
          isCollapsed={groupedTasks.done.length > 5} // Auto-collapse if many
          onEdit={onEdit}
          onView={onView}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
          onContain={onContain}
        />
      )}

      {/* Empty State */}
      {Object.values(groupedTasks).every((arr) => arr.length === 0) && (
        <div className="text-center py-12 text-black/40">
          <p className="text-sm">No tasks to display</p>
        </div>
      )}
    </div>
  );
}
