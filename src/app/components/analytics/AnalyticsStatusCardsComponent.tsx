"use client";

import React from "react";
import { Clock, Play, CheckCircle, AlertCircle } from "lucide-react";

interface Props {
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

export const AnalyticsStatusCards: React.FC<Props> = ({
  pending,
  inProgress,
  completed,
  overdue,
}) => {
  const cards = [
    {
      count: pending,
      label: "Pending",
      icon: Clock,
      bgColor: "bg-purple-100",
      textColor: "text-purple-700",
      iconColor: "text-purple-700",
    },
    {
      count: inProgress,
      label: "In Progress",
      icon: Play,
      bgColor: "bg-blue-100",
      textColor: "text-blue-700",
      iconColor: "text-blue-700",
    },
    {
      count: completed,
      label: "Completed",
      icon: CheckCircle,
      bgColor: "bg-green-100",
      textColor: "text-green-700",
      iconColor: "text-green-700",
    },
    {
      count: overdue,
      label: "Overdue",
      icon: AlertCircle,
      bgColor: "bg-red-100",
      textColor: "text-red-700",
      iconColor: "text-red-700",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            className={`${card.bgColor} rounded-xl border border-gray-200 p-4 flex items-center gap-3 transition-all duration-200 hover:shadow-sm shadow-sm`}
          >
            <Icon size={20} className={card.iconColor} />
            <div className="flex-1">
              <p className="text-xs text-gray-600 m-0 font-medium">
                {card.label}
              </p>
              <p className={`text-2xl font-bold ${card.textColor} m-0`}>
                {card.count}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
