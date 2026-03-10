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
      label: "1 uppercase letter",
      test: (p: string) => /[A-Z]/.test(p),
    },
    {
      key: "lower",
      label: "1 lowercase letter",
      test: (p: string) => /[a-z]/.test(p),
    },
    {
      key: "number",
      label: "1 number",
      test: (p: string) => /[0-9]/.test(p),
    },
    {
      key: "special",
      label: "1 special character",
      test: (p: string) => /[!@#$%^&*(),.?"{}|<>]/.test(p),
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    (async () => {
      try {
        // Check ALL password rules including length
        const failed = passwordRules
          .filter((r) => !r.test(password))
          .map((r) => r.label);
        if (failed.length) {
          let errorMessage = "Password must include: ";
          if (failed.length === 1) {
            errorMessage += failed[0];
          } else if (failed.length === 2) {
            errorMessage += failed.join(" and ");
          } else {
            errorMessage +=
              failed.slice(0, -1).join(", ") +
              ", and " +
              failed[failed.length - 1];
          }
          setError(errorMessage);
          setLoading(false);
          return;
        }

        const res = await fetch("/api/authentication-endpoints/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firstName, lastName, email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          // Map server message for clarity
          const msg = (data.error || "Registration failed").toString();

          // Check more specific matches first
          if (/address/i.test(msg)) {
            setError("This email address doesn't exist");
          } else if (/domain/i.test(msg)) {
            setError("This email domain doesn't exist");
          } else if (res.status === 409 || /^Email already exists/i.test(msg)) {
            setError("This email already has an account");
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
    <div className="w-full h-full bg-blue-100 backdrop-blur-sm border border-black/10 rounded-sm shadow-lg p-18 flex flex-col items-center justify-center overflow-hidden transition-all duration-200 hover:border-black/50 hover:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.15)]">
      <form
        onSubmit={handleSubmit}
        className="relative z-1 flex flex-col items-center gap-5 w-full max-w-[530px] mx-auto"
      >
        <div className="text-center text-black">
          <h1 className="text-4xl font-normal m-0 text-black">
            REGISTER TO TASKERAI
          </h1>
          <p className="text-lg m-3 text-center text-black/70">
            Please enter your details
          </p>
        </div>

        {/* First Name and Last Name - Side by Side */}
        <div className="flex gap-3 w-full">
          <input
            type="text"
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            className="flex-1 w-1/2 h-8 px-3 py-2 text-sm text-gray-700 bg-white border-none rounded-sm shadow-sm outline-none transition-all duration-200 focus:shadow-md hover:shadow-md"
          />
          <input
            type="text"
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            className="flex-1 w-1/2 h-8 px-3 py-2 text-sm text-gray-700 bg-white border-none rounded-sm shadow-sm outline-none transition-all duration-200 focus:shadow-md hover:shadow-md"
          />
        </div>

        {/* Email */}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full h-8 px-3 py-2 text-sm text-gray-700 bg-white border-none rounded-sm shadow-sm outline-none transition-all duration-200 focus:shadow-md hover:shadow-md"
        />

        {/* Password */}
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

        {/* Password Strength and Instructions */}
        <div className="w-full mt-2">
          <div className="mb-2">
            <span className="text-sm text-blue-400 font-medium">
              Password strength:
            </span>
            {password &&
              (() => {
                // Count all password rules
                const passed = passwordRules.filter((r) =>
                  r.test(password),
                ).length;
                let strength = "Weak";
                let strengthColor = "text-red-600";

                if (passed >= 3) {
                  strength = "Medium";
                  strengthColor = "text-yellow-600";
                }
                if (passed === 5) {
                  strength = "Strong";
                  strengthColor = "text-green-600";
                }
                return (
                  <span className={`text-sm ml-2 font-medium ${strengthColor}`}>
                    {strength} ({passed}/5 requirements met)
                  </span>
                );
              })()}
          </div>

          {/* Instruction Text */}
          <p className="text-xs text-black/70 m-0 leading-relaxed">
            Your password must be at least 8 characters and include one
            uppercase letter, one lowercase letter, one number, and one special
            character.
          </p>
        </div>

        <div className="relative w-full">
          <input
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full h-8 px-3 py-2 text-sm text-gray-700 bg-white border-none rounded-sm shadow-sm outline-none transition-all duration-200 focus:shadow-md hover:shadow-md"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((s) => !s)}
            className="absolute right-2 top-1 h-6 px-2 text-sm border-none bg-transparent cursor-pointer text-blue-600 hover:text-blue-800 transition-colors"
          >
            {showConfirmPassword ? "Hide" : "Show"}
          </button>
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        {/* Register Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-1/2 h-9 px-5 text-sm text-white rounded-sm cursor-pointer shadow-sm font-medium transition-all duration-200 border-none hover:shadow-lg active:shadow-inner disabled:bg-gray-400 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700"
        >
          {loading ? "Registering..." : "Register"}
        </button>

        {showSuccess && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div
              role="dialog"
              aria-modal="true"
              className="bg-white p-6 rounded-lg w-90 text-center shadow-2xl"
            >
              <h2 className="text-black text-sm m-0 mb-3 font-medium">
                Account created
              </h2>
              <p className="text-gray-800 text-sm mb-5">
                Please check your email (including your spam folder) to verify
                your account before signing in.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => {
                    setShowSuccess(false);
                    window.location.href = "/auth/login";
                  }}
                  className="w-45 h-8 text-sm bg-blue-600 text-white border-none rounded-sm cursor-pointer hover:bg-blue-700 transition-colors"
                >
                  Go to login
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Back to Login */}
        <p className="text-black/80 text-sm mt-5">
          Already have an account?{" "}
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
