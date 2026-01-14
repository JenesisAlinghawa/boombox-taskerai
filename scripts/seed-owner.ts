/**
 * Seed Script: Create Initial OWNER Account
 * 
 * This script creates a one-time bootstrap OWNER account for TaskerAI.
 * The OWNER is the only user who can promote others and manage roles.
 * 
 * Security Notes:
 * - This account has full system access - protect credentials carefully
 * - Only run this once per environment
 * - Change the email and password BEFORE running in production
 * - The OWNER is the only user who can promote other users to CO_OWNER
 * - CO_OWNER cannot promote users (prevents privilege escalation)
 * 
 * Usage:
 *   npx ts-node scripts/seed-owner.ts
 * 
 * IMPORTANT: After running this script:
 * 1. Change email to REAL EMAIL AFTER DEFENSE (e.g., "liz@boombox.com")
 * 2. Update password to a strong value
 * 3. Store credentials in secure password manager
 * 4. Never commit real credentials to version control
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  try {
    // CHANGE TO REAL EMAIL AFTER DEFENSE (e.g., "liz@boombox.com")
    const ownerEmail = "jenesissanchezalinghawa@gmail.com"; // TODO: Change to real email after defense
    const ownerPassword = "Jenesis@21"; // TODO: Change to secure password in production

    // Check if owner already exists
    const existingOwner = await prisma.user.findUnique({
      where: { email: ownerEmail.toLowerCase() },
    });

    if (existingOwner) {
      console.log(
        `✓ OWNER account already exists: ${existingOwner.email} (Role: ${existingOwner.role})`
      );
      return;
    }

    // Hash password using bcryptjs
    const hashedPassword = await bcrypt.hash(ownerPassword, 12);

    // Create OWNER user
    const owner = await prisma.user.create({
      data: {
        email: ownerEmail.toLowerCase(),
        password: hashedPassword,
        name: "System Owner",
        role: "OWNER", // Bootstrap as OWNER
        isVerified: true, // Owner is auto-verified
      },
    });

    console.log(`✓ OWNER account created successfully!`);
    console.log(`  Email: ${owner.email}`);
    console.log(`  Name: ${owner.name}`);
    console.log(`  Role: ${owner.role}`);
    console.log(`  ID: ${owner.id}`);
    console.log(`\n⚠️  IMPORTANT: Change the password immediately in production!`);
    console.log(`  - Default password: ${ownerPassword}`);
    console.log(`  - Update email to real owner email (liz@boombox.com)`);
  } catch (error) {
    console.error("✗ Error creating OWNER account:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
