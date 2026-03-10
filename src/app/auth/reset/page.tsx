"use client";

import React, { Suspense } from "react";
import ResetForm from "@/app/components/auth/PasswordResetFormComponent";
import Image from "next/image";

export default function ResetPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        background: "transparent",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* TaskerAI Logo - Top Left */}
      <div
        style={{
          position: "absolute",
          top: 24,
          left: 24,
          zIndex: 10,
        }}
      >
        <Image
          src="/assets/images/taskeraiLogo.png"
          alt="TaskerAI"
          width={48}
          height={48}
          priority
          style={{ cursor: "pointer" }}
        />
      </div>

      {/* Main Content - Two Column Layout */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          paddingLeft: "180px",
          paddingRight: "20px",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* Left Column - Form Container (Smaller) */}
        <div
          style={{
            width: "530px",
            height: "620px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Suspense fallback={<div>Loading...</div>}>
            <ResetForm />
          </Suspense>
        </div>
      </div>

      {/* Right Column - Boombox Image */}
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: "45%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1,
        }}
      >
        <Image
          src="/assets/images/BBX-Logo.png"
          alt="Boombox"
          width={400}
          height={400}
          style={{
            objectFit: "contain",
            opacity: 0.9,
          }}
        />
      </div>
    </div>
  );
}
