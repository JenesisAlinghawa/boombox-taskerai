/**
 * Authentication Helper Module
 * 
 * Provides server-side utilities for role-based access control in Next.js App Router.
 * Used in API routes and Server Components to verify user identity and permissions.
 */

import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";

/**
 * User session type returned by getCurrentUser
 */
export interface UserSession {
  id: number;
  email: string;
  name: string | null;
  role: Role;
  isVerified: boolean;
}

/**
 * Gets the current user from the x-user-id header (set by session manager)
 * This is used in API routes and server components
 * 
 * @param req - NextRequest object (API routes)
 * @returns UserSession | null
 */
export async function getCurrentUser(
  req: NextRequest
): Promise<UserSession | null> {
  try {
    const userId = req.headers.get("x-user-id");

    if (!userId) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isVerified: true,
      },
    });

    return user || null;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

/**
 * Checks if user has permission to manage users (CRUD operations)
 * 
 * Only OWNER, CO_OWNER, and MANAGER can manage users
 * EMPLOYEE and TEAM_LEAD cannot create, edit, or delete users
 * 
 * Why EMPLOYEE is restricted:
 * - EMPLOYEE is the default role for new users
 * - Prevents unauthorized users from managing the system
 * - Maintains security and data integrity
 * - Only vetted managers can modify user accounts
 * 
 * @param role - User role to check
 * @returns boolean - true if user can manage users
 */
export function canManageUsers(role: Role): boolean {
  return role === "OWNER" || role === "CO_OWNER" || role === "MANAGER";
}

/**
 * Checks if user has permission to access team management
 * 
 * Only OWNER, CO_OWNER, and MANAGER can access team management
 * 
 * @param role - User role to check
 * @returns boolean - true if user can access team management
 */
export function canAccessTeamManagement(role: Role): boolean {
  return role === "OWNER" || role === "CO_OWNER" || role === "MANAGER";
}

/**
 * Checks if user has permission to promote other users to CO_OWNER
 * 
 * How Co-Owner Delegation Works:
 * - Only OWNER can promote users to CO_OWNER
 * - CO_OWNER cannot promote other users (prevents privilege escalation)
 * - This ensures a clear chain of command
 * - Multiple CO_OWNERS can exist but only OWNER controls promotions
 * 
 * @param role - User role to check
 * @returns boolean - true if user can promote users
 */
export function canPromoteUsers(role: Role): boolean {
  return role === "OWNER";
}

/**
 * Checks if user can promote to a specific role
 * 
 * @param userRole - Current user's role
 * @param targetRole - Role to promote to
 * @returns boolean - true if promotion is allowed
 */
export function canPromoteTo(userRole: Role, targetRole: Role): boolean {
  // Only OWNER can promote
  if (userRole !== "OWNER") {
    return false;
  }

  // OWNER can promote to CO_OWNER or MANAGER
  // OWNER cannot demote itself
  if (targetRole === "OWNER") {
    return false; // Cannot promote to OWNER
  }

  return true;
}

/**
 * Validates if a role is valid for promotion
 * 
 * @param role - Role to validate
 * @returns boolean - true if role is valid
 */
export function isValidRole(role: string): role is Role {
  return ["EMPLOYEE", "TEAM_LEAD", "MANAGER", "CO_OWNER", "OWNER"].includes(
    role
  );
}
