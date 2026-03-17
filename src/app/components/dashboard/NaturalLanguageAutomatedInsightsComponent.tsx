"use client";

import React from "react";
import { Brain, Sparkles } from "lucide-react";

interface Insight {
  text: string;
  type: "positive" | "warning" | "info";
  icon?: string;
}

interface Props {
  loading?: boolean;
  insights: Insight[];
  anomalies: any[];
  naturalLanguageSummary: string;
}

export const NaturalLanguageAutomatedInsights: React.FC<Props> = ({
  loading,
  insights,
  anomalies,
  naturalLanguageSummary,
}) => {
  const getIcon = (type: string) => {
    switch (type) {
      case "positive":
        return "✅";
      case "warning":
        return "⚠️";
      case "info":
        return "ℹ️";
      default:
        return "💡";
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case "positive":
        return "bg-green-50 border-green-200 text-green-800";
      case "warning":
        return "bg-yellow-50 border-yellow-200 text-yellow-800";
      case "info":
        return "bg-blue-50 border-blue-200 text-blue-800";
      default:
        return "bg-gray-50 border-gray-200 text-gray-800";
    }
  };

  return (
    <div className="w-full space-y-3">
      {loading ? (
        <div className="flex items-center justify-center h-32 text-gray-500">
          <Brain size={20} className="animate-spin mr-2" />
          Generating insights...
        </div>
      ) : (
        <>
          <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
            <div className="flex items-start gap-2">
              <Sparkles
                size={16}
                className="text-blue-600 mt-0.5 flex-shrink-0"
              />
              <p className="text-sm text-blue-900 leading-relaxed">
                {naturalLanguageSummary}
              </p>
            </div>
          </div>

          {insights.map((insight, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg border ${getColor(insight.type)}`}
            >
              <div className="flex items-start gap-2">
                <span className="text-lg flex-shrink-0">
                  {getIcon(insight.type)}
                </span>
                <p className="text-sm leading-relaxed">{insight.text}</p>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
};
