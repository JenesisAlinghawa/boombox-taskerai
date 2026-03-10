import React, { useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Clock,
  PlayCircle,
} from "lucide-react";

interface TaskTimelineProps {
  currentMonth: number;
  currentYear: number;
  setCurrentMonth: (month: number) => void;
  setCurrentYear: (year: number) => void;
  calendarTasks: Array<{
    date: number;
    taskCount: number;
    tasks?: Array<{
      id: string;
      title: string;
      status?: string;
      priority?: string;
    }>;
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
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedDayTasks, setSelectedDayTasks] = useState<any[]>([]);

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
    <div className="bg-blue-100 backdrop-blur-lg border border-black/10 rounded-sm p-1 pl-4 pr-4 h-full flex flex-col transition-all duration-200 hover:transparent">
      <div className="flex items-center justify-between mb-0">
        <h2 className="text-xs font-normal text-black">Tasks Timeline</h2>
        <div className="flex gap-0">
          <p className="text-xs text-black/62 px-2 pt-2 text-center">
            {format(new Date(currentYear, currentMonth), "MMM yyyy")}
          </p>

          <button
            onClick={handlePrevMonth}
            className="p-1 hover:bg-blue-200/20 rounded-xl"
          >
            <ChevronLeft size={14} className="text-black/62" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1 hover:bg-blue-200/20 rounded-xl"
          >
            <ChevronRight size={14} className="text-black/62" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-0 mb-0">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-xs font-semibold text-black/62 text-center py-0"
          >
            {day.slice(0, 1)}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 flex-1 auto-rows-min overflow-visible">
        {/* Empty cells for days before month starts */}
        {Array.from({ length: firstDay.getDay() }).map((_, i) => (
          <div key={`empty-${i}`} className="border-black/10 pl-[-5]" />
        ))}

        {/* Days in month */}
        {daysInMonth.map((day) => {
          const hasTask = taskDates.has(day.getDate().toString());
          const isToday = isSameDay(day, today);
          const dayOfWeek = day.getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const dayTasks =
            calendarTasks.find((t) => t.date === day.getDate())?.tasks || [];
          const isSelected = selectedDay === day.getDate();

          // Determine status icon based on tasks
          const getStatusIcon = () => {
            if (!hasTask || dayTasks.length === 0) return null;

            const hasCompleted = dayTasks.some(
              (t) => t.status === "completed" || t.status === "done",
            );
            const hasInProgress = dayTasks.some(
              (t) => t.status === "inprogress" || t.status === "in-progress",
            );
            const hasTodo = dayTasks.some((t) => t.status === "todo");

            // Priority: show most critical status (same icons as TaskStatus cards)
            if (hasTodo) return <Clock size={12} className="text-black/70" />;
            if (hasInProgress)
              return <PlayCircle size={12} className="text-black/70" />;
            if (hasCompleted)
              return <CheckCircle size={12} className="text-black/70" />;
            return null;
          };

          const handleDayClick = () => {
            const tasks =
              calendarTasks.find((t) => t.date === day.getDate())?.tasks || [];
            if (hasTask && tasks.length > 0) {
              setSelectedDay(day.getDate());
              setSelectedDayTasks(tasks);
            }
          };

          return (
            <div key={day.toISOString()} onClick={handleDayClick}>
              <div
                className={`
                  flex items-center justify-center relative text-xs font-semibold pt-4 pb-4 transition-all duration-200 ${hasTask ? "cursor-pointer" : "cursor-default"}
                  ${isToday ? "border-2 border-white bg-blue-200 text-black/62" : "border border-transparent hover:border-2 hover:border-white"}
                  ${hasTask && !isToday ? `bg-green-300 text-black/62 ${isSelected ? "ring-2 ring-black" : ""}` : ""}
                  ${!hasTask && isWeekend ? "bg-red-200" : ""}
                  ${!isToday && !hasTask && !isWeekend ? "bg-blue-200 text-black/62" : ""}
                  ${!isToday && !hasTask && isWeekend ? "text-black/50" : ""}
                  rounded-lg
                `}
              >
                {day.getDate()}
                {hasTask && (
                  <div className="absolute top-1 right-1">
                    {getStatusIcon()}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Panel Modal - compact and aligned with component design */}
      {selectedDay !== null && selectedDayTasks.length > 0 && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => {
              setSelectedDay(null);
              setSelectedDayTasks([]);
            }}
          />
          {/* Compact Modern Card */}
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-blue-100 border border-black/10 rounded-sm p-3 backdrop-blur-lg max-w-xs w-80">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-xs font-semibold text-black">
                  {format(
                    new Date(currentYear, currentMonth, selectedDay),
                    "EEE, MMM d",
                  )}
                </h3>
              </div>
              <button
                onClick={() => {
                  setSelectedDay(null);
                  setSelectedDayTasks([]);
                }}
                className="text-black/60 hover:text-black/80 transition-colors text-lg leading-none"
              >
                ×
              </button>
            </div>

            {/* Tasks List */}
            <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
              {selectedDayTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-blue-200/50 hover:bg-blue-200 rounded p-2 transition-colors border border-black/10 text-xs"
                >
                  <div className="font-semibold text-black text-xs leading-tight mb-1">
                    {task.title}
                  </div>
                  {(task.priority || task.status) && (
                    <div className="flex gap-1 flex-wrap">
                      {task.priority && (
                        <span className="inline-block bg-blue-300/60 px-1.5 py-0.5 rounded text-xs text-black/70 font-medium">
                          {task.priority}
                        </span>
                      )}
                      {task.status && (
                        <span className="inline-block bg-green-300/60 px-1.5 py-0.5 rounded text-xs text-black/70 font-medium">
                          {task.status === "todo"
                            ? "To Do"
                            : task.status === "inprogress"
                              ? "In Progress"
                              : "Done"}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TaskTimeline;
