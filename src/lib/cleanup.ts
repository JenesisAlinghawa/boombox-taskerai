import prisma from "@/lib/prisma";

/**
 * Delete pending users (active: false) who have not been approved within the specified duration
 * @param durationMinutes - Duration in minutes (default: 60 for 1 hour)
 */
export async function deletePendingUsers(durationMinutes: number = 60) {
  try {
    const cutoffTime = new Date(Date.now() - durationMinutes * 60 * 1000);

    const deletedUsers = await prisma.user.deleteMany({
      where: {
        active: false, // Not approved
        createdAt: {
          lt: cutoffTime, // Created before cutoff time
        },
      },
    });

    if (deletedUsers.count > 0) {
      console.log(
        `[Cleanup] Deleted ${deletedUsers.count} pending users older than ${durationMinutes} minutes`
      );
    }

    return deletedUsers.count;
  } catch (error) {
    console.error("[Cleanup] Error deleting pending users:", error);
    return 0;
  }
}
