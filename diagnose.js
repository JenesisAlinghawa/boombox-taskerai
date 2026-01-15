// Simple diagnostic test using Node.js directly
const { PrismaClient } = require("@prisma/client");

async function diagnose() {
  const prisma = new PrismaClient();

  try {
    console.log("🔍 Starting diagnostic test...\n");

    // Test 1: Database connection
    try {
      console.log("1️⃣  Testing database connection...");
      const user = await prisma.user.findFirst();
      console.log("✅ Database connection: SUCCESS");
      console.log(`   Found ${user ? "1 user" : "no users"} in database\n`);
    } catch (error) {
      console.error("❌ Database connection: FAILED");
      console.error(`   Error: ${error.message}\n`);
      throw error;
    }

    // Test 2: Check Message table
    try {
      console.log("2️⃣  Checking Message table...");
      const messageCount = await prisma.message.count();
      console.log(`✅ Message table: OK (${messageCount} messages)\n`);
    } catch (error) {
      console.error("❌ Message table: ERROR");
      console.error(`   Error: ${error.message}\n`);
      throw error;
    }

    // Test 3: Check DirectMessage table
    try {
      console.log("3️⃣  Checking DirectMessage table...");
      const dmCount = await prisma.directMessage.count();
      console.log(`✅ DirectMessage table: OK (${dmCount} direct messages)\n`);
    } catch (error) {
      console.error("❌ DirectMessage table: ERROR");
      console.error(`   Error: ${error.message}\n`);
      throw error;
    }

    // Test 4: Check Channel table
    try {
      console.log("4️⃣  Checking Channel table...");
      const channelCount = await prisma.channel.count();
      console.log(`✅ Channel table: OK (${channelCount} channels)\n`);
    } catch (error) {
      console.error("❌ Channel table: ERROR");
      console.error(`   Error: ${error.message}\n`);
      throw error;
    }

    console.log("✅ All diagnostics complete!\n");
    console.log("Summary:");
    console.log("- Database connection: ✅");
    console.log("- Message table: ✅");
    console.log("- DirectMessage table: ✅");
    console.log("- Channel table: ✅");
    console.log("\nDatabase is properly configured and tables exist.\n");
  } catch (error) {
    console.error("\n❌ Diagnostic failed. This could mean:");
    console.error("1. PostgreSQL server is not running");
    console.error("2. DATABASE_URL in .env.local is incorrect");
    console.error('3. The database "taskerai_db" does not exist');
    console.error("4. Migrations have not been run\n");
    console.error("To fix, run: npx prisma migrate deploy\n");
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

diagnose();
