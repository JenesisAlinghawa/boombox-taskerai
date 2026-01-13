"use client";
import React from "react";

const COLORS = {
  primary: "#5d8bb1",
  light: "#a0d8ef",
  bg: "#f8fbff",
  cardBg: "#ffffff",
  text: "#2c3e50",
  muted: "#34495e",
  progress: "#a0d8ef",
};

export default function DashboardContent() {
  return (
    <div
      style={{
        padding: "16px",
        background: COLORS.bg,
        minHeight: "100vh",
        color: COLORS.text,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 14,
              fontWeight: 500,
              margin: 0,
              color: COLORS.muted,
            }}
          >
            December 1, Monday
          </h2>
          <h1 style={{ fontSize: 20, fontWeight: 400, margin: "6px 0 0" }}>
            Your task today
          </h1>
          <p style={{ fontSize: 13, color: COLORS.muted, margin: "6px 0 0" }}>
            Keep up the good work!
          </p>
        </div>

        {/* Add New Task Button */}
        <button
          style={{
            background: "#01162B",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 16px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            boxShadow: "0 3px 10px rgba(1,22,43,0.18)",
          }}
        >
          Add new task
          <span style={{ fontSize: 16 }}>+</span>
        </button>
        <div>
          <h3 style={{ fontSize: 18, marginBottom: 16 }}>Today's Tasks</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 300px",
              gap: 16,
            }}
          >
            {/* Task Card 1 */}
            <div
              style={{
                background: COLORS.primary,
                color: "#fff",
                padding: 20,
                borderRadius: 8,
                boxShadow: "0 4px 12px rgba(93,139,177,0.15)",
              }}
            >
              padding: 14,
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <h4 style={{ fontSize: 16, margin: 0 }}>User Task</h4>
                <span>...</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <h4 style={{ fontSize: 14, margin: 0 }}>User Task</h4>
                <span style={{ fontSize: 14 }}>...</span>
              </div>
              Today, December 1 /* Lines 82-100 omitted */
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, marginBottom: 4 }}>
                  Task done 2/2
                </div>
                <div
                  style={{
                    height: 8,
                    background: "rgba(0,0,0,0.1)",
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      background: "#fff",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Task Card 2 & 3 */}
            {[1, 2].map((i) => (
              <div
                key={i}
                style={{
                  background: COLORS.cardBg,
                  padding: 20,
                  borderRadius: 8,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <h4 style={{ fontSize: 16, margin: 0 }}>User Task</h4>
                  <span>...</span>
                </div>
                <p
                  style={{ fontSize: 14, color: COLORS.muted, margin: "4px 0" }}
                >
                  Today, December 1
                </p>
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12, marginBottom: 4 }}>
                    Task done 2/2
                  </div>
                  <div
                    style={{
                      height: 8,
                      background: "#f0f0f0",
                      borderRadius: 4,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        background: COLORS.progress,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming */}
        <div>
          <h3 style={{ fontSize: 18, marginBottom: 16 }}>Upcoming</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Meeting Cards */}
            {[
              {
                title: "Class meeting",
                date: "Friday, December 5",
                avatars: 4,
              },
              { title: "User Task", date: "Tuesday, December 8" },
              { title: "User Task", date: "Tuesday, December 12" },
              {
                title: "Group meeting",
                date: "Monday, December 15",
                avatars: 3,
              },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  background: COLORS.cardBg,
                  padding: 20,
                  borderRadius: 8,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <h4 style={{ fontSize: 16, margin: 0 }}>{item.title}</h4>
                  <p
                    style={{
                      fontSize: 14,
                      color: COLORS.muted,
                      margin: "4px 0",
                    }}
                  >
                    {item.date}
                  </p>
                  {item.avatars && (
                    <div style={{ display: "flex", marginTop: 12, gap: -8 }}>
                      {Array.from({ length: item.avatars }).map((_, j) => (
                        <div
                          key={j}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: `hsl(${j * 60}, 70%, 60%)`,
                            border: "3px solid white",
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 20 }}>→</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Calendar + Completed */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Calendar */}
          <div
            style={{
              background: COLORS.cardBg,
              padding: 16,
              borderRadius: 8,
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <span>←</span>
              <span style={{ fontWeight: 600 }}>Dec 2025</span>
              <span>→</span>
            </div>
            <div
              style={{
                fontSize: 12,
                color: COLORS.muted,
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                marginBottom: 8,
              }}
            >
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div
              style={{
                fontSize: 14,
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 8,
              }}
            >
              {Array.from({ length: 35 }, (_, i) => {
                const day = i < 6 ? "" : i < 32 ? i - 5 : i - 31;
                const isToday = day === 1;
                return (
                  <div
                    key={i}
                    style={{
                      padding: 8,
                      borderRadius: 4,
                      background: isToday ? COLORS.primary : "transparent",
                      color: isToday ? "#fff" : COLORS.text,
                    }}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Task Completed */}
          <div
            style={{
              background: COLORS.cardBg,
              padding: 32,
              borderRadius: 8,
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 18, fontWeight: 500 }}>Task Completed!</p>
            <div
              style={{
                position: "relative",
                width: 160,
                height: 160,
                margin: "24px auto",
              }}
            >
              {/* Progress Ring */}
              <svg
                viewBox="0 0 160 160"
                style={{ transform: "rotate(-90deg)" }}
              >
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="#e0e0e0"
                  strokeWidth="12"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke={COLORS.primary}
                  strokeWidth="12"
                  strokeDasharray="439.8"
                  strokeDashoffset="0"
                />
              </svg>
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  fontSize: 32,
                  fontWeight: 600,
                }}
              >
                100%
              </div>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 16,
                fontSize: 12,
                color: COLORS.muted,
              }}
            >
              <span>● Done</span>
              <span>○ Rest</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
