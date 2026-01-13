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
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 20,
        width: "100%",
        maxWidth: 400,
      }}
    >
      <div style={{ textAlign: "center", color: "#2c3e50" }}>
        <h1 style={{ fontSize: 24, fontWeight: 400, margin: 0 }}>
          FORGOT PASSWORD
        </h1>
        <p
          style={{
            fontSize: 16,
            margin: "18px 40px 32px",
            color: "#34495e",
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
  );
}
