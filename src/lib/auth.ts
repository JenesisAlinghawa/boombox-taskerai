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
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isVerified: boolean;
  active: boolean;
  lastActive: Date | null;
  profilePicture: string | null;
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
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isVerified: true,
        active: true,
        lastActive: true,
        profilePicture: true,
      },
    });

    return user || null;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

/**
 * Helper function to extract user ID from request headers
 * 
 * @param req - NextRequest object
 * @returns string | null - User ID (UUID) or null
 */
export function getUserIdFromRequest(req: NextRequest): string | null {
  return req.headers.get("x-user-id");
}

/**
 * Checks if user has permission to manage users (CRUD operations)
 * 
 * Only OWNER and ADMIN can manage users
 * EMPLOYEE cannot create, edit, or delete users
 * 
 * Why EMPLOYEE is restricted:
 * - EMPLOYEE is the default role for new users
 * - Prevents unauthorized users from managing the system
 * - Maintains security and data integrity
 * - Only vetted Admins/Owner can modify user accounts
 * 
 * @param role - User role to check
 * @returns boolean - true if user can manage users
 */
export function canManageUsers(role: Role): boolean {
  return role === "OWNER" || role === "ADMIN";
}

/**
 * Checks if user has permission to access team management
 * 
 * Only OWNER and ADMIN can access team management
 * 
 * @param role - User role to check
 * @returns boolean - true if user can access team management
 */
export function canAccessTeamManagement(role: Role): boolean {
  return role === "OWNER" || role === "ADMIN";
}

/**
 * Checks if user has permission to promote other users to ADMIN
 * 
 * How Admin Promotion Works:
 * - Only OWNER can promote users to ADMIN
 * - ADMIN cannot promote other users (prevents privilege escalation)
 * - This ensures a clear chain of command
 * 
 * @param role - User role to check
 * @returns boolean - true if user can promote users
 */
export function canPromoteUsers(role: Role): boolean {
  return role === "OWNER";
}

/**
 * Gets the role hierarchy level (higher number = higher privilege)
 * Used to determine if one user can assign another user to tasks
 * 
 * @param role - User role
 * @returns number - Hierarchy level (1-3)
 */
export function getRoleHierarchyLevel(role: Role): number {
  const hierarchy: { [key in Role]: number } = {
    EMPLOYEE: 1,
    ADMIN: 2,
    OWNER: 3,
  };
  return hierarchy[role] || 0;
}

/**
 * Checks if one role can assign users of another role to tasks
 * A user can only assign users at their own level or below
 * 
 * @param assignerRole - Role of the user doing the assignment
 * @param assigneeRole - Role of the user being assigned
 * @returns boolean - true if assignment is allowed
 */
export function canAssignRole(assignerRole: Role, assigneeRole: Role): boolean {
  return getRoleHierarchyLevel(assignerRole) >= getRoleHierarchyLevel(assigneeRole);
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

  // OWNER can promote to ADMIN
  // OWNER cannot promote to OWNER
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
  return ["EMPLOYEE", "ADMIN", "OWNER"].includes(role);
}

/**
 * Checks if user can assign tasks to specific users
 * EMPLOYEE can only assign to themselves
 * ADMIN and OWNER can assign to anyone
 * 
 * @param role - User role
 * @param assigneeId - ID of user being assigned (UUID)
 * @param currentUserId - Current user's ID (UUID)
 * @returns boolean
 */
export async function canAssignTask(role: Role, assigneeId: string, currentUserId: string): Promise<boolean> {
  // EMPLOYEE can only assign to themselves
  if (role === "EMPLOYEE") {
    return assigneeId === currentUserId;
  }
  
  // ADMIN and OWNER can assign to anyone
  return true;
}

/**
 * Checks if a user can assign a task to another user based on role hierarchy
 * EMPLOYEE can only assign to EMPLOYEE
 * ADMIN can assign to EMPLOYEE and ADMIN
 * OWNER can assign to anyone
 * 
 * @param assignerRole - Role of the user creating/assigning the task
 * @param assigneeRole - Role of the user being assigned the task
 * @returns boolean - true if assignment is allowed
 */
export function canAssignRoleHierarchy(assignerRole: Role, assigneeRole: Role): boolean {
  const assignerLevel = getRoleHierarchyLevel(assignerRole);
  const assigneeLevel = getRoleHierarchyLevel(assigneeRole);
  
  // Can only assign to someone at same level or lower
  return assignerLevel >= assigneeLevel;
}
