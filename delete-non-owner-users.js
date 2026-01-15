const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function deleteNonOwnerUsers() {
  try {
    const result = await prisma.user.deleteMany({
      where: {
        role: {
          not: "OWNER",
        },
      },
    });
    console.log(`✓ Deleted ${result.count} users (kept owner)`);
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

deleteNonOwnerUsers();
