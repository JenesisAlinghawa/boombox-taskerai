"use client";
import React, { useState } from "react";
import { saveUserSession } from "@/utils/sessionManager";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed");
        return;
      }

      // Store user session and redirect to dashboard
      saveUserSession(data.user);
      window.location.href = "/dashboard";
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
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
            LOGIN TO TASKERAI
          </h1>
          <p
            style={{
              fontSize: 16,
              margin: "18px 40px 32px",
              color: "#ffffff",
              width: 200,
            }}
          >
            Please enter your e-mail and password
          </p>
        </div>

        {/* Email Input */}
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

        {/* Password Input */}
        <div style={{ position: "relative", width: "100%", maxWidth: 320 }}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: "100%",
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
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            style={{
              position: "absolute",
              right: 8,
              top: 4,
              height: 24,
              padding: "0 8px",
              fontSize: 12,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#5d8bb1",
            }}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        {error && <div style={{ color: "#e74c3c", fontSize: 14 }}>{error}</div>}

        {/* Forgot Password */}
        <a
          href="/auth/forgotPassword"
          style={{
            color: "#6495FF",
            fontSize: 12,
            textDecoration: "none",
            marginLeft: 180,
          }}
        >
          Forgot Password?
        </a>

        {/* Login Button */}
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
          {loading ? "Logging in..." : "Login"}
        </button>

        {/* Create Account */}
        <p style={{ color: "#fffffff5", fontSize: 12, marginTop: 20 }}>
          Don't have an account?{" "}
          <a
            href="/auth/register"
            style={{ color: "#6495FF", textDecoration: "underlined" }}
          >
            Create one
          </a>
        </p>
      </form>
    </div>
  );
}
