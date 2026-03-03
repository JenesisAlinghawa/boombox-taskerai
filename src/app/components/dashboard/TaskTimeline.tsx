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
    <div className="bg-blue-400/10 backdrop-blur-lg border border-white/10 rounded-sm shadow-lg shadow-white/30 p-4 pl-8 pr-8 h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-normal text-white/62">Tasks Timeline</h2>
        <div className="flex gap-0">
          <p className="text-m text-white/62 text-center">
            {format(new Date(currentYear, currentMonth), "MMMM yyyy")}
          </p>

          <button
            onClick={handlePrevMonth}
            className="p-1 hover:bg-white/20 rounded-xl"
          >
            <ChevronLeft size={14} className="text-white/62" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1 hover:bg-white/20 rounded-xl"
          >
            <ChevronRight size={14} className="text-white/62" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-0 mb-0">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-m font-semibold text-white/62 text-center"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0 flex-1 auto-rows-fr">
        {/* Empty cells for days before month starts */}
        {Array.from({ length: firstDay.getDay() }).map((_, i) => (
          <div key={`empty-${i}`} className="border-white/10 pl-[-5] " />
        ))}

        {/* Days in month */}
        {daysInMonth.map((day) => {
          const hasTask = taskDates.has(day.getDate().toString());
          const isToday = isSameDay(day, today);

          return (
            <div
              key={day.toISOString()}
              className={`
                border-black/20 shadow-sm  flex items-center justify-center text-m font-semibold
                ${isToday ? "bg-blue-500/30 text-white/62" : ""}
                ${hasTask && !isToday ? "bg-green-500/30 text-white/62" : ""}
                ${!isToday && !hasTask ? "bg-white/5 text-white/62" : ""}
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
