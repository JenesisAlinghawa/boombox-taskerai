import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanDatabase() {
  try {
    console.log("🗑️  Starting database cleanup...\n");

    // Get the owner user
    const owner = await prisma.user.findFirst({
      where: { role: "OWNER" },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    if (!owner) {
      console.error("❌ No OWNER user found. Cannot proceed.");
      return;
    }

    console.log(`👤 Owner Account to Keep: ${owner.firstName} ${owner.lastName} (${owner.email})\n`);

    // Delete all data except the owner user
    console.log("Deleting all related data...");

    // Delete audit logs first (they might reference other entities)
    const auditLogsDeleted = await prisma.auditLog.deleteMany({});
    console.log(`  ✓ Audit Logs: ${auditLogsDeleted.count}`);

    // Delete notifications
    const notificationsDeleted = await prisma.notification.deleteMany({});
    console.log(`  ✓ Notifications: ${notificationsDeleted.count}`);

    // Delete logs
    const logsDeleted = await prisma.log.deleteMany({});
    console.log(`  ✓ Logs: ${logsDeleted.count}`);

    // Delete attachments
    const attachmentsDeleted = await prisma.attachment.deleteMany({});
    console.log(`  ✓ Attachments: ${attachmentsDeleted.count}`);

    // Delete comments
    const commentsDeleted = await prisma.comment.deleteMany({});
    console.log(`  ✓ Comments: ${commentsDeleted.count}`);

    // Delete tasks
    const tasksDeleted = await prisma.task.deleteMany({});
    console.log(`  ✓ Tasks: ${tasksDeleted.count}`);

    // Delete direct messages
    const directMessagesDeleted = await prisma.directMessage.deleteMany({});
    console.log(`  ✓ Direct Messages: ${directMessagesDeleted.count}`);

    // Delete messages
    const messagesDeleted = await prisma.message.deleteMany({});
    console.log(`  ✓ Messages: ${messagesDeleted.count}`);

    // Delete channel editors
    const editorsDeleted = await prisma.channelEditor.deleteMany({});
    console.log(`  ✓ Channel Editors: ${editorsDeleted.count}`);

    // Delete channel members
    const membersDeleted = await prisma.channelMember.deleteMany({});
    console.log(`  ✓ Channel Members: ${membersDeleted.count}`);

    // Delete channels
    const channelsDeleted = await prisma.channel.deleteMany({});
    console.log(`  ✓ Channels: ${channelsDeleted.count}`);

    // Delete team members
    const teamMembersDeleted = await prisma.teamMember.deleteMany({});
    console.log(`  ✓ Team Members: ${teamMembersDeleted.count}`);

    // Delete teams
    const teamsDeleted = await prisma.team.deleteMany({});
    console.log(`  ✓ Teams: ${teamsDeleted.count}`);

    // Delete all users except owner
    const usersDeleted = await prisma.user.deleteMany({
      where: {
        id: { not: owner.id },
      },
    });
    console.log(`  ✓ Other Users: ${usersDeleted.count}`);

    console.log("\n✅ Database cleanup complete!\n");

    // Show final state
    const finalUserCount = await prisma.user.count();
    const finalTaskCount = await prisma.task.count();
    const finalTeamCount = await prisma.team.count();
    const finalChannelCount = await prisma.channel.count();

    console.log("📊 Final Database State:");
    console.log(`  Users: ${finalUserCount} (only owner)`);
    console.log(`  Tasks: ${finalTaskCount}`);
    console.log(`  Teams: ${finalTeamCount}`);
    console.log(`  Channels: ${finalChannelCount}`);
    console.log("\n🚀 Database is ready for fresh data!\n");
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabase();
