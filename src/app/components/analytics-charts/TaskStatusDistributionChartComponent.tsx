"use client";

import React, { useState } from "react";

interface TaskStatusChartProps {
  data: {
    status: string;
    count: number;
    color: string;
  }[];
  title?: string;
}

const COLORS = {
  bg: "#ffffff",
  cardBg: "#F9FAFD",
  text: "#1f2937",
  muted: "#6b7280",
  warning: "#f59e0b",
  error: "#ef4444",
  success: "#10b981",
  shadow: "#E1F1FD",
};

export default function TaskStatusChart({ data, title }: TaskStatusChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Guard against undefined data
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div
        style={{
          background: COLORS.cardBg,
          border: "1px solid rgba(0,0,0,0.1)",
          filter: "drop-shadow(2px 2px 5px rgba(211, 212, 214, 0.5))",
          padding: "20px 20px 20px 20px",
          borderRadius: 8,
          marginBottom: 24,
          textAlign: "center",
          color: COLORS.muted,
          fontSize: 14,
          minHeight: 300,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
        }}
      >
        {title && (
          <h3
            style={{
              fontSize: 14,
              fontWeight: 600,
              margin: "0 0 16px",
              color: COLORS.text,
            }}
          >
            {title}
          </h3>
        )}
        No data available
      </div>
    );
  }

  // Find max count for scaling
  const maxCount = Math.max(...data.map((item) => item.count), 1);
  const chartHeight = 300;
  const barPadding = 20;
  const availableHeight = chartHeight - barPadding * 2;

  // Filter out items with 0 count
  const visibleData = data.filter((item) => item.count > 0);

  return (
    <div
      style={{
        background: COLORS.cardBg,
        border: "1px solid rgba(0,0,0,0.1)",
        filter: "drop-shadow(2px 2px 5px rgba(211, 212, 214, 0.5))",
        padding: "20px 20px 20px 20px",
        borderRadius: 8,
        marginBottom: 24,
      }}
    >
      {title && (
        <h3
          style={{
            fontSize: 14,
            fontWeight: 600,
            margin: "0 0 20px",
            color: COLORS.text,
          }}
        >
          {title}
        </h3>
      )}

      <div
        style={{
          width: "100%",
          height: chartHeight,
          position: "relative",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-around",
          paddingBottom: barPadding,
          borderBottom: `1px solid rgba(0,0,0,0.1)`,
          minHeight: 300,
        }}
      >
        {/* Y-axis labels */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: 40,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            fontSize: 11,
            color: COLORS.muted,
            textAlign: "right",
            paddingRight: 8,
            fontWeight: 500,
          }}
        >
          {[
            maxCount,
            Math.ceil(maxCount * 0.75),
            Math.ceil(maxCount * 0.5),
            Math.ceil(maxCount * 0.25),
            0,
          ].map((label, i) => (
            <span key={i}>{label}</span>
          ))}
        </div>

        {/* Grid lines */}
        <div
          style={{
            position: "absolute",
            left: 40,
            top: 0,
            right: 0,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            pointerEvents: "none",
          }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                width: "100%",
                height: 1,
                background: "rgba(0,0,0,0.08)",
              }}
            />
          ))}
        </div>

        {/* Bars */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            gap: Math.max(20, 50 - visibleData.length * 8),
            width: "100%",
            height: "100%",
            paddingLeft: 50,
            paddingRight: 20,
          }}
        >
          {visibleData.map((item, i) => {
            const barHeight = (item.count / maxCount) * availableHeight;
            const barWidth = Math.min(
              100,
              Math.max(50, 150 - visibleData.length * 20)
            );
            const containerWidth = barWidth + 20;
            const totalCount = visibleData.reduce((sum, d) => sum + d.count, 0);
            const percentage =
              totalCount > 0 ? Math.round((item.count / totalCount) * 100) : 0;

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  flex: 0,
                  width: containerWidth,
                  minWidth: containerWidth,
                }}
              >
                {/* Bar */}
                <div
                  style={{
                    width: barWidth,
                    height: barHeight,
                    background: item.color,
                    borderRadius: "4px 4px 0 0",
                    transition: "all 0.2s ease",
                    position: "relative",
                    cursor: "pointer",
                    boxShadow:
                      hoveredIndex === i
                        ? "0 4px 12px rgba(0,0,0,0.15)"
                        : "0 2px 4px rgba(0,0,0,0.1)",
                    opacity:
                      hoveredIndex === null || hoveredIndex === i ? 1 : 0.6,
                  }}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {/* Count label on top of bar */}
                  <div
                    style={{
                      position: "absolute",
                      top: -25,
                      left: "50%",
                      transform: "translateX(-50%)",
                      fontSize: 13,
                      fontWeight: 700,
                      color: COLORS.text,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.count}
                  </div>

                  {/* Percentage label on hover - displayed inside or above bar */}
                  {hoveredIndex === i && (
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        fontSize: 14,
                        fontWeight: 800,
                        color: "#ffffff",
                        whiteSpace: "nowrap",
                        textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                      }}
                    >
                      {percentage}%
                    </div>
                  )}
                </div>

                {/* Status label */}
                <div
                  style={{
                    marginTop: 12,
                    textAlign: "center",
                    fontSize: 12,
                    fontWeight: 600,
                    color: COLORS.text,
                    maxWidth: "100%",
                    wordWrap: "break-word",
                  }}
                >
                  {item.status}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
