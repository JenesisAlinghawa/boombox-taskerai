// @/app/components/auth/registerForm.tsx
"use client";
import React, { useState } from "react";

export default function RegisterForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const passwordRules = [
    {
      key: "length",
      label: "At least 8 characters",
      test: (p: string) => p.length >= 8,
    },
    {
      key: "upper",
      label: "One uppercase letter",
      test: (p: string) => /[A-Z]/.test(p),
    },
    {
      key: "lower",
      label: "One lowercase letter",
      test: (p: string) => /[a-z]/.test(p),
    },
    {
      key: "number",
      label: "One number",
      test: (p: string) => /[0-9]/.test(p),
    },
    {
      key: "special",
      label: "One special character",
      test: (p: string) => /[!@#$%^&*(),.?"{}|<>]/.test(p),
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    (async () => {
      try {
        // double-check client-side before sending
        const failed = passwordRules
          .filter((r) => !r.test(password))
          .map((r) => r.label);
        if (failed.length) {
          setError("Password does not meet requirements: " + failed.join(", "));
          setLoading(false);
          return;
        }

        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firstName, lastName, email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          // Map server message for clarity
          const msg = (data.error || "Registration failed").toString();
          if (res.status === 409 || /exist/i.test(msg)) {
            setError("Account already exists");
          } else {
            setError(msg);
          }
          return;
        }

        // Show success modal and redirect to login
        setShowSuccess(true);
      } catch (err) {
        console.error(err);
        setError("An error occurred. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
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
          REGISTER TO TASKERAI
        </h1>
        <p
          style={{
            fontSize: 16,
            margin: "18px 40px 32px",
            color: "#34495e",
            width: 200,
          }}
        >
          Please enter your details
        </p>
      </div>

      {/* First Name and Last Name - Side by Side */}
      <div style={{ display: "flex", gap: 12, width: "100%", maxWidth: 320 }}>
        <input
          type="text"
          placeholder="First Name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
          style={{
            flex: 1,
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
          type="text"
          placeholder="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
          style={{
            flex: 1,
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
      </div>

      {/* Email */}
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

      {/* Password */}
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
      {/* Password rules */}
      <div style={{ width: "100%", maxWidth: 320, marginTop: 8 }}>
        {passwordRules.map((r) => {
          const ok = r.test(password);
          return (
            <div
              key={r.key}
              style={{ color: ok ? "#2ecc71" : "#34495e", fontSize: 12 }}
            >
              {ok ? "✓" : "•"} {r.label}
            </div>
          );
        })}
      </div>

      <div style={{ position: "relative", width: "100%", maxWidth: 320 }}>
        <input
          type={showConfirmPassword ? "text" : "password"}
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
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
          onClick={() => setShowConfirmPassword((s) => !s)}
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
          {showConfirmPassword ? "Hide" : "Show"}
        </button>
      </div>

      {error && <div style={{ color: "#e74c3c", fontSize: 14 }}>{error}</div>}

      {/* Register Button */}
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
        {loading ? "Registering..." : "Register"}
      </button>

      {showSuccess && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            style={{
              background: "#ffffff",
              padding: 24,
              borderRadius: 8,
              width: 360,
              textAlign: "center",
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            }}
          >
            <h2
              style={{
                color: "#000",
                fontSize: 12,
                margin: 0,
                marginBottom: 12,
              }}
            >
              Account created
            </h2>
            <p style={{ color: "#000000", marginBottom: 20 }}>
              Please check your email (including your spam folder) to verify
              your account before signing in.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
              <button
                onClick={() => {
                  setShowSuccess(false);
                  window.location.href = "/auth/login";
                }}
                style={{
                  width: 180,
                  height: 32,
                  fontSize: 12,
                  background: "#5d8bb1",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Go to login
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back to Login */}
      <p style={{ color: "#34495e", fontSize: 14, marginTop: 20 }}>
        Already have an account?{" "}
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
