"use client";

import React from "react";
import { Users, AlertTriangle, Zap } from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  workload: number; // percentage 0-100
  burnoutRisk: "low" | "medium" | "high";
  recommendedAction?: string;
}

interface AllocationRecommendation {
  taskId: string;
  taskTitle: string;
  recommendedFor: string;
  reason: string;
}

interface Props {
  teamMembers: TeamMember[];
  allocations: AllocationRecommendation[];
  loading?: boolean;
}

export const IntelligentWorkloadOptimization: React.FC<Props> = ({
  teamMembers,
  allocations,
  loading = false,
}) => {
  return (
    <div className="h-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-200 flex flex-col">
      <div className="flex items-center gap-2 border-b border-gray-300/50 p-4 shrink-0 bg-orange-100">
        <Users size={20} className="text-blue-600" />
        <h3 className="text-sm font-semibold text-black/62 m-0">
          Workload & Resource Optimization
        </h3>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-black/40 text-xs">Analyzing workload...</div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Burnout Detection */}
          {teamMembers.some((m) => m.burnoutRisk === "high") && (
            <div className="bg-red-100/80 border border-red-300/50 rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-red-600" />
                <p className="text-xs font-semibold text-red-700 m-0">
                  Burnout Risk Detected
                </p>
              </div>
              {teamMembers
                .filter((m) => m.burnoutRisk === "high")
                .map((member) => (
                  <div key={member.id} className="text-xs text-red-600 mb-1">
                    <p className="font-medium m-0">{member.name}</p>
                    <p className="m-0">
                      {member.recommendedAction ||
                        `Reduce workload from ${member.workload}%`}
                    </p>
                  </div>
                ))}
            </div>
          )}

          {/* Team Workload Status */}
          <div className="bg-blue-50 border border-blue-200/30 rounded p-3">
            <h4 className="text-xs font-semibold text-blue-700 m-0 mb-2">
              Team Workload Distribution
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {teamMembers.map((member) => (
                <div key={member.id} className="text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-blue-900 font-medium truncate">
                      {member.name}
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        member.burnoutRisk === "high"
                          ? "text-red-600"
                          : member.burnoutRisk === "medium"
                            ? "text-yellow-600"
                            : "text-green-600"
                      }`}
                    >
                      {member.workload}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-blue-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        member.burnoutRisk === "high"
                          ? "bg-red-500"
                          : member.burnoutRisk === "medium"
                            ? "bg-yellow-500"
                            : "bg-green-500"
                      }`}
                      style={{ width: `${member.workload}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Smart Task Allocation */}
          {allocations.length > 0 && (
            <div className="bg-green-50 border border-green-200/30 rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                <Zap size={14} className="text-green-600" />
                <h4 className="text-xs font-semibold text-green-700 m-0">
                  Smart Task Allocation
                </h4>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {allocations.slice(0, 2).map((alloc) => (
                  <div
                    key={alloc.taskId}
                    className="text-xs p-1.5 bg-white/40 rounded border border-green-200/50"
                  >
                    <p className="font-medium text-green-700 m-0 truncate">
                      {alloc.taskTitle}
                    </p>
                    <p className="text-green-600 text-xs m-0">
                      → {alloc.recommendedFor}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
