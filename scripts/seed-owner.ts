/**
 * Seed Script: Create Initial OWNER Account
 * 
 * This script creates a one-time bootstrap OWNER account for TaskerAI.
 * The OWNER is the only user who can promote others and manage roles.
 * 
 * Usage:
 *   npx ts-node scripts/seed-owner.ts
 * 
 * Or add to package.json:
 *   "seed:owner": "ts-node scripts/seed-owner.ts"
 * 
 * IMPORTANT: After running this script:
 * 1. Change the dummy email from "owner.dummy@gmail.com" to your real email (e.g., "liz@boombox.com")
 * 2. Update the password to a secure value
 * 3. The hashed password below should be changed immediately in production
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  try {
    // Dummy owner email - CHANGE THIS TO YOUR ACTUAL EMAIL
    const ownerEmail = "owner.dummy@gmail.com"; // TODO: Change to liz@boombox.com or actual owner email
    const ownerPassword = "ChangeMe@123456"; // TODO: Change to secure password in production

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
