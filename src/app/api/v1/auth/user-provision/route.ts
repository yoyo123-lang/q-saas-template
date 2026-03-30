import { z } from 'zod'
import { prisma } from '@/lib/db'
import { verifyHmacSignature } from '@/lib/sync/hmac'

const ProvisionBodySchema = z.object({
  email: z.string().email(),
  name: z.string().nullable().optional(),
  image: z.string().url().nullable().optional(),
  globalUserId: z.string().min(1),
  status: z.literal('INACTIVE'),
})

/**
 * POST /api/v1/auth/user-provision
 *
 * Recibe la notificación de Q-Company para crear/actualizar un usuario INACTIVE
 * propagado desde otra BU. Validado con HMAC-SHA256.
 */
export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-webhook-secret') ?? ''
  const secret = process.env.BOARD_WEBHOOK_SECRET ?? ''

  if (!secret) {
    console.error('[user-provision] BOARD_WEBHOOK_SECRET no configurado')
    return Response.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  if (!verifyHmacSignature(rawBody, signature, secret)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = JSON.parse(rawBody)
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = ProvisionBodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 422 })
  }

  const { email, name, image, globalUserId } = parsed.data

  try {
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, globalUserId: true },
    })

    if (existing) {
      // Usuario ya existe: actualizar globalUserId si estaba null
      if (!existing.globalUserId) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { globalUserId },
        })
      }
    } else {
      // Crear usuario INACTIVE para que esté listo cuando entre
      await prisma.user.create({
        data: {
          email,
          name: name ?? null,
          image: image ?? null,
          status: 'INACTIVE',
          globalUserId,
        },
      })
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error('[user-provision] Error interno', { email, error: err })
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
