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
      const res = await fetch("/api/authentication-endpoints/reset", {
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
    <div className="w-full h-full bg-blue-100 backdrop-blur-sm border border-black/10 rounded-sm shadow-lg p-24 flex flex-col items-center justify-center overflow-y-auto transition-all duration-200 hover:border-black/50 hover:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.15)]">
      <form
        onSubmit={handleSubmit}
        className="relative z-1 flex flex-col items-center gap-5 w-full max-w-[530px] mx-auto"
      >
        <div className="text-center text-black">
          <h1 className="text-4xl font-normal m-0 text-black">
            RESET PASSWORD
          </h1>
          <p className="text-lg m-3 text-center text-black/70">
            Enter a new password for your account
          </p>
        </div>

        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full h-8 px-3 py-2 text-sm text-gray-700 bg-white border-none rounded-sm shadow-sm outline-none transition-all duration-200 focus:shadow-md hover:shadow-md"
        />

        <input
          type="password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          className="w-full h-8 px-3 py-2 text-sm text-gray-700 bg-white border-none rounded-sm shadow-sm outline-none transition-all duration-200 focus:shadow-md hover:shadow-md"
        />

        {error && <div className="text-red-600 text-sm">{error}</div>}
        {message && <div className="text-green-600 text-sm">{message}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-1/2 h-9 px-5 text-sm text-white rounded-sm cursor-pointer shadow-sm font-medium transition-all duration-200 border-none hover:shadow-lg active:shadow-inner disabled:bg-gray-400 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700"
        >
          {loading ? "Resetting..." : "Reset Password"}
        </button>

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
