import React from "react";
import { Clock, PlayCircle, CheckCircle, AlertCircle } from "lucide-react";
import { useDashboardStore } from "@/store/dashboardStore";

const StatusCards = () => {
  const { data } = useDashboardStore();

  const cards = [
    {
      label: "Pending",
      count: data.pending,
      icon: Clock,
      color: "from-purple-500/20 to-purple-600/20",
      iconColor: "text-purple-400",
    },
    {
      label: "In Progress",
      count: data.inProgress,
      icon: PlayCircle,
      color: "from-blue-500/20 to-blue-600/20",
      iconColor: "text-blue-400",
    },
    {
      label: "Completed",
      count: data.completed,
      icon: CheckCircle,
      color: "from-green-500/20 to-green-600/20",
      iconColor: "text-green-400",
    },
    {
      label: "Overdue",
      count: data.overdue,
      icon: AlertCircle,
      color: "from-red-500/20 to-red-600/20",
      iconColor: "text-red-400",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4 h-full">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`bg-gradient-to-br ${card.color} backdrop-blur rounded-xl p-4 border border-white/10 flex flex-col justify-between`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-black/62">{card.label}</p>
                <p className="text-3xl font-normal text-black/62 mt-1">
                  {card.count}
                </p>
              </div>
              <Icon size={24} className={card.iconColor} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatusCards;
