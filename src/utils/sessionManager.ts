/**
 * Session Manager - Handles employee session persistence using cloud API
 * Replaces localStorage for production deployment
 */

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isVerified?: boolean;
  role?: "EMPLOYEE" | "ADMIN" | "OWNER";
  profilePicture?: string;
  active?: boolean;
  lastActive?: Date;
  emailNotifications?: boolean;
  messageNotifications?: boolean;
}

/**
 * Save employee session to localStorage and cloud
 * In production, this would sync with a cloud database
 */
export const saveUserSession = (employee: User) => {
  if (typeof window !== "undefined") {
    // Store userId in localStorage for API calls
    localStorage.setItem("userId", employee.id.toString());
    // Keep employee data in localStorage as fallback
    localStorage.setItem("user", JSON.stringify(employee));
  }
};

/**
 * Get current user from session API
 */
export const getCurrentUser = async (userId?: string | number): Promise<User | null> => {
  try {
    const id = userId || (typeof window !== "undefined" ? localStorage.getItem("userId") : null);
    
    // If no userId is found, user is not logged in
    if (!id) {
      console.warn("[SessionManager] No userId found in localStorage or parameter");
      return null;
    }
    
    console.log("[SessionManager] Fetching user session with ID:", id);
    const response = await fetch("/api/session-management", {
      headers: { "x-user-id": String(id) },
    });

    if (response.ok) {
      // Check if response has content before parsing
      const contentLength = response.headers.get('content-length');
      const text = await response.text();
      
      if (!text) {
        console.warn("[SessionManager] Empty response body from session API");
        // Continue to fallback logic
      } else {
        try {
          const data = JSON.parse(text);
          console.log("[SessionManager] User session retrieved:", data.user?.email, "ID:", data.user?.id);
          return data.user;
        } catch (parseError) {
          console.error("[SessionManager] Failed to parse session response:", parseError, "Response text:", text.substring(0, 100));
          // Continue to fallback logic
        }
      }
    } else if (response.status === 404) {
      // User not found - clear stale session and redirect to login
      console.warn("[SessionManager] User not found - session may be stale. Clearing localStorage...");
      if (typeof window !== "undefined") {
        localStorage.removeItem("userId");
        localStorage.removeItem("user");
      }
      // Redirect to login page if in browser  
      if (typeof window !== "undefined" && !window.location.pathname.includes("/auth")) {
        console.log("[SessionManager] Redirecting to login...");
        window.location.href = "/auth/login";
      }
      return null;
    } else {
      // Server error (5xx) or unexpected status - log but continue to fallback
      console.warn("[SessionManager] Session API returned", response.status, "for userId:", id, "- Will use localStorage fallback");
      // Continue to fallback logic below instead of returning null
    }
  } catch (error) {
    console.error("[SessionManager] Failed to fetch user session:", error);
  }

  // Fallback to localStorage only if it exists AND has valid UUID format
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // UUID validation: should be 36 chars with dashes (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
        if (parsed.id && typeof parsed.id === 'string' && parsed.id.includes('-') && parsed.id.length === 36) {
          console.warn("[SessionManager] Using fallback localStorage user data");
          return parsed;
        } else {
          console.warn("[SessionManager] Stale localStorage data detected (integer ID), clearing...");
          localStorage.removeItem("user");
        }
      } catch (e) {
        console.warn("[SessionManager] Failed to parse localStorage user data", e);
        localStorage.removeItem("user");
      }
    }
  }

  return null;
};

/**
 * Clear user session
 */
export const clearUserSession = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("userId");
    localStorage.removeItem("user");
  }
};

/**
 * Check if user is logged in
 */
export const isLoggedIn = (): boolean => {
  if (typeof window !== "undefined") {
    return !!localStorage.getItem("userId");
  }
  return false;
};
