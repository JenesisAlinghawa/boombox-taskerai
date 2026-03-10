import React from "react";

interface TaskCounterProps {
  label: string;
  value: number;
  icon?: React.ReactNode;
}

export function TaskCounter({ label, value, icon }: TaskCounterProps) {
  return (
    <div className="bg-gray-800 border border-white/10 rounded-md p-4 flex items-center gap-3">
      {icon && <div className="text-blue-400 text-2xl">{icon}</div>}
      <div>
        <div className="text-sm text-white/60">{label}</div>
        <div className="text-2xl font-semibold text-white">{value}</div>
      </div>
    </div>
  );
}
