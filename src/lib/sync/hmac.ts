import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Verifica que la firma HMAC-SHA256 del body sea válida.
 * Acepta el formato `sha256=<hex>` o simplemente `<hex>`.
 * Usa comparación en tiempo constante para evitar timing attacks.
 *
 * @param body       - El cuerpo de la solicitud como string
 * @param signature  - La firma recibida en el header (con o sin prefijo `sha256=`)
 * @param secret     - El secreto compartido para calcular el HMAC
 * @returns true si la firma es válida, false si no
 */
export function verifyHmacSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const sig = signature.startsWith('sha256=') ? signature.slice(7) : signature
  const expected = createHmac('sha256', secret).update(body).digest('hex')

  try {
    const expectedBuf = Buffer.from(expected, 'hex')
    const actualBuf = Buffer.from(sig, 'hex')

    if (expectedBuf.length !== actualBuf.length) return false
    return timingSafeEqual(expectedBuf, actualBuf)
  } catch {
    return false
  }
}
