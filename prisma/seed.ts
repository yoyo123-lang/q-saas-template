import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminEmail) {
    console.error("ERROR: ADMIN_EMAIL no está definido en las variables de entorno.");
    process.exit(1);
  }

  const existing = await prisma.allowedEmail.findUnique({
    where: { email: adminEmail },
  });

  if (existing) {
    console.log(`El email ${adminEmail} ya está en la allowlist.`);
    return;
  }

  await prisma.allowedEmail.create({
    data: { email: adminEmail },
  });

  console.log(`Email ${adminEmail} agregado a la allowlist como admin.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
