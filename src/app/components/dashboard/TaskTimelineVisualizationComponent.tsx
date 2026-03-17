import React, { useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  getDay,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Circle,
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

  const handleResetToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDay(null);
    setSelectedDayTasks([]);
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
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

  const currentYearRange = Array.from(
    { length: 7 },
    (_, i) => today.getFullYear() - 3 + i,
  );

  const statusStyles = {
    pending: "bg-indigo-50 hover:bg-indigo-100 border-indigo-200",
    inProgress: "bg-blue-50 hover:bg-blue-100 border-blue-200",
    overdue: "bg-red-50 hover:bg-red-100 border-red-200",
    completed: "bg-green-50 hover:bg-green-100 border-green-200",
  } as const;

  const getDayStatus = (
    tasks: any[] | undefined,
  ): keyof typeof statusStyles | null => {
    if (!tasks?.length) return null;
    if (tasks.some((t) => t.status === "completed" || t.status === "done"))
      return "completed";
    if (
      tasks.some((t) => t.status === "inprogress" || t.status === "in-progress")
    )
      return "inProgress";
    if (tasks.some((t) => t.status === "todo" || t.status === "pending"))
      return "pending";
    return "overdue";
  };

  return (
    <div
      className="
        bg-white
        border border-gray-200
        rounded-xl
        shadow-sm
        overflow-hidden
        h-full
        flex
        flex-col
      "
    >
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <h2 className="text-base font-medium text-gray-800">Task Timeline</h2>

        <div className="flex items-center gap-1.5">
          <select
            value={currentMonth}
            onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
            className="
              px-2.5 py-1 text-xs rounded-md border border-gray-200
              bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400
            "
          >
            {months.map((m, i) => (
              <option key={i} value={i}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={currentYear}
            onChange={(e) => setCurrentYear(parseInt(e.target.value))}
            className="
              px-2.5 py-1 text-xs rounded-md border border-gray-200
              bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400
            "
          >
            {currentYearRange.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <button
            onClick={handleResetToToday}
            className="
              px-2.5 py-1 text-xs rounded-md border border-gray-200
              bg-white hover:bg-gray-100 text-gray-700 transition-colors
            "
          >
            Today
          </button>

          <div className="flex items-center gap-0.5">
            <button
              onClick={handlePrevMonth}
              className="p-1 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ChevronLeft size={14} className="text-gray-600" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ChevronRight size={14} className="text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-[10px] font-medium text-gray-500 text-center py-1"
          >
            {day.slice(0, 3)}
          </div>
        ))}
      </div>

      {/* Calendar grid – smaller cells */}
      <div className="grid grid-cols-7 gap-0 p-0 flex-1 overflow-hidden">
        {/* Empty cells */}
        {Array.from({ length: firstDay.getDay() }).map((_, i) => (
          <div key={`empty-${i}`} className="flex-1" />
        ))}

        {/* Days */}
        {daysInMonth.map((day) => {
          const dayNum = day.getDate();
          const isToday = isSameDay(day, today);
          const isWeekend = getDay(day) === 0 || getDay(day) === 6;
          const dayTasks =
            calendarTasks.find((t) => t.date === dayNum)?.tasks || [];
          const hasTasks = dayTasks.length > 0;
          const isSelected = selectedDay === dayNum;

          const status = getDayStatus(dayTasks);

          let baseClass = hasTasks
            ? "bg-green-100 hover:bg-green-200 border-green-200"
            : isWeekend
              ? "bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
              : "bg-white hover:bg-gray-50 border-gray-200 text-gray-700";

          const statusClass = status ? statusStyles[status] : "";

          const cellClass = isToday
            ? "border-2 border-blue-400 bg-blue-50 font-semibold text-blue-900"
            : hasTasks
              ? `${baseClass} ${statusClass} border ${isSelected ? "ring-1 ring-blue-400" : ""}`
              : baseClass;

          const iconMap = {
            pending: <Circle size={12} className="text-indigo-500" />,
            inProgress: <Clock size={12} className="text-blue-500" />,
            overdue: <AlertCircle size={12} className="text-red-500" />,
            completed: <CheckCircle2 size={12} className="text-green-500" />,
          };

          return (
            <button
              key={day.toISOString()}
              onClick={() => {
                if (hasTasks) {
                  setSelectedDay(dayNum);
                  setSelectedDayTasks(dayTasks);
                }
              }}
              disabled={!hasTasks}
              className={`
                relative flex flex-col items-center justify-center
                text-xs font-medium border transition-all duration-150
                ${cellClass}
                ${hasTasks ? "cursor-pointer hover:shadow-sm" : "cursor-default"}
              `}
            >
              <span className="text-sm font-semibold">{dayNum}</span>

              {hasTasks && status && (
                <div className="absolute top-1 right-1">{iconMap[status]}</div>
              )}

              {hasTasks && (
                <span className="absolute bottom-1 text-[9px] font-medium text-gray-700 bg-white/80 px-1.5 py-0.5 rounded-full shadow-sm">
                  {dayTasks.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Day Detail Panel */}
      {selectedDay !== null && selectedDayTasks.length > 0 && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => {
              setSelectedDay(null);
              setSelectedDayTasks([]);
            }}
          />
          <div
            className="
              fixed inset-x-4 bottom-4 sm:inset-auto sm:top-1/2 sm:left-1/2
              sm:-translate-x-1/2 sm:-translate-y-1/2
              z-50 max-w-md w-full sm:w-96
              bg-white border border-gray-200 rounded-xl shadow-xl
              overflow-hidden
            "
          >
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h3 className="text-base font-medium text-gray-900">
                {format(
                  new Date(currentYear, currentMonth, selectedDay),
                  "EEEE, MMM d",
                )}
              </h3>
              <button
                onClick={() => {
                  setSelectedDay(null);
                  setSelectedDayTasks([]);
                }}
                className="text-gray-500 hover:text-gray-800 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-3 max-h-[60vh] overflow-y-auto space-y-2">
              {selectedDayTasks.map((task) => (
                <div
                  key={task.id}
                  className="
                    bg-gray-50 hover:bg-gray-100
                    rounded-lg p-3 border border-gray-200
                    transition-colors cursor-pointer
                  "
                >
                  <div className="font-medium text-gray-900 mb-1 text-sm">
                    {task.title}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {task.priority && (
                      <span
                        className={`
                          px-2 py-0.5 rounded-full font-medium text-xs
                          ${
                            task.priority === "high"
                              ? "bg-red-100 text-red-700"
                              : task.priority === "medium"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-green-100 text-green-700"
                          }
                        `}
                      >
                        {task.priority}
                      </span>
                    )}
                    {task.status && (
                      <span
                        className={`
                          px-2 py-0.5 rounded-full font-medium text-xs
                          ${
                            task.status?.includes("done") ||
                            task.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : task.status?.includes("progress")
                                ? "bg-blue-100 text-blue-700"
                                : "bg-indigo-100 text-indigo-700"
                          }
                        `}
                      >
                        {task.status === "todo"
                          ? "To Do"
                          : task.status === "inprogress"
                            ? "In Progress"
                            : task.status === "completed"
                              ? "Done"
                              : task.status}
                      </span>
                    )}
                  </div>
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
