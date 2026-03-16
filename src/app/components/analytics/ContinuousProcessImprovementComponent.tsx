"use client";

import React from "react";
import { Zap, TrendingDown } from "lucide-react";

interface ProcessOptimization {
  bottleneck: string;
  currentCycleTime: number; // in days
  potentialImprovement: number; // percentage
  suggestedSolution: string;
}

interface MoraleIndicator {
  teamMorale: "positive" | "neutral" | "negative";
  score: number; // 0-100
  sentiment: string;
  frictionPoints: string[];
}

interface Props {
  cycleTimeOptimizations: ProcessOptimization[];
  morale: MoraleIndicator;
  processScores?: {
    efficiency: number;
    quality: number;
    teamSatisfaction: number;
  };
  loading?: boolean;
}

export const ContinuousProcessImprovement: React.FC<Props> = ({
  cycleTimeOptimizations,
  morale,
  processScores,
  loading = false,
}) => {
  return (
    <div className="h-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-200 flex flex-col">
      <div className="flex items-center gap-2 border-b border-gray-300/50 p-4 shrink-0 bg-cyan-100">
        <Zap size={20} className="text-blue-600" />
        <h3 className="text-sm font-semibold text-black/62 m-0">
          Process Improvement
        </h3>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-black/40 text-xs">Analyzing processes...</div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Process Scores */}
          {processScores && (
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-green-50 border border-green-200/50 rounded p-2">
                <p className="text-xs text-green-700 m-0 mb-1">Efficiency</p>
                <p className="text-lg font-semibold text-green-600 m-0">
                  {processScores.efficiency}%
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200/50 rounded p-2">
                <p className="text-xs text-blue-700 m-0 mb-1">Quality</p>
                <p className="text-lg font-semibold text-blue-600 m-0">
                  {processScores.quality}%
                </p>
              </div>
              <div className="bg-purple-50 border border-purple-200/50 rounded p-2">
                <p className="text-xs text-purple-700 m-0 mb-1">Satisfaction</p>
                <p className="text-lg font-semibold text-purple-600 m-0">
                  {processScores.teamSatisfaction}%
                </p>
              </div>
            </div>
          )}

          {/* Cycle Time Optimization */}
          {cycleTimeOptimizations.length > 0 && (
            <div className="bg-orange-50 border border-orange-200/30 rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown size={14} className="text-orange-600" />
                <h4 className="text-xs font-semibold text-orange-700 m-0">
                  Bottleneck Analysis
                </h4>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {cycleTimeOptimizations.map((opt, i) => (
                  <div
                    key={i}
                    className="text-xs p-1.5 bg-white/40 rounded border border-orange-200/50"
                  >
                    <p className="font-medium text-orange-800 m-0">
                      {opt.bottleneck}
                    </p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-orange-700">
                        Current: {opt.currentCycleTime} days
                      </span>
                      <span className="font-semibold text-green-600">
                        -{opt.potentialImprovement}%
                      </span>
                    </div>
                    <p className="text-orange-600 mt-1 m-0">
                      {opt.suggestedSolution}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Team Morale & Sentiment */}
          <div
            className={`border rounded p-3 ${
              morale.teamMorale === "positive"
                ? "bg-green-50 border-green-200/50"
                : morale.teamMorale === "neutral"
                  ? "bg-blue-50 border-blue-200/50"
                  : "bg-red-100/80 border-red-300/50"
            }`}
          >
            <h4
              className={`text-xs font-semibold m-0 mb-2 ${
                morale.teamMorale === "positive"
                  ? "text-green-700"
                  : morale.teamMorale === "neutral"
                    ? "text-blue-700"
                    : "text-red-700"
              }`}
            >
              Team Sentiment Analysis
            </h4>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-black/60">Morale Score</span>
                  <span className="text-sm font-semibold text-black/62">
                    {morale.score}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-gray-300 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      morale.teamMorale === "positive"
                        ? "bg-green-500"
                        : morale.teamMorale === "neutral"
                          ? "bg-blue-500"
                          : "bg-red-500"
                    }`}
                    style={{ width: `${morale.score}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-black/60 m-0">{morale.sentiment}</p>
              {morale.frictionPoints.length > 0 && (
                <div className="mt-2 p-2 bg-white/40 rounded border border-black/10">
                  <p className="text-xs font-medium text-black/70 m-0 mb-1">
                    Hidden Friction Points:
                  </p>
                  {morale.frictionPoints.map((point, i) => (
                    <p key={i} className="text-xs text-black/60 m-0">
                      • {point}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
