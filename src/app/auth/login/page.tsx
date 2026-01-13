"use client";

import LoginForm from "@/app/components/auth/loginForm";

export default function LoginPage() {
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
      {/* Wave decoration layers on the right */}
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

      {/* Left side: Login Form */}
      <div
        style={{
          flex: "0 0 50%", // Takes half the screen on larger displays
          maxWidth: "600px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px",
          zIndex: 1,
        }}
      >
        <LoginForm />
      </div>

      {/* Right side: Empty space for the wave design */}
      <div
        style={{
          flex: 1,
          minHeight: "100vh",
          // Optional: add logo or illustration here later
        }}
      />
    </div>
  );
}