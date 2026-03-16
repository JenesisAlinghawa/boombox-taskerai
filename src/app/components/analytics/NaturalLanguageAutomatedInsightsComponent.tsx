"use client";

import React from "react";
import { MessageSquare, AlertCircle } from "lucide-react";

interface Insight {
  text: string;
  type: "positive" | "warning" | "info";
  icon: string;
}

interface Props {
  insights: Insight[];
  anomalies: Array<{
    issue: string;
    severity: "low" | "medium" | "high";
    description: string;
  }>;
  naturalLanguageSummary?: string;
  loading?: boolean;
}

export const NaturalLanguageAutomatedInsights: React.FC<Props> = ({
  insights,
  anomalies,
  naturalLanguageSummary,
  loading = false,
}) => {
  return (
    <div className="h-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-200 flex flex-col">
      <div className="flex items-center gap-2 border-b border-gray-300/50 p-4 shrink-0 bg-indigo-100">
        <MessageSquare size={20} className="text-blue-600" />
        <h3 className="text-sm font-semibold text-black/62 m-0">
          Automated AI Insights
        </h3>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-black/40 text-xs">Generating insights...</div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Natural Language Summary */}
          {naturalLanguageSummary && (
            <div className="bg-purple-50 border border-purple-200/50 rounded p-3">
              <h4 className="text-xs font-semibold text-purple-700 m-0 mb-2">
                Executive Summary
              </h4>
              <p className="text-xs text-purple-800 leading-relaxed m-0">
                {naturalLanguageSummary}
              </p>
            </div>
          )}

          {/* Anomaly Detection */}
          {anomalies.length > 0 && (
            <div
              className={`border rounded p-3 ${
                anomalies.some((a) => a.severity === "high")
                  ? "bg-red-100/80 border-red-300/50"
                  : "bg-yellow-100/80 border-yellow-300/50"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle
                  size={16}
                  className={
                    anomalies.some((a) => a.severity === "high")
                      ? "text-red-600"
                      : "text-yellow-600"
                  }
                />
                <p
                  className={`text-xs font-semibold m-0 ${
                    anomalies.some((a) => a.severity === "high")
                      ? "text-red-700"
                      : "text-yellow-700"
                  }`}
                >
                  Anomalies Detected
                </p>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {anomalies.map((anomaly, i) => (
                  <div
                    key={i}
                    className={`text-xs p-1.5 rounded ${
                      anomaly.severity === "high"
                        ? "bg-white/60 text-red-800 border border-red-200"
                        : "bg-white/40 text-yellow-900"
                    }`}
                  >
                    <p className="font-medium m-0">{anomaly.issue}</p>
                    <p className="m-0 text-xs">{anomaly.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insights List */}
          {insights.length > 0 && (
            <div className="bg-blue-50 border border-blue-200/30 rounded p-3">
              <h4 className="text-xs font-semibold text-blue-700 m-0 mb-2">
                Key Insights
              </h4>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {insights.slice(0, 4).map((insight, i) => (
                  <div key={i} className="flex gap-2 text-xs items-start">
                    <span className="text-lg leading-none">
                      {insight.type === "positive"
                        ? "✓"
                        : insight.type === "warning"
                          ? "⚠"
                          : "ℹ"}
                    </span>
                    <p
                      className={`m-0 ${
                        insight.type === "positive"
                          ? "text-green-800"
                          : insight.type === "warning"
                            ? "text-yellow-800"
                            : "text-blue-800"
                      }`}
                    >
                      {insight.text}
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
