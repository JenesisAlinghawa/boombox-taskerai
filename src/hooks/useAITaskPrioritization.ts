import { useState, useCallback } from "react";
import { DijkstraResult } from "@/utils/dijkstraTaskScheduler";

export interface AITaskAnalysis {
  taskId: number;
  taskTitle: string;
  recommendedOrder: number;
  reason: string;
  urgencyBoost: number;
  riskLevel: "high" | "medium" | "low";
}

export interface AIInsight {
  type: "warning" | "opportunity" | "insight";
  title: string;
  description: string;
}

export interface EnhancedPrioritization {
  dijkstraOrder: DijkstraResult[];
  aiAnalysis: {
    priorityAdjustments: AITaskAnalysis[];
    insights: AIInsight[];
    summary: string;
  } | null;
  blendedOrder: DijkstraResult[];
  isLoading: boolean;
  error: string | null;
}

export function useAITaskPrioritization() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeWithAI = useCallback(
    async (
      tasks: any[],
      dijkstraResults: DijkstraResult[]
    ): Promise<EnhancedPrioritization> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/tasks/ai-prioritize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ tasks }),
        });

        if (!response.ok) {
          throw new Error("AI prioritization failed");
        }

        const data = await response.json();

        // Blend Dijkstra results with AI recommendations
        const blendedOrder = blendPrioritizations(
          dijkstraResults,
          data.analysis.priorityAdjustments
        );

        setIsLoading(false);

        return {
          dijkstraOrder: dijkstraResults,
          aiAnalysis: data.analysis,
          blendedOrder,
          isLoading: false,
          error: null,
        };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        setIsLoading(false);

        return {
          dijkstraOrder: dijkstraResults,
          aiAnalysis: null,
          blendedOrder: dijkstraResults,
          isLoading: false,
          error: errorMessage,
        };
      }
    },
    []
  );

  return {
    analyzeWithAI,
    isLoading,
    error,
  };
}

/**
 * Blend Dijkstra algorithm results with AI recommendations
 * AI provides insights that can adjust Dijkstra's priority scores
 */
function blendPrioritizations(
  dijkstraResults: DijkstraResult[],
  aiAdjustments: AITaskAnalysis[]
): DijkstraResult[] {
  return dijkstraResults.map((task) => {
    const aiRecommendation = aiAdjustments.find(
      (adj) => adj.taskId === task.taskId
    );

    if (!aiRecommendation) {
      return task;
    }

    // Apply AI urgency boost to priority score
    // Lower priority number = higher priority
    const adjustedPriority = Math.max(
      1,
      task.priority - aiRecommendation.urgencyBoost
    );

    // Update urgency score based on AI risk assessment
    let adjustedUrgency = task.urgencyScore;
    if (aiRecommendation.riskLevel === "high") {
      adjustedUrgency = Math.min(100, adjustedUrgency + 25);
    } else if (aiRecommendation.riskLevel === "medium") {
      adjustedUrgency = Math.min(100, adjustedUrgency + 10);
    }

    return {
      ...task,
      priority: adjustedPriority,
      urgencyScore: adjustedUrgency,
      aiInsight: aiRecommendation.reason,
      aiRisk: aiRecommendation.riskLevel,
    };
  });
}
