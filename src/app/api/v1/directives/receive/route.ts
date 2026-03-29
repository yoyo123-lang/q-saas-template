/**
 * Receptor de directivas del Board de Q Company.
 * URL: POST /api/v1/directives/receive
 *
 * Flujo:
 * 1. Valida firma HMAC-SHA256 del body (header x-board-signature)
 * 2. Responde { acknowledged: true } inmediatamente (< 5 segundos)
 * 3. Procesa la directiva en background con after()
 * 4. Reporta status in_progress → completed/failed al Board
 *
 * Headers requeridos:
 *   x-board-signature: sha256={hmac_del_body}
 *
 * Variables de entorno requeridas:
 *   BOARD_WEBHOOK_SECRET — shared secret para validar la firma
 */

import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, after } from "next/server";
import { updateDirectiveStatus } from "@/lib/board-client";
import { collectAndSendMetrics } from "@/lib/board-metrics";

// ---------------------------------------------------------------------------
// HMAC validation
// ---------------------------------------------------------------------------

function validateBoardSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = signatureHeader.replace("sha256=", "");

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(received, "hex");

  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DirectiveBody {
  directive_id: string;
  type: string;
  title: string;
  description: string;
  execution?: { type: string; repo?: string; labels?: string[] };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("x-board-signature") ?? "";
  const secret = process.env.BOARD_WEBHOOK_SECRET;

  if (!secret) {
    console.error("[Board] BOARD_WEBHOOK_SECRET no configurado");
    return Response.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  if (!validateBoardSignature(rawBody, signatureHeader, secret)) {
    console.warn("[Board] Firma HMAC inválida en directiva recibida");
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: DirectiveBody;
  try {
    body = JSON.parse(rawBody) as DirectiveBody;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { directive_id, type, title } = body;

  if (!directive_id || !type) {
    return Response.json(
      { error: "Missing directive_id or type" },
      { status: 400 }
    );
  }

  console.log(`[Board] Directiva recibida: ${type} — ${title}`, {
    directive_id,
  });

  // Procesar en background — responder rápido (< 5 segundos)
  after(() =>
    processDirective(body).catch((err: unknown) => {
      console.error("[Board] Error procesando directiva", {
        directive_id,
        error: err instanceof Error ? err.message : String(err),
      });
    })
  );

  return Response.json({ acknowledged: true, directive_id });
}

// ---------------------------------------------------------------------------
// Directive processing
// ---------------------------------------------------------------------------

async function processDirective(directive: DirectiveBody): Promise<void> {
  const { directive_id, type, title } = directive;

  try {
    await updateDirectiveStatus(directive_id, "in_progress");

    switch (type) {
      case "METRIC_TEST":
      case "METRICS_REQUEST":
      case "REQUEST_METRICS":
        await collectAndSendMetrics();
        break;
      case "PROMOTION":
        console.log(`[Board] PROMOTION recibida: ${title}`, { directive_id });
        break;
      case "FEATURE_REQUEST":
        // Si execution.type === 'github_issue', el Board ya creó el issue en este repo
        console.log(`[Board] FEATURE_REQUEST recibida: ${title}`, {
          directive_id,
        });
        break;
      case "TECHNICAL_DIRECTIVE":
        console.log(`[Board] TECHNICAL_DIRECTIVE recibida: ${title}`, {
          directive_id,
        });
        break;
      case "POLICY_CHANGE":
        console.log(`[Board] POLICY_CHANGE recibida: ${title}`, {
          directive_id,
        });
        break;
      case "CAMPAIGN":
        console.log(`[Board] CAMPAIGN recibida: ${title}`, { directive_id });
        break;
      case "CONFIG_CHANGE":
        console.log(`[Board] CONFIG_CHANGE recibida: ${title}`, {
          directive_id,
        });
        break;
      default:
        console.warn(`[Board] Tipo de directiva desconocido: ${type}`, {
          directive_id,
        });
    }

    await updateDirectiveStatus(
      directive_id,
      "completed",
      "Procesado correctamente"
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error(`[Board] Error procesando directiva ${directive_id}:`, {
      error: message,
    });
    await updateDirectiveStatus(directive_id, "failed", message).catch(
      () => {}
    );
  }
}
