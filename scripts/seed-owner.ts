/**
 * Seed Script: Create Initial OWNER Account with UUID
 * 
 * This script creates a one-time bootstrap OWNER account for TaskerAI.
 * The OWNER is the only user who can promote others and manage roles.
 * 
 * Role System (3-tier):
 * - OWNER: Full system access. Bootstrap account created via this script.
 * - ADMIN: High permissions. Can manage users and tasks (except full workspace deletion).
 * - EMPLOYEE: Standard role. Can create/edit own tasks and comment.
 * 
 * Security Notes:
 * - This account has full system access - protect credentials carefully
 * - Only run this once per environment
 * - Change the email and password BEFORE running in production
 * - All user IDs are generated as UUIDs automatically
 * 
 * Usage:
 *   npx ts-node scripts/seed-owner.ts
 * 
 * IMPORTANT: After running this script:
 * 1. Change email to REAL EMAIL (e.g., "liz@taskerai.com")
 * 2. Update password to a strong value
 * 3. Store credentials in secure password manager
 * 4. Never commit real credentials to version control
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  try {
    // CHANGE TO REAL EMAIL IN PRODUCTION
    const ownerEmail = "jenesissanchezalinghawa@gmail.com";
    const ownerPassword = "Jenesis@21";

    // Check if owner already exists
    const existingOwner = await prisma.user.findUnique({
      where: { email: ownerEmail.toLowerCase() },
    });

    if (existingOwner) {
      console.log(
        `✓ OWNER account already exists: ${existingOwner.email} (ID: ${existingOwner.id}, Role: ${existingOwner.role})`
      );
      return;
    }

    // Hash password using bcryptjs
    const hashedPassword = await bcrypt.hash(ownerPassword, 12);

    // Create OWNER user with auto-generated UUID
    const owner = await prisma.user.create({
      data: {
        email: ownerEmail.toLowerCase(),
        password: hashedPassword,
        firstName: "System",
        lastName: "Owner",
        role: "OWNER",
        isVerified: true,
        active: true,
        lastActive: new Date(),
      },
    });

    console.log(`✓ OWNER account created successfully!`);
    console.log(`  Email: ${owner.email}`);
    console.log(`  Name: ${owner.firstName} ${owner.lastName}`);
    console.log(`  Role: ${owner.role}`);
    console.log(`  ID (UUID): ${owner.id}`);
    console.log(`\n⚠️  IMPORTANT SECURITY NOTICE:`);
    console.log(`  - Change the password immediately before production deployment`);
    console.log(`  - Current password: ${ownerPassword}`);
    console.log(`  - Update email to real owner address (e.g., liz@taskerai.com)`);
    console.log(`  - Store credentials in a secure password manager`);
  } catch (error) {
    console.error("✗ Error creating OWNER account:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
