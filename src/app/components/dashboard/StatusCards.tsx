import React from "react";
import { Clock, PlayCircle, CheckCircle, AlertCircle } from "lucide-react";

interface StatusCardsProps {
  count: number;
  label: string;
  icon: "clock" | "play" | "check" | "alert";
  color: string;
}

const StatusCards = ({ count, label, icon, color }: StatusCardsProps) => {
  const iconMap = {
    clock: Clock,
    play: PlayCircle,
    check: CheckCircle,
    alert: AlertCircle,
  };

  const colorMap = {
    clock: "text-purple-400",
    play: "text-blue-400",
    check: "text-green-400",
    alert: "text-red-400",
  };

  const Icon = iconMap[icon];
  const iconColor = colorMap[icon];

  return (
    <div
      className={`bg-blue-400/10 backdrop-blur-lg border border-white/10 rounded-sm shadow-lg p-4 flex-1 flex-col justify-between h-full transition-all duration-300 w-auto min-w-[136px]`}
    >
      <div className="flex w-full items-center justify-center gap-4">
        <Icon size={28} className={iconColor} />
        <div>
          <p className="text-sm text-white/62">{label}</p>
          <p className="text-3xl font-normal text-white/62 mt-1 pl-0">{count}</p>
        </div>
      </div>
    </div>
  );
};

export default StatusCards;
