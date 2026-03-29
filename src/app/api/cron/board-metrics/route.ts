/**
 * Cron job: métricas de negocio al Board de Q Company.
 * Se ejecuta semanalmente (lunes 8:00 UTC) via Vercel Cron.
 *
 * IMPORTANTE: Cada BU debe personalizar collectMetrics() en src/lib/board-metrics.ts.
 *
 * Seguridad: verifica Authorization: Bearer {CRON_SECRET}.
 */

import { collectAndSendMetrics } from "@/lib/board-metrics";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await collectAndSendMetrics();
    return Response.json({ success: true });
  } catch (err) {
    console.error("[Board] Error enviando métricas:", err);
    return Response.json({ error: "Failed to send metrics" }, { status: 500 });
  }
}
