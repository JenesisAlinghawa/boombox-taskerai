import React from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TaskTimelineProps {
  currentMonth: number;
  currentYear: number;
  setCurrentMonth: (month: number) => void;
  setCurrentYear: (year: number) => void;
  calendarTasks: Array<{
    date: number;
    taskCount: number;
  }>;
}

const TaskTimeline = ({
  currentMonth,
  currentYear,
  setCurrentMonth,
  setCurrentYear,
  calendarTasks,
}: TaskTimelineProps) => {
  const today = new Date();

  const firstDay = startOfMonth(new Date(currentYear, currentMonth));
  const lastDay = endOfMonth(new Date(currentYear, currentMonth));
  const daysInMonth = eachDayOfInterval({ start: firstDay, end: lastDay });

  // Create task date map for quick lookup
  const taskDates = new Set(calendarTasks.map((t) => t.date.toString()));

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="bg-white/10 backdrop-blur rounded-xl p-2 h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-black/62">Tasks Timeline</h2>
        <div className="flex gap-1">
          <button
            onClick={handlePrevMonth}
            className="p-1 hover:bg-white/20 rounded"
          >
            <ChevronLeft size={14} className="text-black/62" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1 hover:bg-white/20 rounded"
          >
            <ChevronRight size={14} className="text-black/62" />
          </button>
        </div>
      </div>

      <p className="text-xs text-black/62 mb-2">
        {format(new Date(currentYear, currentMonth), "MMMM yyyy")}
      </p>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {weekDays.map((day) => (
          <div key={day} className="text-xs text-black/62 text-center">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5 flex-1 auto-rows-fr">
        {/* Empty cells for days before month starts */}
        {Array.from({ length: firstDay.getDay() }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-white/5 rounded" />
        ))}

        {/* Days in month */}
        {daysInMonth.map((day) => {
          const hasTask = taskDates.has(day.getDate().toString());
          const isToday = isSameDay(day, today);

          return (
            <div
              key={day.toISOString()}
              className={`
                rounded flex items-center justify-center text-xs font-semibold
                ${isToday ? "bg-blue-500 text-black/62" : ""}
                ${hasTask && !isToday ? "bg-green-500/30 text-black/62" : ""}
                ${!isToday && !hasTask ? "bg-white/5 text-black/62" : ""}
              `}
            >
              {day.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TaskTimeline;
