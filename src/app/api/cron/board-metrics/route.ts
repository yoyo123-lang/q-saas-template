/**
 * Cron job: métricas de negocio al Board de Q Company.
 * Se ejecuta semanalmente (lunes 8:00 UTC) via Vercel Cron.
 *
 * IMPORTANTE: Cada BU debe personalizar collectMetrics() con sus métricas reales.
 * Este template envía métricas genéricas de ejemplo.
 *
 * Seguridad: verifica Authorization: Bearer {CRON_SECRET}.
 */

import { prisma } from "@/lib/db";
import { sendMetrics } from "@/lib/board-client";
import type { BoardMetric } from "@/lib/board-client";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const period = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  try {
    const metrics = await collectMetrics(period);

    if (metrics.length > 0) {
      await sendMetrics(metrics);
      console.log(`[Board] ${metrics.length} métricas enviadas`, { period });
    }

    return Response.json({ success: true, period, count: metrics.length });
  } catch (err) {
    console.error("[Board] Error enviando métricas:", err);
    return Response.json({ error: "Failed to send metrics" }, { status: 500 });
  }
}

/**
 * Recolecta métricas de negocio para enviar al Board.
 *
 * TODO: Personalizar esta función para cada BU con sus métricas reales.
 * Ejemplos de métricas por tipo de BU:
 *
 * - SaaS: mrr, arpu, active_organizations, churn_rate
 * - Marketplace: activos_activos, volumen_transacciones, tasa_conversion
 * - HR: empresas_activas, puestos_publicados, postulaciones_mes
 * - Contabilidad: monthly_revenue, invoices_issued, pos_transactions
 *
 * Cada métrica se envía con try-catch individual para permitir partial failures:
 * si una métrica falla en calcularse, las demás se envían igual.
 */
async function collectMetrics(period: string): Promise<BoardMetric[]> {
  const metrics: BoardMetric[] = [];

  // --- Ejemplo: total de usuarios activos ---
  try {
    const activeUsers = await prisma.user.count({
      where: { role: { not: "INACTIVE" } },
    });
    metrics.push({ key: "active_users", value: activeUsers, period });
  } catch (err) {
    console.error("[Board] Error calculando active_users:", err);
  }

  // --- Ejemplo: total de proyectos ---
  try {
    const totalProjects = await prisma.project.count();
    metrics.push({ key: "total_projects", value: totalProjects, period });
  } catch (err) {
    console.error("[Board] Error calculando total_projects:", err);
  }

  // TODO: Agregar métricas específicas de esta BU
  // metrics.push({ key: "mrr", value: calculatedMrr, period });
  // metrics.push({ key: "arpu", value: calculatedArpu, period });

  return metrics;
}
