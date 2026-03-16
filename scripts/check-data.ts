import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function check() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });
    console.log("\n=== USERS ===");
    console.log(JSON.stringify(users, null, 2));

    const tasks = await prisma.task.findMany({
      select: {
        id: true,
        title: true,
        createdById: true,
        status: true,
      },
    });
    console.log("\n=== TASKS ===");
    console.log(JSON.stringify(tasks, null, 2));

    console.log(`\nTotal Users: ${users.length}`);
    console.log(`Total Tasks: ${tasks.length}`);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

check();
