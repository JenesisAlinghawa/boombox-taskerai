import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupAllTasks() {
  try {
    console.log('Deleting all data...');
    
    // Delete in order of dependencies
    const deletedComments = await prisma.comment.deleteMany({});
    console.log(`Deleted ${deletedComments.count} comments`);
    
    const deletedAttachments = await prisma.attachment.deleteMany({});
    console.log(`Deleted ${deletedAttachments.count} attachments`);
    
    const deletedTasks = await prisma.task.deleteMany({});
    console.log(`Deleted ${deletedTasks.count} tasks`);
    
    console.log('All tasks, comments, and attachments have been deleted!');
  } catch (error) {
    console.error('Error deleting data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupAllTasks();
