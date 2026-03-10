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
      className={`bg-blue-100 backdrop-blur-lg border border-black/10 rounded-sm p-4 pt-2 flex-1 flex flex-col justify-between h-full transition-all duration-200 w-auto min-w-[136px] hover:border-black/50`}
    >
      <div className="flex w-full items-start gap-1">
        <Icon size={16} className={`${iconColor} flex-shrink-0`} />
        <p className="text-xs text-black/62">{label}</p>
      </div>
      <div className="w-full flex items-center justify-center mt-4">
        <div className="bg-black/5 border border-black/10 rounded-sm px-8 py-0 backdrop-blur-sm">
          <p className="text-3xl font-semibold text-black text-center">
            {count}
          </p>
        </div>
      </div>
    </div>
  );
};

export default StatusCards;
