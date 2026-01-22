"use client";

import React, { useState, useRef, useEffect } from "react";
import { format, parse } from "date-fns";

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
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        style={{
          width: "100%",
          padding: "10px 10px 10px 10px",
          borderRadius: 6,
          border: "1px solid rgba(0,0,0,0.1)",
          background: "rgba(0,0,0,0.03)",
          color: displayValue ? "#ffffff" : "rgba(255,255,255,0.6)",
          fontSize: 13,
          boxSizing: "border-box",
          cursor: disabled ? "not-allowed" : "pointer",
          textAlign: "left",
          fontWeight: 500,
          opacity: disabled ? 0.5 : 1,
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          if (!disabled) {
            (e.target as HTMLElement).style.borderColor =
              "rgba(59, 130, 246, 0.5)";
            (e.target as HTMLElement).style.background = "rgba(0,0,0,0.06)";
          }
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLElement).style.borderColor = "rgba(0,0,0,0.1)";
          (e.target as HTMLElement).style.background = "rgba(0,0,0,0.03)";
        }}
      >
        {displayValue || placeholder}
      </button>

      {isOpen && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "#1a1a2e",
            borderRadius: 8,
            border: "1px solid rgba(59, 130, 246, 0.3)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
            zIndex: 1001,
            padding: "16px 16px 16px 16px",
            width: "90%",
            maxWidth: 400,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Calendar Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
              paddingBottom: 12,
              borderBottom: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <button
              type="button"
              onClick={handlePrevMonth}
              style={{
                background: "rgba(59, 130, 246, 0.2)",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                color: "#3b82f6",
                borderRadius: 4,
                padding: "6px 8px 6px 8px",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              ← Prev
            </button>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#ffffff",
              }}
            >
              {monthName}
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              style={{
                background: "rgba(59, 130, 246, 0.2)",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                color: "#3b82f6",
                borderRadius: 4,
                padding: "6px 8px 6px 8px",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Next →
            </button>
          </div>

          {/* Day Headers */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 4,
              marginBottom: 8,
            }}
          >
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                style={{
                  textAlign: "center",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.6)",
                  padding: "4px 0 4px 0",
                }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 4,
              marginBottom: 16,
              paddingBottom: 16,
              borderBottom: "1px solid rgba(255,255,255,0.1)",
            }}
          >
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
                  style={{
                    padding: "6px 4px 6px 4px",
                    borderRadius: 4,
                    border: isSelectedDay
                      ? "1px solid #3b82f6"
                      : "1px solid transparent",
                    background: isSelectedDay
                      ? "rgba(59, 130, 246, 0.2)"
                      : day
                        ? "transparent"
                        : "transparent",
                    color: day ? "#ffffff" : "rgba(255,255,255,0.2)",
                    cursor: day ? "pointer" : "default",
                    fontSize: 12,
                    fontWeight: day ? 500 : 400,
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (day && !isSelectedDay) {
                      (e.target as HTMLElement).style.background =
                        "rgba(255,255,255,0.1)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (day && !isSelectedDay) {
                      (e.target as HTMLElement).style.background =
                        "transparent";
                    }
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Time Picker */}
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            <div style={{ flex: 1 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  color: "rgba(255,255,255,0.6)",
                  marginBottom: 4,
                  fontWeight: 600,
                }}
              >
                Hour
              </label>
              <input
                type="number"
                min="1"
                max="12"
                value={hours}
                onChange={(e) =>
                  handleTimeChange(
                    String(
                      Math.min(12, Math.max(1, parseInt(e.target.value) || 1)),
                    ).padStart(2, "0"),
                    minutes,
                  )
                }
                style={{
                  width: "100%",
                  padding: "6px 6px 6px 6px",
                  borderRadius: 4,
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  background: "rgba(0,0,0,0.1)",
                  color: "#ffffff",
                  fontSize: 12,
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  color: "rgba(255,255,255,0.6)",
                  marginBottom: 4,
                  fontWeight: 600,
                }}
              >
                Minute
              </label>
              <input
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) =>
                  handleTimeChange(
                    hours,
                    String(
                      Math.min(59, Math.max(0, parseInt(e.target.value) || 0)),
                    ).padStart(2, "0"),
                  )
                }
                style={{
                  width: "100%",
                  padding: "6px 6px 6px 6px",
                  borderRadius: 4,
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  background: "rgba(0,0,0,0.1)",
                  color: "#ffffff",
                  fontSize: 12,
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ flex: 0.8 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  color: "rgba(255,255,255,0.6)",
                  marginBottom: 4,
                  fontWeight: 600,
                }}
              >
                Period
              </label>
              <div
                style={{
                  display: "flex",
                  gap: 4,
                }}
              >
                <button
                  type="button"
                  onClick={() => handleTimeChange(hours, minutes, "AM")}
                  style={{
                    flex: 1,
                    padding: "6px 0",
                    borderRadius: 4,
                    border:
                      period === "AM"
                        ? "1px solid #3b82f6"
                        : "1px solid rgba(59, 130, 246, 0.3)",
                    background:
                      period === "AM"
                        ? "rgba(59, 130, 246, 0.2)"
                        : "rgba(0,0,0,0.1)",
                    color: "#ffffff",
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => handleTimeChange(hours, minutes, "PM")}
                  style={{
                    flex: 1,
                    padding: "6px 0",
                    borderRadius: 4,
                    border:
                      period === "PM"
                        ? "1px solid #3b82f6"
                        : "1px solid rgba(59, 130, 246, 0.3)",
                    background:
                      period === "PM"
                        ? "rgba(59, 130, 246, 0.2)"
                        : "rgba(0,0,0,0.1)",
                    color: "#ffffff",
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  PM
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 12,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setDisplayDate(null);
                onChange("");
                setIsOpen(false);
              }}
              style={{
                flex: 1,
                padding: "6px 8px 6px 8px",
                borderRadius: 4,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "transparent",
                color: "#ffffff",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                flex: 1,
                padding: "6px 8px 6px 8px",
                borderRadius: 4,
                border: "none",
                background: "#3b82f6",
                color: "#ffffff",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
