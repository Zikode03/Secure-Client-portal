import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.audit.deleteMany();
  await prisma.loginActivity.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.document.deleteMany();
  await prisma.task.deleteMany();
  await prisma.request.deleteMany();
  await prisma.message.deleteMany();
  await prisma.session.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  console.log("Seed complete. Database is empty (no mock/demo data inserted).");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
