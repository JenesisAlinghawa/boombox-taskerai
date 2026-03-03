"use client";
import React, { useState } from "react";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Call API to send reset link
    fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d?.success) {
          setMessage("Password reset link sent to your email!");
          setError("");
        } else {
          setError(d?.error || "Failed to send reset link");
        }
      })
      .catch(() => setError("Failed to send reset link"));
  };

  return (
    <div
      style={{
        width: "75vw",
        height: "80vh",
        background: "rgba(0, 99, 200, 0.10)",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bottom: 10,
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        borderRadius: 4,
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(5px)",
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
        <div style={{ textAlign: "center", color: "#ffffff" }}>
          <h1 style={{ fontSize: 24, fontWeight: 400, margin: 0 }}>
            FORGOT PASSWORD
          </h1>
          <p
            style={{
              fontSize: 16,
              margin: "18px 40px 32px",
              color: "#ffffff",
              width: 200,
            }}
          >
            Enter your email to reset your password
          </p>
        </div>

        {/* Email Input - same as login/register */}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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

        {/* Submit Button */}
        <button
          type="submit"
          style={{
            width: 180,
            height: 32,
            padding: "2px 0",
            fontSize: 12,
            color: "#ffffff",
            background: "#5d8bb1",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(93,139,177,0.3)",
            letterSpacing: 0.5,
          }}
        >
          Send Reset Link
        </button>

        {/* Back to Login */}
        <p style={{ color: "#fffffff5", fontSize: 14, marginTop: 20 }}>
          Remember your password?{" "}
          <a
            href="/auth/login"
            style={{ color: "#6495FF", textDecoration: "none" }}
          >
            Log in
          </a>
        </p>
      </form>
    </div>
  );
}
