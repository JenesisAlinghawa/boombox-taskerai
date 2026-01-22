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
      className={`bg-gradient-to-br ${color} backdrop-blur rounded-xl p-4 border border-white/10 flex flex-col justify-between h-full`}
    >
      <div className="flex min-w-[134px] max-w-[220px] lg:w-[100%] items-start justify-between">
        <div>
          <p className="text-sm text-black/62">{label}</p>
          <p className="text-3xl font-normal text-black/62 mt-1">{count}</p>
        </div>
        <Icon size={24} className={iconColor} />
      </div>
    </div>
  );
};

export default StatusCards;
