"use client";

import React, { useState, useRef, useEffect } from "react";
import { format, parse } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ScrollableNumberPickerProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}

function ScrollableNumberPicker({
  value,
  min,
  max,
  step = 1,
  onChange,
}: ScrollableNumberPickerProps) {
  const handleDecrement = () => {
    let newValue = value - step;
    if (newValue < min) {
      newValue = max;
    }
    onChange(newValue);
  };

  const handleIncrement = () => {
    let newValue = value + step;
    if (newValue > max) {
      newValue = min;
    }
    onChange(newValue);
  };

  return (
    <div className="w-full h-[40px] border border-black/10 bg-blue-100/50 rounded-sm overflow-hidden flex items-center justify-center relative select-none">
      {/* Center highlight */}
      <div className="absolute inset-y-0 left-1/2 w-10 border border-blue-400/30 rounded-sm -translate-x-1/2 pointer-events-none z-10" />

      {/* Numbers display with buttons */}
      <div className="flex flex-row items-center justify-center gap-4 z-20 relative">
        {/* Decrease button */}
        <button
          type="button"
          onClick={handleDecrement}
          className="p-0.5 text-black/70 hover:text-blue-600 transition-colors flex-shrink-0"
        >
          <ChevronLeft size={18} />
        </button>

        {/* Current number (highlighted) */}
        <div className="text-lg font-bold text-blue-600 leading-none flex items-center justify-center w-8">
          {String(value).padStart(2, "0")}
        </div>

        {/* Increase button */}
        <button
          type="button"
          onClick={handleIncrement}
          className="p-0.5 text-black/70 hover:text-blue-600 transition-colors flex-shrink-0"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

interface DatePickerInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export function DatePickerInput({
  value,
  onChange,
  placeholder = "Select date and time...",
  required = false,
  disabled = false,
}: DatePickerInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [displayDate, setDisplayDate] = useState<Date | null>(null);
  const [hours, setHours] = useState("12");
  const [minutes, setMinutes] = useState("00");
  const [period, setPeriod] = useState<"AM" | "PM">("AM");
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize from value
  useEffect(() => {
    if (value) {
      try {
        const date = new Date(value);
        setDisplayDate(date);
        const hour24 = date.getHours();
        const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
        const newPeriod = hour24 >= 12 ? "PM" : "AM";
        setHours(String(hour12).padStart(2, "0"));
        setMinutes(String(date.getMinutes()).padStart(2, "0"));
        setPeriod(newPeriod);
      } catch (e) {
        console.error("Invalid date:", e);
      }
    }
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleDateChange = (date: Date) => {
    const newDate = new Date(date);
    const hour24 =
      period === "PM"
        ? parseInt(hours) === 12
          ? 12
          : parseInt(hours) + 12
        : parseInt(hours) === 12
          ? 0
          : parseInt(hours);
    newDate.setHours(hour24, parseInt(minutes), 0, 0);
    setDisplayDate(newDate);
    onChange(newDate.toISOString());
  };

  const handleTimeChange = (
    newHours: string,
    newMinutes: string,
    newPeriod?: "AM" | "PM",
  ) => {
    setHours(newHours);
    setMinutes(newMinutes);
    if (newPeriod) setPeriod(newPeriod);

    if (displayDate) {
      const newDate = new Date(displayDate);
      const finalPeriod = newPeriod || period;
      const hour24 =
        finalPeriod === "PM"
          ? parseInt(newHours) === 12
            ? 12
            : parseInt(newHours) + 12
          : parseInt(newHours) === 12
            ? 0
            : parseInt(newHours);
      newDate.setHours(hour24, parseInt(newMinutes), 0, 0);
      setDisplayDate(newDate);
      onChange(newDate.toISOString());
    }
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const currentDate = displayDate || new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const monthName = format(currentDate, "MMMM yyyy");
  const displayValue = displayDate
    ? format(displayDate, "MMM dd, yyyy • hh:mm a")
    : "";

  const handlePrevMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setDisplayDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setDisplayDate(newDate);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-3 py-2 rounded-sm border border-black/10 bg-blue-100/50 text-sm text-left font-medium transition-all duration-200 ${
          displayValue ? "text-black/80" : "text-black/40"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-black/20 hover:bg-blue-100/70"}`}
      >
        {displayValue || placeholder}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1001]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-blue-100/95 backdrop-blur-lg border border-black/20 rounded-sm p-6 w-[90%] max-w-lg">
            {/* Calendar Header */}
            <div className="flex justify-between items-center mb-5 pb-4 border-b border-black/10">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="px-3 py-2 rounded-sm bg-blue-200/30 border border-black/10 text-black/80 text-base font-medium cursor-pointer hover:bg-blue-200/50 transition-colors"
              >
                ←
              </button>
              <div className="flex gap-3 items-center">
                <select
                  value={currentDate.getMonth()}
                  onChange={(e) => {
                    const newDate = new Date(currentDate);
                    newDate.setMonth(parseInt(e.target.value));
                    setDisplayDate(newDate);
                  }}
                  className="px-3 py-2 rounded-sm border border-black/10 bg-blue-100/50 text-black/80 text-base font-medium cursor-pointer hover:border-black/20"
                >
                  {[
                    "Jan",
                    "Feb",
                    "Mar",
                    "Apr",
                    "May",
                    "Jun",
                    "Jul",
                    "Aug",
                    "Sep",
                    "Oct",
                    "Nov",
                    "Dec",
                  ].map((month, idx) => (
                    <option key={idx} value={idx}>
                      {month}
                    </option>
                  ))}
                </select>
                <select
                  value={currentDate.getFullYear()}
                  onChange={(e) => {
                    const newDate = new Date(currentDate);
                    newDate.setFullYear(parseInt(e.target.value));
                    setDisplayDate(newDate);
                  }}
                  className="px-3 py-2 rounded-sm border border-black/10 bg-blue-100/50 text-black/80 text-base font-medium cursor-pointer hover:border-black/20 hover:bg-blue-100/70"
                >
                  {Array.from(
                    { length: 10 },
                    (_, i) => new Date().getFullYear() - 5 + i,
                  ).map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={handleNextMonth}
                className="px-3 py-2 rounded-sm bg-blue-200/30 border border-black/10 text-black/80 text-base font-medium cursor-pointer hover:bg-blue-200/50 transition-colors"
              >
                →
              </button>
            </div>

            {/* Quick Shortcuts */}
            <div className="mb-4 flex justify-center">
              {[
                {
                  label: "Reset Date",
                  fn: () => {
                    const today = new Date();
                    setDisplayDate(today);
                    handleDateChange(today);
                  },
                },
              ].map((shortcut) => (
                <button
                  key={shortcut.label}
                  type="button"
                  onClick={shortcut.fn}
                  className="px-12 py-2 rounded-sm bg-blue-600 text-white text-xs cursor-pointer hover:bg-blue-700 transition-colors"
                >
                  {shortcut.label}
                </button>
              ))}
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-3">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-semibold text-black/60 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-2 mb-5 pb-5 border-b border-white/10">
              {days.map((day, index) => {
                const isSelectedDay =
                  displayDate &&
                  day &&
                  day === displayDate.getDate() &&
                  month === displayDate.getMonth() &&
                  year === displayDate.getFullYear();

                return (
                  <button
                    key={index}
                    type="button"
                    disabled={!day}
                    onClick={() => {
                      if (day) {
                        const newDate = new Date(year, month, day);
                        handleDateChange(newDate);
                      }
                    }}
                    className={`py-2 rounded-sm text-sm font-medium transition-all ${
                      !day
                        ? "text-black/20 cursor-default"
                        : isSelectedDay
                          ? "bg-blue-400/30 border border-blue-400/50 text-white"
                          : "text-black/80 hover:bg-black/5"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Time Picker */}
            <div className="flex gap-2 items-center mb-5 justify-center">
              <div className="w-28">
                <label className="block text-sm text-black/60 mb-2 font-semibold">
                  Hour
                </label>
                <ScrollableNumberPicker
                  value={parseInt(hours)}
                  min={1}
                  max={12}
                  onChange={(value) =>
                    handleTimeChange(String(value).padStart(2, "0"), minutes)
                  }
                />
              </div>
              <div className="w-28">
                <label className="block text-xs text-black/60 mb-1 font-semibold">
                  Minute
                </label>
                <ScrollableNumberPicker
                  value={parseInt(minutes)}
                  min={0}
                  max={59}
                  step={1}
                  onChange={(value) =>
                    handleTimeChange(hours, String(value).padStart(2, "0"))
                  }
                />
              </div>
              <div className="flex-shrink-0">
                <label className="block text-sm text-black/60 mb-2 font-semibold">
                  Period
                </label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleTimeChange(hours, minutes, "AM")}
                    className={`flex-1 px-2 py-1 rounded-sm border text-xs font-semibold transition-all ${
                      period === "AM"
                        ? "bg-blue-400/30 border-blue-400/50 text-white"
                        : "bg-blue-100/50 border-black/10 text-black/80 hover:border-black/20"
                    }`}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTimeChange(hours, minutes, "PM")}
                    className={`flex-1 px-2 py-1 rounded-sm border text-xs font-semibold transition-all ${
                      period === "PM"
                        ? "bg-blue-400/30 border-blue-400/50 text-white"
                        : "bg-blue-100/50 border-black/10 text-black/80 hover:border-black/20"
                    }`}
                  >
                    PM
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end mt-6 pt-5 border-t border-black/10">
              <button
                type="button"
                onClick={() => {
                  setDisplayDate(null);
                  onChange("");
                  setIsOpen(false);
                }}
                className="px-12 py-2 rounded-sm border border-black/10 bg-blue-100/50 text-black text-xs hover:bg-blue-100/70 hover:border-black/20 transition-colors"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-12 py-2 rounded-sm bg-blue-600 text-white text-xs hover:bg-blue-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
