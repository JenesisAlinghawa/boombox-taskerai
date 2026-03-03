"use client";

import React, { createContext, useContext, useState } from "react";

type ConfirmOptions = {
  message: string;
  title?: string;
};

type ConfirmContextValue = {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [title, setTitle] = useState<string | undefined>(undefined);
  const resolveRef = React.useRef<(v: boolean) => void>(() => {});

  const confirm = (opts: ConfirmOptions) => {
    setMessage(opts.message);
    setTitle(opts.title);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  };

  const handleClose = (result: boolean) => {
    setOpen(false);
    resolveRef.current(result);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.5)",
            zIndex: 10000,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            style={{
              width: 420,
              background: "#0b1220",
              color: "#fff",
              padding: 20,
              borderRadius: 8,
              boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
            }}
          >
            {title && (
              <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>
            )}
            <div style={{ marginBottom: 16 }}>{message}</div>
            <div
              style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => handleClose(false)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 6,
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.06)",
                  color: "#fff",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleClose(true)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 6,
                  background: "#ef4444",
                  border: "none",
                  color: "#fff",
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider");
  return ctx.confirm;
}
