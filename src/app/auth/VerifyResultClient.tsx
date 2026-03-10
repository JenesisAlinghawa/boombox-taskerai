"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import LoginForm from "@/app/components/auth/UserLoginFormComponent";
import Image from "next/image";

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
    <div className="min-h-screen w-screen flex flex-col bg-transparent relative overflow-hidden">
      {/* TaskerAI Logo - Top Left */}
      <div className="absolute top-6 left-6 z-10">
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
      <div className="flex-1 flex items-center justify-start pl-[180px] pr-5 relative z-20">
        {/* Left Column - Verification Message */}
        <div className="w-[530px] h-[620px] bg-blue-100 backdrop-blur-sm border border-black/10 rounded-sm shadow-lg p-32 flex flex-col items-center justify-center gap-5 transition-all duration-200 hover:border-black/50 hover:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.15)]">
          <h1 className="text-4xl font-normal m-0 text-black text-center">
            {status === "success" ? "Email Verified" : "Verification Error"}
          </h1>
          <p
            className={`text-lg m-0 text-center ${
              status === "success" ? "text-green-600" : "text-red-600"
            }`}
          >
            {message}
          </p>

          {status === "error" && <LoginForm />}
        </div>
      </div>

      {/* Right Column - Boombox Image */}
      <div className="absolute right-0 top-0 w-[45%] h-full flex items-center justify-center z-0">
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
