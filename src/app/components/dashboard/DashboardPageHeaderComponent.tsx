import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { getCurrentUser } from "@/utils/sessionManager";

const DashboardHeader = () => {
  const [currentTime, setCurrentTime] = useState<string>("");
  const [userName, setUserName] = useState<string>("User");
  const [userTimezone, setUserTimezone] = useState<string>("");
  const [greeting, setGreeting] = useState<string>("Good morning");

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          const firstName = user.firstName || "User";
          setUserName(firstName);
        }
      } catch (error) {
        console.error("Failed to load user data:", error);
      }
    };

    loadUserData();
  }, []);

  useEffect(() => {
    // Detect user's timezone from browser
    const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setUserTimezone(detectedTz);
  }, []);

  useEffect(() => {
    // Update time and greeting periodically
    const updateTime = () => {
      const now = new Date();

      // Update greeting based on time of day
      const hours = now.getHours();
      if (hours < 12) {
        setGreeting("Good morning");
      } else if (hours < 18) {
        setGreeting("Good afternoon");
      } else {
        setGreeting("Good evening");
      }

      // Format time in user's timezone
      if (userTimezone) {
        const timeString = formatInTimeZone(now, userTimezone, "h:mm a");
        setCurrentTime(timeString);
      } else {
        setCurrentTime(format(now, "h:mm a"));
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [userTimezone]);

  // Get current date for the date range
  const today = new Date();
  const startDate = new Date(today);
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 2); // Show 2 days ahead

  const startDay = format(startDate, "MM/dd");
  const startDayName = format(startDate, "EEE").toUpperCase();
  const startTime = formatInTimeZone(startDate, userTimezone || "UTC", "HH:mm");

  const endDay = format(endDate, "MM/dd");
  const endDayName = format(endDate, "EEE").toUpperCase();
  const endTime = formatInTimeZone(endDate, userTimezone || "UTC", "HH:mm");

  const year = format(startDate, "yyyy");

  // Get timezone abbreviation for display (only if timezone is set)
  let tzAbbr: string | undefined;
  if (userTimezone) {
    try {
      tzAbbr = new Intl.DateTimeFormat("en-US", {
        timeZoneName: "short",
        timeZone: userTimezone,
      })
        .formatToParts(new Date())
        .find((part) => part.type === "timeZoneName")?.value;
    } catch (error) {
      console.error("Error getting timezone abbreviation:", error);
      tzAbbr = undefined;
    }
  }

  return (
    <div
      className="
        bg-white
        border border-gray-200
        rounded-xl
        shadow-sm
        p-4
        flex
        flex-col
        sm:flex-row
        sm:items-center
        sm:justify-between
        gap-4
        transition-all
        duration-200
        hover:shadow-md
      "
    >
      {/* Greeting on left */}
      <div className="flex flex-col gap-0.5">
        <h1 className="text-2xl font-medium text-gray-900">
          {greeting}, {userName}!
        </h1>
      </div>

      {/* Date range bar in the center/right */}
      <div
        className="
          bg-gray-50
          border border-gray-200
          rounded-full
          px-5 py-2.5
          flex
          items-center
          gap-4
          text-sm
          font-medium
          text-gray-700
          whitespace-nowrap
          overflow-hidden
        "
      >
        <div className="flex items-center gap-2">
          <span>{startDay}</span>
          <span className="text-gray-500">{startDayName}</span>
        </div>

        <span className="text-xs text-gray-400">{startTime}</span>

        <div className="flex items-center gap-3 text-orange-500 font-semibold">
          <span className="text-base">{year}</span>
          <span className="text-gray-300">—</span>
        </div>

        <div className="flex items-center gap-2">
          <span>{endDay}</span>
          <span className="text-gray-500">{endDayName}</span>
        </div>

        <span className="text-xs text-gray-400">{endTime}</span>
      </div>

      {/* Current time on far right */}
      <div className="text-right min-w-[120px]">
        <span className="text-2xl font-light text-gray-800 tracking-wide">
          {currentTime || "— : — —"}
        </span>
        <p className="text-xs text-gray-500 mt-0.5">
          {tzAbbr || userTimezone || "Local Time"}
        </p>
      </div>
    </div>
  );
};

export default DashboardHeader;
