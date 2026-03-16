"use client";

import React from "react";
import TaskListSection from "./TasksDisplaySectionComponent";

interface Task {
  id: string;
  title: string;
  priority?: string;
  dueDate?: string;
  assigner?: string;
}

interface TaskStatusGridProps {
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  pendingTasks: Task[];
  inProgressTasks?: Task[];
  overdueTasks?: Task[];
  completedTasks?: Task[];
}

const TaskStatusGrid = ({
  pending,
  inProgress,
  completed,
  overdue,
  pendingTasks,
  inProgressTasks = [],
  overdueTasks = [],
  completedTasks = [],
}: TaskStatusGridProps) => {
  return (
    <div className="grid grid-cols-2 gap-2 h-full w-full">
      {/* Top Left: Pending Tasks */}
      <TaskListSection tasks={pendingTasks} status="pending" />

      {/* Top Right: In Progress Tasks */}
      <TaskListSection tasks={inProgressTasks} status="inProgress" />

      {/* Bottom Left: Overdue/Due Date Tasks */}
      <TaskListSection tasks={overdueTasks} status="overdue" />

      {/* Bottom Right: Completed Tasks */}
      <TaskListSection tasks={completedTasks} status="completed" />
    </div>
  );
};

export default TaskStatusGrid;
