"use client";

import RegisterForm from "@/app/components/auth/registerForm";

export default function RegisterPage() {
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
      {/* Wave decoration layers on the right */}
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

      {/* Left side: Register Form */}
      <div
        style={{
          flex: "0 0 50%", // Takes half the screen on larger screens
          maxWidth: "600px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px",
          zIndex: 1,
        }}
      >
        <RegisterForm />
      </div>

      {/* Right side: Visual space for wave effect */}
      <div
        style={{
          flex: 1,
          minHeight: "100vh",
          // logo
        }}
      />
    </div>
  );
}