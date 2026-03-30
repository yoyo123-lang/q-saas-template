import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminEmail) {
    console.error("ERROR: ADMIN_EMAIL no está definido en las variables de entorno.");
    process.exit(1);
  }

  // Health check de conexión antes de iniciar
  await prisma.$queryRaw`SELECT 1`;
  console.log("Conexión a la base de datos: OK");

  // --- Auth: admin user ---
  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true, role: true, status: true },
  });

  if (existingUser) {
    const updates: Record<string, unknown> = {};
    if (existingUser.role !== "ADMIN") updates.role = "ADMIN";
    if (existingUser.status !== "ACTIVE") {
      updates.status = "ACTIVE";
      updates.emailVerified = new Date();
    }
    if (Object.keys(updates).length > 0) {
      await prisma.user.update({ where: { email: adminEmail }, data: updates });
      console.log(`Usuario ${adminEmail} actualizado: ${JSON.stringify(updates)}`);
    } else {
      console.log(`Usuario ${adminEmail} ya es ADMIN ACTIVE.`);
    }
  } else {
    // Crear admin sin password — debe configurar acceso vía OAuth o password reset
    await prisma.user.create({
      data: {
        email: adminEmail,
        role: "ADMIN",
        status: "ACTIVE",
        emailVerified: new Date(),
        passwordHash: null,
      },
    });
    console.log(`Usuario admin creado: ${adminEmail} (sin password — configurar vía OAuth o reset).`);
  }

  console.log("Seed completado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
