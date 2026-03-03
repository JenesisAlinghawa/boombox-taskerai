"use client";

import RegisterForm from "@/app/components/auth/registerForm";

export default function RegisterPage() {
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
        <RegisterForm />
      </div>
    </div>
  );
}
