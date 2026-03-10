"use client";
import React, { useState } from "react";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Call API to send reset link
    fetch("/api/authentication-endpoints/forgot", {
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
    <div className="w-full h-full bg-blue-100 backdrop-blur-sm border border-black/10 rounded-sm shadow-lg p-18 flex flex-col items-center justify-center overflow-y-auto transition-all duration-200 hover:border-black/50 hover:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.15)]">
      <form
        onSubmit={handleSubmit}
        className="relative z-1 flex flex-col items-center gap-5 w-full max-w-[530px] mx-auto"
      >
        <div className="text-center text-black">
          <h1 className="text-4xl font-normal m-0 text-black">
            FORGOT PASSWORD
          </h1>
          <p className="text-lg m-3 text-center text-black/70">
            Enter your email to reset your password
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

        {error && <div className="text-red-600 text-sm">{error}</div>}

        {message && <div className="text-green-600 text-sm">{message}</div>}

        {/* Submit Button */}
        <button
          type="submit"
          className="w-1/2 h-9 px-5 text-sm text-white rounded-sm cursor-pointer shadow-sm font-medium transition-all duration-200 border-none hover:shadow-lg active:shadow-inner bg-blue-600 hover:bg-blue-700"
        >
          Send Reset Link
        </button>

        {/* Back to Login */}
        <p className="text-black/80 text-sm mt-5">
          Remember your password?{" "}
          <a
            href="/auth/login"
            className="text-blue-700 no-underline hover:text-blue-800 transition-colors"
          >
            Log in
          </a>
        </p>
      </form>
    </div>
  );
}
