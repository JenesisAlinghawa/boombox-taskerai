"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { LoadingSpinner } from "@/app/components/ui";
import { saveUserSession } from "@/utils/sessionManager";

export default function VerifyClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get("token");

      if (!token) {
        setStatus("error");
        setMessage("No verification token found in the URL");
        return;
      }

      try {
        const response = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (data.success) {
          setStatus("success");
          setMessage(
            "Email verified successfully! Redirecting to dashboard..."
          );

          // Auto-login: save user session using cloud storage
          if (data.user) {
            saveUserSession(data.user);
          }

          setTimeout(() => {
            router.push("/dashboard");
          }, 2000);
        } else {
          setStatus("error");
          setMessage(data.message || "Failed to verify email");
        }
      } catch (error) {
        setStatus("error");
        setMessage("An error occurred while verifying your email");
      }
    };

    verifyEmail();
  }, [searchParams, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Email Verification</h1>

          {status === "loading" && (
            <>
              <LoadingSpinner />
              <p className="mt-4 text-gray-600">Verifying your email...</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="text-4xl mb-4">✓</div>
              <p className="text-lg text-green-600 font-semibold mb-2">
                {message}
              </p>
              <p className="text-gray-600">You will be redirected shortly...</p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="text-4xl mb-4">✗</div>
              <p className="text-lg text-red-600 font-semibold mb-4">
                {message}
              </p>
              <button
                onClick={() => router.push("/auth/login")}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Return to Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
