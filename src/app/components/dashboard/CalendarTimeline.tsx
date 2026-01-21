"use client";

import React, { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarTask {
  date: number;
  taskCount: number;
}

interface CalendarTimelineProps {
  month: number;
  year: number;
  tasks: CalendarTask[];
  currentDay: number;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
}

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const dayNames = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export const CalendarTimeline: React.FC<CalendarTimelineProps> = ({
  month,
  year,
  tasks,
  currentDay,
  onPrevMonth,
  onNextMonth,
}) => {
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const prevLastDay = new Date(year, month, 0).getDate();

    const days = [];

    // Previous month's days
    for (let i = firstDay === 0 ? 6 : firstDay - 1; i > 0; i--) {
      days.push({ date: prevLastDay - i + 1, isCurrentMonth: false });
    }

    // Current month's days
    for (let i = 1; i <= lastDay; i++) {
      days.push({ date: i, isCurrentMonth: true });
    }

    // Next month's days
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: i, isCurrentMonth: false });
    }

    return days;
  }, [month, year]);

  const taskMap = useMemo(() => {
    const map = new Map<number, number>();
    tasks.forEach((task) => {
      map.set(task.date, (map.get(task.date) || 0) + task.taskCount);
    });
    return map;
  }, [tasks]);

  return (
    <div className="w-full space-y-4">
      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">
          {monthNames[month]} {year}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={onPrevMonth}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <ChevronLeft size={18} className="text-gray-400" />
          </button>
          <button
            onClick={onNextMonth}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <ChevronRight size={18} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1">
        {dayNames.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-semibold text-gray-400 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, idx) => {
          const isCurrentDay = day.isCurrentMonth && day.date === currentDay;
          const taskCount = taskMap.get(day.date) || 0;
          const hasTask = taskCount > 0;

          return (
            <div
              key={idx}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-medium cursor-pointer transition-all ${
                isCurrentDay
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/50"
                  : day.isCurrentMonth
                    ? "bg-gray-700/30 text-white hover:bg-gray-600/40"
                    : "text-gray-500 bg-gray-800/20"
              } ${hasTask ? "ring-1 ring-green-400" : ""}`}
            >
              <span>{day.date}</span>
              {hasTask && (
                <span className="text-xs text-green-300 font-semibold mt-1">
                  {taskCount}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
