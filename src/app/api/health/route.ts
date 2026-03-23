import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET /api/health — Health check endpoint */
export async function GET() {
  let dbConnected = false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbConnected = true;
  } catch (err) {
    // Intencional: capturamos el error para degradar el estado, no para propagarlo
    console.error("[health] Error de conexión a la base de datos:", err);
    dbConnected = false;
  }

  const status = dbConnected ? "healthy" : "degraded";

  return NextResponse.json(
    {
      status,
      db_connected: dbConnected,
      version: process.env.npm_package_version ?? "1.0.0",
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    },
    { status: dbConnected ? 200 : 503 }
  );
}
