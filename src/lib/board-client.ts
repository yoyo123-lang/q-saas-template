/**
 * Board Client — comunicación con Q Company Board.
 *
 * Todos los métodos son fire-and-forget: si el Board no está disponible,
 * se loguea el error y se continúa sin afectar la operación principal.
 *
 * Si BOARD_API_KEY, BOARD_BU_ID o BOARD_URL no están configuradas, retorna
 * sin hacer nada (modo "desconectado" — útil en desarrollo).
 *
 * Retry strategy:
 * - Errores de red / 5xx → reintentar con exponential backoff (2s, 4s, 8s)
 * - Errores 4xx → NO reintentar (son definitivos: auth/validación)
 * - Timeout de 10s por intento, MAX_RETRIES=2 (3 intentos totales)
 * - Worst-case: 3×10s + 2s + 4s = 36s (dentro del límite Vercel Functions)
 */

const BOARD_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BoardEvent {
  type: string;
  payload: Record<string, unknown>;
  occurred_at: string;
}

export interface BoardMetric {
  key: string;
  value: number;
  period: string;
  metadata?: Record<string, unknown>;
}

export interface HeartbeatChecks {
  api: "ok" | "error";
  db: "ok" | "error";
  [key: string]: "ok" | "error";
}

export interface DirectiveStatusUpdate {
  status: "received" | "in_progress" | "completed" | "failed" | "rejected";
  notes?: string;
  result?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function getBoardConfig(): {
  apiKey: string;
  buId: string;
  boardUrl: string;
} | null {
  const apiKey = process.env.BOARD_API_KEY;
  const buId = process.env.BOARD_BU_ID;
  const boardUrl = process.env.BOARD_URL;

  if (!apiKey || !buId || !boardUrl) {
    if (process.env.NODE_ENV !== "test") {
      console.warn(
        "[Board] BOARD_API_KEY, BOARD_BU_ID o BOARD_URL no configuradas — modo desconectado"
      );
    }
    return null;
  }

  return { apiKey, buId, boardUrl };
}

// ---------------------------------------------------------------------------
// Fetch with retry
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch al Board con exponential backoff y timeout.
 * No reintenta errores 4xx (son definitivos: auth, validación).
 * Sí reintenta errores de red y 5xx.
 */
async function boardFetch(
  url: string,
  options: RequestInit
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), BOARD_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // 4xx → error definitivo, no reintentar
      if (response.status >= 400 && response.status < 500) {
        const body = await response.text();
        console.error(
          `[Board] Error ${response.status} (no reintentable): ${body.slice(0, 200)}`
        );
        return response;
      }

      // 5xx → reintentable
      if (!response.ok) {
        throw new Error(
          `Board API error ${response.status} ${response.statusText}`
        );
      }

      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;

      if (attempt < MAX_RETRIES) {
        const delayMs = Math.pow(2, attempt + 1) * 1000; // 2s, 4s
        await sleep(delayMs);
      }
    }
  }

  throw lastError;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Envía heartbeat al Board (llamado desde el cron cada 5 min).
 * Si no llega heartbeat en 15 min → el Board genera alerta automática.
 */
export async function sendHeartbeat(
  version: string,
  uptimeSeconds: number,
  checks: HeartbeatChecks
): Promise<void> {
  const config = getBoardConfig();
  if (!config) return;

  const { apiKey, buId, boardUrl } = config;

  try {
    await boardFetch(`${boardUrl}/api/v1/bu/${buId}/heartbeat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ version, uptime_seconds: uptimeSeconds, checks }),
    });
  } catch (err) {
    console.error("[Board] Error enviando heartbeat:", err);
  }
}

/**
 * Envía métricas de negocio al Board — máximo 100 por request.
 */
export async function sendMetrics(metrics: BoardMetric[]): Promise<void> {
  const config = getBoardConfig();
  if (!config) return;

  const { apiKey, buId, boardUrl } = config;

  try {
    await boardFetch(`${boardUrl}/api/v1/bu/${buId}/metrics`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ metrics }),
    });
  } catch (err) {
    console.error("[Board] Error enviando métricas:", err);
  }
}

/**
 * Envía eventos de negocio al Board — máximo 100 por request.
 * Fire-and-forget: usar con .catch() en el flujo principal.
 */
export async function sendEvents(events: BoardEvent[]): Promise<void> {
  const config = getBoardConfig();
  if (!config) return;

  const { apiKey, buId, boardUrl } = config;

  try {
    await boardFetch(`${boardUrl}/api/v1/bu/${buId}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ events }),
    });
  } catch (err) {
    console.error("[Board] Error enviando eventos:", err);
  }
}

/**
 * Actualiza el estado de una directiva recibida del Board.
 */
export async function updateDirectiveStatus(
  directiveId: string,
  status: DirectiveStatusUpdate["status"],
  notes?: string,
  result?: Record<string, unknown>
): Promise<void> {
  const config = getBoardConfig();
  if (!config) return;

  const { apiKey, buId, boardUrl } = config;

  try {
    await boardFetch(
      `${boardUrl}/api/v1/bu/${buId}/directives/${directiveId}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({ status, notes, result }),
      }
    );
  } catch (err) {
    console.error("[Board] Error actualizando estado de directiva:", err);
  }
}
