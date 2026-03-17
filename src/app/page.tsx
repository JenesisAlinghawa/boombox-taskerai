"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/utils/sessionManager";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          router.push("/dashboard");
        } else {
          router.push("/auth/login");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        router.push("/auth/login");
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen w-full">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
