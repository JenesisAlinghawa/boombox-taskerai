import React, { useState, useEffect } from "react";
import { format } from "date-fns";

const Clock = () => {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!time) {
    return (
      <div className="relative w-16 h-16 rounded-full bg-black/10 backdrop-blur-md border border-black/20 flex items-center justify-center"></div>
    );
  }

  const hours = time.getHours() % 12;
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();

  const hourRotation = hours * 30 + minutes * 0.5;
  const minuteRotation = minutes * 6 + seconds * 0.1;
  const secondRotation = seconds * 6;

  return (
    <div className="relative w-16 h-16 rounded-full bg-black/10 backdrop-blur-md border border-black/20 flex items-center justify-center">
      {/* Center dot */}
      <div className="absolute w-1 h-1 bg-gradient-to-r from-gray-400 to-gray-600 rounded-full z-10"></div>

      {/* Hour hand */}
      <div
        className="absolute w-0.5 h-4 bg-gradient-to-t from-gray-400 to-gray-300 rounded-full origin-bottom left-1/2"
        style={{
          transform: `translateX(-50%) rotate(${hourRotation}deg)`,
          bottom: "50%",
        }}
      ></div>

      {/* Minute hand */}
      <div
        className="absolute w-0.5 h-5 bg-gradient-to-t from-gray-300 to-gray-200 rounded-full origin-bottom left-1/2"
        style={{
          transform: `translateX(-50%) rotate(${minuteRotation}deg)`,
          bottom: "50%",
        }}
      ></div>

      {/* Second hand */}
      <div
        className="absolute w-0.5 h-6 bg-gray-500 rounded-full origin-bottom left-1/2"
        style={{
          transform: `translateX(-50%) rotate(${secondRotation}deg)`,
          bottom: "50%",
        }}
      ></div>

      {/* Hour markers */}
      <div className="absolute inset-0 flex items-center justify-center">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
          <div
            key={i}
            className="absolute w-0.5 h-1 bg-gray-600/20 rounded"
            style={{
              transform: `rotate(${i * 30}deg) translateY(-26px)`,
            }}
          ></div>
        ))}
      </div>
    </div>
  );
};

const DashboardHeader = () => {
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(format(now, "h:mm a"));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const today = new Date();
  const formattedDate = format(today, "MMMM d, yyyy");
  const dayName = format(today, "EEEE");

  return (
    <div className="bg-blue-100 backdrop-blur-lg border border-black/10 rounded-sm p-4 pl-10 h-medium flex flex-row justify-between items-start transition-all duration-200 hover:border-black/50">
      <div>
        <p className="text-2xl font-normal text-black/80">{formattedDate}</p>
        <p className="text-black font-normal text-md pl-4 mt-1">{dayName}</p>
      </div>
      <div className="flex items-center gap-4 text-black/60">
        <Clock />
        <span className="text-2xl text-black/80 font-normal pl-5 pr-10 tracking-widest">
          {currentTime || "Loading..."}
        </span>
      </div>
    </div>
  );
};

export default DashboardHeader;
