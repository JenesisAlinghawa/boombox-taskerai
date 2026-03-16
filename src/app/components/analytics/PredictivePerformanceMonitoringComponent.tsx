"use client";

import React from "react";
import { TrendingUp, AlertCircle, Clock } from "lucide-react";

interface PredictiveMetrics {
  deadlineRisk: number; // percentage
  budgetRisk: number; // percentage
  projectsAtRisk: number;
  predictedDelays: Array<{
    taskId: string;
    taskTitle: string;
    riskLevel: "high" | "medium" | "low";
    daysUntilDue: number;
  }>;
}

interface Props {
  metrics: PredictiveMetrics;
  loading?: boolean;
}

export const PredictivePerformanceMonitoring: React.FC<Props> = ({
  metrics,
  loading = false,
}) => {
  return (
    <div className="h-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-200 flex flex-col">
      <div className="flex items-center gap-2 border-b border-gray-300/50 p-4 shrink-0 bg-purple-100">
        <TrendingUp size={20} className="text-blue-600" />
        <h3 className="text-sm font-semibold text-black/62 m-0">
          Predictive Performance Monitoring
        </h3>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-black/40 text-xs">Loading predictions...</div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Risk Indicators */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3">
              <p className="text-xs text-black/40 m-0 mb-1">Deadline Risk</p>
              <p className="text-lg font-semibold text-orange-600 m-0">
                {metrics.deadlineRisk}%
              </p>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded p-3">
              <p className="text-xs text-black/40 m-0 mb-1">Budget Risk</p>
              <p className="text-lg font-semibold text-red-600 m-0">
                {metrics.budgetRisk}%
              </p>
            </div>
          </div>

          {/* Projects at Risk */}
          <div className="bg-red-100/50 border border-red-300/30 rounded p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={16} className="text-red-600" />
              <p className="text-xs font-semibold text-red-700 m-0">
                Projects at Risk: {metrics.projectsAtRisk}
              </p>
            </div>
            <p className="text-xs text-red-600 m-0">
              Proactive mitigation recommended
            </p>
          </div>

          {/* Predicted Delays */}
          {metrics.predictedDelays.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200/30 rounded p-3">
              <h4 className="text-xs font-semibold text-yellow-700 m-0 mb-2 flex items-center gap-1">
                <Clock size={14} /> Predicted Delays
              </h4>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {metrics.predictedDelays.slice(0, 3).map((delay) => (
                  <div
                    key={delay.taskId}
                    className="text-xs text-yellow-700 p-1 bg-white/40 rounded"
                  >
                    <p className="font-medium m-0 truncate">
                      {delay.taskTitle}
                    </p>
                    <p className="text-yellow-600 m-0">
                      {delay.daysUntilDue} days left • {delay.riskLevel} risk
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
