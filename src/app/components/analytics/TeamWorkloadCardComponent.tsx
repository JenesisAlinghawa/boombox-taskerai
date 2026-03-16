"use client";

import React, { useState, useEffect } from "react";
import { Users, TrendingUp } from "lucide-react";

interface TeamMemberLoad {
  userId: string;
  userName: string;
  totalTasks: number;
  inProgress: number;
  completed: number;
  overdue: number;
  capacity: number; // 0-100
}

interface Props {
  teamMembers: TeamMemberLoad[];
  loading?: boolean;
}

export const TeamWorkloadCard: React.FC<Props> = ({
  teamMembers = [],
  loading,
}) => {
  // Use real team data
  const displayMembers = teamMembers;

  const getCapacityColor = (capacity: number) => {
    if (capacity < 40) return "bg-green-100 text-green-700";
    if (capacity < 70) return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  const getCapacityIndicator = (capacity: number) => {
    if (capacity < 40) return "🟢 Available";
    if (capacity < 70) return "🟡 Moderate";
    return "🔴 At Capacity";
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col h-full">
      <div className="border-b border-gray-300/50 p-4 shrink-0 flex items-center gap-2 bg-purple-50">
        <Users size={18} className="text-purple-700" />
        <h3 className="text-sm font-semibold text-gray-800 m-0">
          Team Workload
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-0">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            Loading...
          </div>
        ) : displayMembers.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
            No team data available
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {displayMembers.map((member) => (
              <div
                key={member.userId}
                className="p-3 hover:bg-gray-50 transition-colors"
              >
                {/* Member Name & Status */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-800">
                    {member.userName}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${getCapacityColor(member.capacity)}`}
                  >
                    {member.capacity}%
                  </span>
                </div>

                {/* Capacity Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      member.capacity < 40
                        ? "bg-green-500"
                        : member.capacity < 70
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    }`}
                    style={{ width: `${member.capacity}%` }}
                  />
                </div>

                {/* Task Breakdown */}
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="text-center">
                    <div className="font-semibold text-gray-800">
                      {member.inProgress}
                    </div>
                    <div className="text-gray-600">In Progress</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-green-700">
                      {member.completed}
                    </div>
                    <div className="text-gray-600">Done</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-red-700">
                      {member.overdue}
                    </div>
                    <div className="text-gray-600">Overdue</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-gray-800">
                      {member.totalTasks}
                    </div>
                    <div className="text-gray-600">Total</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
