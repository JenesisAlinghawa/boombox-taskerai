import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkTasks() {
  try {
    const tasks = await prisma.task.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        updatedAt: true,
      },
    });
    console.log("Tasks in database:");
    console.log(JSON.stringify(tasks, null, 2));
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTasks();
