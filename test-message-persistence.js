// Test creating a message and verify it persists
const { PrismaClient } = require("@prisma/client");

async function testMessagePersistence() {
  const prisma = new PrismaClient();

  try {
    console.log("Testing message persistence...\n");

    // Get first user
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error("No users found. Create a user first.");
      process.exit(1);
    }

    console.log(
      `Using user: ${user.firstName} ${user.lastName} (ID: ${user.id})\n`
    );

    // Get first channel
    const channel = await prisma.channel.findFirst();
    if (!channel) {
      console.error("No channels found. Create a channel first.");
      process.exit(1);
    }

    console.log(`Using channel: ${channel.name} (ID: ${channel.id})\n`);

    // Create a test message
    const timestamp = new Date().toISOString();
    const testContent = `Test message created at ${timestamp}`;

    console.log("Creating message...");
    const message = await prisma.message.create({
      data: {
        content: testContent,
        senderId: user.id,
        channelId: channel.id,
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    console.log("✅ Message created successfully!");
    console.log(`   ID: ${message.id}`);
    console.log(`   Content: ${message.content}`);
    console.log(
      `   Sender: ${message.sender.firstName} ${message.sender.lastName}`
    );
    console.log(`   Channel ID: ${message.channelId}`);
    console.log(`   Created at: ${message.createdAt}\n`);

    // Verify it was saved
    const foundMessage = await prisma.message.findUnique({
      where: { id: message.id },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (foundMessage) {
      console.log("✅ Message verified in database!");
      console.log(`   Retrieved message: "${foundMessage.content}"\n`);

      // Clean up
      await prisma.message.delete({ where: { id: message.id } });
      console.log("✅ Test message cleaned up.\n");
      console.log("SUCCESS: Messages ARE persisting to the database!");
    } else {
      console.error("❌ Message not found after creation!");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

testMessagePersistence();
