/**
 * Recolección de métricas de negocio para el Board de Q Company.
 *
 * Este archivo es la ÚNICA fuente de verdad para las métricas.
 * Se usa tanto desde el cron semanal como desde el handler METRICS_REQUEST.
 *
 * TODO: Personalizar con las métricas reales de esta BU.
 * Cada métrica tiene try-catch individual para permitir partial failures.
 */

import { prisma } from "@/lib/db";
import { sendMetrics } from "@/lib/board-client";
import type { BoardMetric } from "@/lib/board-client";

/**
 * Recolecta métricas de negocio específicas de esta BU.
 * Usa try-catch por métrica para permitir partial failures.
 *
 * Ejemplos de métricas por tipo de BU:
 * - SaaS: mrr, arpu, active_organizations, churn_rate
 * - Marketplace: activos_activos, volumen_transacciones, tasa_conversion
 * - HR: empresas_activas, puestos_publicados, postulaciones_mes
 * - Contabilidad: monthly_revenue, invoices_issued, pos_transactions
 */
export async function collectMetrics(period: string): Promise<BoardMetric[]> {
  const metrics: BoardMetric[] = [];

  // --- Ejemplo: total de usuarios registrados ---
  try {
    const activeUsers = await prisma.user.count();
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

/**
 * Recolecta y envía métricas al Board.
 * Usado tanto por el cron semanal como por directivas METRICS_REQUEST.
 */
export async function collectAndSendMetrics(): Promise<void> {
  const period = new Date().toISOString().slice(0, 10);
  const metrics = await collectMetrics(period);

  if (metrics.length > 0) {
    await sendMetrics(metrics);
    console.log(`[Board] ${metrics.length} métricas enviadas`, { period });
  }
}
