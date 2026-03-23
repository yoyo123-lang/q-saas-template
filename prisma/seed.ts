import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminEmail) {
    console.error("ERROR: ADMIN_EMAIL no está definido en las variables de entorno.");
    process.exit(1);
  }

  // Asegurar que el email esté en la allowlist
  await prisma.allowedEmail.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail },
  });

  console.log(`Email ${adminEmail} en allowlist.`);

  // Si el usuario ya existe en DB (ya se logueó antes), promoverlo a ADMIN
  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true, role: true },
  });

  if (existingUser) {
    if (existingUser.role !== "ADMIN") {
      await prisma.user.update({
        where: { email: adminEmail },
        data: { role: "ADMIN" },
      });
      console.log(`Usuario ${adminEmail} promovido a ADMIN.`);
    } else {
      console.log(`Usuario ${adminEmail} ya es ADMIN.`);
    }
  } else {
    console.log(`Usuario ${adminEmail} recibirá rol ADMIN en su primer login.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
