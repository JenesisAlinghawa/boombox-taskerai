/**
 * Session Manager - Handles employee session persistence using cloud API
 * Replaces localStorage for production deployment
 */

export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  isVerified?: boolean;
  role?: "EMPLOYEE" | "TEAM_LEAD" | "MANAGER" | "CO_OWNER" | "OWNER";
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
export const saveUserSession = (employee: Employee) => {
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
      return null;
    }
    
    const response = await fetch("/api/session-management", {
      headers: { "x-user-id": String(id) },
    });

    if (response.ok) {
      const data = await response.json();
      return data.user;
    }
  } catch (error) {
    console.error("Failed to fetch user session:", error);
  }

  // Fallback to localStorage only if it exists
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
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
