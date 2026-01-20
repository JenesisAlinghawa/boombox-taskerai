import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/utils/sessionManager";

/**
 * Hook to protect pages that require authentication
 * Redirects to login if user is not logged in
 * Also handles browser back button to prevent accessing cached protected pages
 */
export const useAuthProtection = () => {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          // No user found, redirect to login
          router.push("/auth/login");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        router.push("/auth/login");
      }
    };

    // Check auth on component mount
    checkAuth();

    // Also check auth when user navigates back (browser back button)
    const handlePopState = () => {
      checkAuth();
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [router]);
};

