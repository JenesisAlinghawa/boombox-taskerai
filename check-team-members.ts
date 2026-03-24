import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Checking team membership...");

  // Get all teams
  const teams = await prisma.team.findMany({
    include: {
      owner: {
        select: { id: true, firstName: true, lastName: true, email: true }
      },
      members: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        }
      }
    }
  });

  console.log("Teams found:", teams.length);
  teams.forEach(team => {
    console.log(`Team: ${team.name} (ID: ${team.id})`);
    console.log(`Owner: ${team.owner.firstName} ${team.owner.lastName} (${team.owner.email})`);
    console.log("Members:");
    team.members.forEach(member => {
      console.log(`  - ${member.user.firstName} ${member.user.lastName} (${member.user.email})`);
    });
    console.log("---");
  });

  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});