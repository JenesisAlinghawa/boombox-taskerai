"use client";

import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

interface WeeklyChartData {
  labels: string[];
  inProgress: number[];
  completed: number[];
  overdue: number[];
}

interface WeeklyLineChartProps {
  data: WeeklyChartData;
}

export const WeeklyLineChart: React.FC<WeeklyLineChartProps> = ({ data }) => {
  const chartData = {
    labels: data.labels,
    datasets: [
      {
        label: "In progress",
        data: data.inProgress,
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.4,
        fill: true,
        pointBackgroundColor: "#3b82f6",
        pointBorderColor: "#1e3a8a",
        pointRadius: 5,
        pointHoverRadius: 7,
      },
      {
        label: "Completed",
        data: data.completed,
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        tension: 0.4,
        fill: true,
        pointBackgroundColor: "#10b981",
        pointBorderColor: "#065f46",
        pointRadius: 5,
        pointHoverRadius: 7,
      },
      {
        label: "Overdue",
        data: data.overdue,
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        tension: 0.4,
        fill: true,
        pointBackgroundColor: "#ef4444",
        pointBorderColor: "#7f1d1d",
        pointRadius: 5,
        pointHoverRadius: 7,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: true,
        position: "top" as const,
        labels: {
          color: "#e5e7eb",
          font: {
            size: 12,
            weight: 500 as any,
          },
          padding: 15,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "#fff",
        bodyColor: "#e5e7eb",
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
        padding: 12,
        titleFont: {
          size: 13,
          weight: "bold" as const,
        },
        bodyFont: {
          size: 12,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 10,
        ticks: {
          color: "#9ca3af",
          font: {
            size: 12,
          },
          stepSize: 2,
        },
        grid: {
          color: "rgba(75, 85, 99, 0.2)",
          drawBorder: false,
        },
      },
      x: {
        ticks: {
          color: "#9ca3af",
          font: {
            size: 12,
          },
        },
        grid: {
          display: false,
          drawBorder: false,
        },
      },
    },
  };

  return (
    <div className="w-full h-80 relative">
      <Line data={chartData} options={options} />
    </div>
  );
};
