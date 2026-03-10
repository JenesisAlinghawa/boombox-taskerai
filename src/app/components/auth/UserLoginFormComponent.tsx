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
      const response = await fetch("/api/authentication-endpoints/login", {
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
    <div className="w-full h-full bg-blue-100 backdrop-blur-sm border border-black/10 rounded-sm shadow-lg p-18 flex flex-col items-center justify-center overflow-y-auto transition-all duration-200 hover:border-black/50 hover:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.15)]">
      <form
        onSubmit={handleSubmit}
        className="relative z-1 flex flex-col items-center gap-5 w-full max-w-[530px] mx-auto"
      >
        <div className="text-center text-black">
          <h1 className="text-4xl font-normal m-0 text-black">
            LOGIN TO TASKERAI
          </h1>
          <p className="text-lg m-3 text-center text-black/70">
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
          className="w-full h-8 px-3 py-2 text-sm text-gray-700 bg-white border-none rounded-sm shadow-sm outline-none transition-all duration-200 focus:shadow-md hover:shadow-md"
        />

        {/* Password Input */}
        <div className="relative w-full">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full h-8 px-3 py-2 text-sm text-gray-700 bg-white border-none rounded-sm shadow-sm outline-none transition-all duration-200 focus:shadow-md hover:shadow-md"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-2 top-1 h-6 px-2 text-sm border-none bg-transparent cursor-pointer text-blue-600 hover:text-blue-800 transition-colors"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        {/* Forgot Password */}
        <a
          href="/auth/forgotPassword"
          className="text-blue-700 no-underline hover:text-blue-800 transition-colors self-end"
        >
          Forgot Password?
        </a>

        {/* Login Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-1/2 h-9 px-5 text-sm text-white rounded-sm cursor-pointer shadow-sm font-medium transition-all duration-200 border-none hover:shadow-lg active:shadow-inner disabled:bg-gray-400 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        {/* Create Account */}
        <p className="text-black/80 text-sm mt-5">
          Don't have an account?{" "}
          <a
            href="/auth/register"
            className="text-blue-700 no-underline hover:text-blue-800 transition-colors"
          >
            Create one
          </a>
        </p>
      </form>
    </div>
  );
}
