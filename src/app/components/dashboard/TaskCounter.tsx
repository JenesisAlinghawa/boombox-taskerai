import React from "react";

interface TaskCounterProps {
  label: string;
  count: number;
  color: "purple" | "blue" | "green" | "red";
}

const colorMap = {
  purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
  blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
  green: "bg-green-500/10 border-green-500/20 text-green-400",
  red: "bg-red-500/10 border-red-500/20 text-red-400",
};

export const TaskCounter = ({ label, count, color }: TaskCounterProps) => {
  return (
    <div
      className={`${colorMap[color]} rounded border p-3 flex justify-between items-center`}
    >
      <span className="text-sm text-black/62">{label}</span>
      <span className={`font-normal text-lg ${colorMap[color].split(" ")[2]}`}>
        {count}
      </span>
    </div>
  );
};
