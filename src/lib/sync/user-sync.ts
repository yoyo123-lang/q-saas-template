import { prisma } from '@/lib/db'

const BOARD_URL = process.env.BOARD_URL
const BOARD_API_KEY = process.env.BOARD_API_KEY
// BU_SLUG identifica esta BU en el ecosistema Q-Company.
// Configurar en .env.local: BU_SLUG="mi-bu"
const BU_SLUG = process.env.BU_SLUG ?? 'my-bu'

/**
 * Sincroniza un usuario local con el registro central de Q-Company (GlobalUser).
 * Fire-and-forget: no bloquea el flujo principal si falla.
 *
 * Si la sync es exitosa, guarda el globalUserId en el User local.
 */
export async function syncUserToBoard(user: {
  id: string
  email: string
  name?: string | null
  image?: string | null
  emailVerified?: Date | null
  authProvider: 'google' | 'credentials'
}): Promise<void> {
  if (!BOARD_URL || !BOARD_API_KEY) {
    console.warn('[sync] BOARD_URL o BOARD_API_KEY no configurados — sync omitida')
    return
  }

  try {
    const response = await fetch(`${BOARD_URL}/api/v1/auth/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': BOARD_API_KEY,
      },
      body: JSON.stringify({
        email: user.email,
        name: user.name ?? null,
        image: user.image ?? null,
        emailVerified: user.emailVerified != null,
        authProvider: user.authProvider,
        buSlug: BU_SLUG,
      }),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => 'no body')
      console.warn('[sync] Q-Company respondió con error', { status: response.status, body: text })
      return
    }

    const data = (await response.json()) as { data?: { globalUserId?: string } }
    const globalUserId = data?.data?.globalUserId

    if (globalUserId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { globalUserId },
      })
    }
  } catch (err) {
    console.warn('[sync] Error al sincronizar con Q-Company', { email: user.email, error: err })
  }
}

/**
 * Notifica a Q-Company que un usuario INACTIVE completó su activación en esta BU.
 * Se llama después del onboarding o verificación de email.
 * Fire-and-forget: no bloquea el flujo principal.
 */
export async function notifyUserActivated(email: string): Promise<void> {
  if (!BOARD_URL || !BOARD_API_KEY) {
    console.warn('[sync] BOARD_URL o BOARD_API_KEY no configurados — notificación omitida')
    return
  }

  try {
    const response = await fetch(`${BOARD_URL}/api/v1/auth/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': BOARD_API_KEY,
      },
      body: JSON.stringify({ email, buSlug: BU_SLUG }),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => 'no body')
      console.warn('[sync] Error notificando activación a Q-Company', {
        status: response.status,
        body: text,
      })
    }
  } catch (err) {
    console.warn('[sync] Error al notificar activación', { email, error: err })
  }
}
