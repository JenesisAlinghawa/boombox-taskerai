"use client";

import ForgotPasswordForm from "@/app/components/auth/forgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        display: "flex",
        background: "linear-gradient(to right, #a0d8ef 0%, #6b9ac4 70%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Same wave background as login/register */}
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: "60%",
          height: "100%",
          background: "linear-gradient(to left, #5d8bb1 0%, transparent 100%)",
          borderRadius: "50% 0 0 50%",
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
          background: "linear-gradient(to left, #4a7ba0 0%, transparent 100%)",
          borderRadius: "50% 0 0 50%",
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
        <ForgotPasswordForm />
      </div>

      <div style={{ flex: 1, minHeight: "100vh" }} />
    </div>
  );
}