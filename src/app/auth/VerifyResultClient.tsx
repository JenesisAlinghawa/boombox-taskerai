"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import LoginForm from "@/app/components/auth/loginForm";

type Props = {
  status: "success" | "error";
  message: string;
};

export default function VerifyResultClient({ status, message }: Props) {
  const router = useRouter();

  useEffect(() => {
    if (status === "success") {
      // Auto-login: redirect to dashboard after 2 seconds
      const t = setTimeout(() => router.push("/dashboard"), 2000);
      return () => clearTimeout(t);
    }
  }, [status, router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        display: "flex",
        background: "linear-gradient(to right, #a0d8ef 0%, #D2DBEC 70%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: "60%",
          height: "100%",
          background: "linear-gradient(to left, #5d8bb1 0%, transparent 100%)",
          borderRadius: "20% 0 0 50%",
          transform: "translateX(30%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: "70%",
          height: "100%",
          background: "linear-gradient(to left, #4a7ba0 30%, transparent 100%)",
          borderRadius: "20% 0 0 50%",
          transform: "translateX(20%)",
        }}
      />

      <div
        style={{
          flex: "0 0 50%",
          maxWidth: "600px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px",
          zIndex: 1,
        }}
      >
        <div style={{ width: "100%", maxWidth: 420 }}>
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <h1 style={{ fontSize: 20, margin: 0 }}>
              {status === "success" ? "Email Verified" : "Verification Error"}
            </h1>
            <p style={{ color: status === "success" ? "#2ecc71" : "#e74c3c" }}>
              {message}
            </p>
          </div>

          {status === "error" && <LoginForm />}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: "100vh" }} />
    </div>
  );
}
