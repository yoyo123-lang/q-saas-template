/**
 * Cron job: heartbeat al Board de Q Company.
 * Se ejecuta cada 5 minutos via Vercel Cron.
 * Si no llega heartbeat en 15 min, el Board genera alerta automática.
 *
 * Seguridad: verifica Authorization: Bearer {CRON_SECRET}.
 */

import { prisma } from "@/lib/db";
import { sendHeartbeat } from "@/lib/board-client";
import type { HeartbeatChecks } from "@/lib/board-client";

export const runtime = "nodejs";

const startTime = Date.now();

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const version = process.env.npm_package_version ?? "0.0.1";

  // Health checks
  const checks: HeartbeatChecks = { api: "ok", db: "ok" };
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    checks.db = "error";
  }

  try {
    await sendHeartbeat(version, uptimeSeconds, checks);
    console.log("[Board] Heartbeat enviado correctamente");
    return Response.json({ success: true });
  } catch (err) {
    console.error("[Board] Heartbeat fallido:", err);
    return Response.json({ error: "Heartbeat failed" }, { status: 500 });
  }
}
