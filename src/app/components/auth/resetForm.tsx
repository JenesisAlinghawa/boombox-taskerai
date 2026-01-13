"use client";
import React, { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!password || password !== confirm) {
      setError("Passwords must match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        setMessage("Password reset successful. Redirecting to login...");
        setTimeout(() => router.push("/auth/login"), 1800);
      } else {
        setError(data?.error || "Failed to reset password");
      }
    } catch (err) {
      setError("Network error while resetting password");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "transparent",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        left: 100,
        bottom: 10,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          width: "100%",
          maxWidth: 400,
          padding: "40px 20px",
        }}
      >
        <div style={{ textAlign: "center", color: "#2c3e50" }}>
          <h1 style={{ fontSize: 24, fontWeight: 400, margin: 0 }}>
            RESET PASSWORD
          </h1>
          <p
            style={{
              fontSize: 16,
              margin: "18px 40px 32px",
              color: "#34495e",
              width: 220,
            }}
          >
            Enter a new password for your account
          </p>
        </div>

        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            width: "100%",
            maxWidth: 320,
            height: 32,
            padding: "14px 20px",
            fontSize: 12,
            color: "#34495e",
            background: "#ffffff",
            border: "none",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            outline: "none",
          }}
        />

        <input
          type="password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          style={{
            width: "100%",
            maxWidth: 320,
            height: 32,
            padding: "14px 20px",
            fontSize: 12,
            color: "#34495e",
            background: "#ffffff",
            border: "none",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            outline: "none",
          }}
        />

        {error && <div style={{ color: "#e74c3c", fontSize: 14 }}>{error}</div>}
        {message && (
          <div style={{ color: "#27ae60", fontSize: 14 }}>{message}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: 180,
            height: 32,
            padding: "2px 0",
            fontSize: 12,
            color: "#ffffff",
            background: loading ? "#a0a0a0" : "#5d8bb1",
            border: "none",
            borderRadius: 8,
            cursor: loading ? "not-allowed" : "pointer",
            boxShadow: "0 4px 12px rgba(93,139,177,0.3)",
            letterSpacing: 0.5,
          }}
        >
          {loading ? "Resetting..." : "Reset Password"}
        </button>

        <p style={{ color: "#34495e", fontSize: 14, marginTop: 20 }}>
          Remember your password?{" "}
          <a
            href="/auth/login"
            style={{ color: "#01162B", textDecoration: "none" }}
          >
            Log in
          </a>
        </p>
      </form>
    </div>
  );
}
