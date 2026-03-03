"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

type Toast = {
  id: number;
  message: string;
  type?: "success" | "error" | "info";
};

type ToastContextValue = {
  show: (msg: string, type?: Toast["type"]) => number;
  remove: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = React.useRef(1);

  const show = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = idRef.current++;
    const t: Toast = { id, message, type };
    setToasts((prev) => [...prev, t]);
    // Auto-remove after 4s
    setTimeout(
      () => setToasts((prev) => prev.filter((x) => x.id !== id)),
      4000,
    );
    return id;
  }, []);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ show, remove }}>
      {children}
      <div style={{ position: "fixed", right: 20, bottom: 20, zIndex: 9999 }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              marginTop: 8,
              minWidth: 240,
              padding: "10px 14px",
              borderRadius: 8,
              color: "#fff",
              background:
                t.type === "success"
                  ? "#10b981"
                  : t.type === "error"
                    ? "#ef4444"
                    : "#2563eb",
              boxShadow: "0 6px 18px rgba(0,0,0,0.3)",
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return {
    show: ctx.show,
    success: (msg: string) => ctx.show(msg, "success"),
    error: (msg: string) => ctx.show(msg, "error"),
    info: (msg: string) => ctx.show(msg, "info"),
    remove: ctx.remove,
  };
}
