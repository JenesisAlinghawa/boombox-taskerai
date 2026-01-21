"use client";

import React from "react";

interface TaskCounterProps {
  label: string;
  count: number;
  color: "purple" | "blue" | "green" | "red";
}

const colorClasses = {
  purple: "bg-purple-500/20 border-purple-500/30 text-purple-300",
  blue: "bg-blue-500/20 border-blue-500/30 text-blue-300",
  green: "bg-green-500/20 border-green-500/30 text-green-300",
  red: "bg-red-500/20 border-red-500/30 text-red-300",
};

const numberColorClasses = {
  purple: "text-purple-400",
  blue: "text-blue-400",
  green: "text-green-400",
  red: "text-red-400",
};

export const TaskCounter: React.FC<TaskCounterProps> = ({
  label,
  count,
  color,
}) => {
  return (
    <div
      className={`${colorClasses[color]} rounded-lg p-6 border flex flex-col items-center justify-center min-h-[120px] backdrop-blur-md transition-all hover:shadow-lg`}
    >
      <p className="text-xs sm:text-sm text-gray-300 mb-2 text-center">
        {label}
      </p>
      <p
        className={`text-3xl sm:text-4xl font-bold ${numberColorClasses[color]}`}
      >
        {count}
      </p>
    </div>
  );
};
