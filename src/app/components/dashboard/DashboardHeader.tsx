import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Clock } from "lucide-react";

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
    <div className="bg-white/10 backdrop-blur rounded-xl p-6 h-medium flex flex-col justify-between">
      <div>
        <p className="text-3xl font-semibold text-black">{formattedDate}</p>
        <p className="text-black-300 text-sm mt-1">{dayName}</p>
      </div>
      <div className="flex items-center gap-2 text-black-300">
        <Clock size={18} />
        <span className="text-sm">{currentTime || "Loading..."}</span>
      </div>
    </div>
  );
};

export default DashboardHeader;
