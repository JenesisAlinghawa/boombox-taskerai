"use client";

import ForgotPasswordForm from "@/app/components/auth/forgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "680px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          boxSizing: "border-box",
        }}
      >
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
