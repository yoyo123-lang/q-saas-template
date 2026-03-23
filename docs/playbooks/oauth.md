# Playbook: OAuth con Google

> Guía agnóstica para integrar Google OAuth en un proyecto nuevo clonado desde templete-blanco.
> Stack probado: Next.js + NextAuth v5 + Prisma + PostgreSQL.
> Referencia detallada del stack original: `docs/oauth/IMPLEMENTACION_OAUTH.md`

---

## Cuándo usar esto

- El proyecto necesita login con cuenta de Google.
- Querés controlar quién puede acceder (allowlist de emails).
- Necesitás roles (admin, usuario, etc.) con verificación server-side.

## Qué vas a necesitar

| Componente | Qué es | Ejemplo |
|---|---|---|
| Proveedor OAuth | El servicio que autentica | Google OAuth 2.0 |
| Librería de auth | Maneja sesiones y callbacks | NextAuth v5 (`next-auth@beta`) |
| Adaptador de DB | Persiste sesiones en base de datos | `@auth/prisma-adapter` |
| Base de datos | Almacena usuarios, sesiones, cuentas | PostgreSQL |

## Variables de entorno

```bash
# Auth
NEXTAUTH_URL="http://localhost:3000"          # En prod algunos hosts lo detectan automáticamente
NEXTAUTH_SECRET=""                             # Generar con: openssl rand -base64 32

# Google OAuth (obtener en Google Cloud Console → APIs & Services → Credentials)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

## Arquitectura de dos capas

La autenticación se protege en dos niveles:

1. **Capa rápida (middleware):** Verifica que exista cookie de sesión. No toca DB. Redirige a `/login` si no hay cookie.
2. **Capa de autorización (layout/API):** Llama a `auth()`, verifica rol desde DB. Protege rutas sensibles.

```
Usuario → /ruta-protegida → Middleware (¿tiene cookie?) → Layout (¿tiene rol correcto?) → Contenido
                                  ↓ no                        ↓ no
                              /login                      /login o /unauthorized
```

## Archivos a crear

### 1. Configuración central de auth

**Ubicación sugerida:** `src/lib/auth.ts`

```typescript
// Ejemplo para Next.js + NextAuth v5 + Prisma
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,           // necesario en hosts con dominio dinámico (Railway, etc.)
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",        // página de login custom
  },
  callbacks: {
    // Allowlist: solo emails autorizados pueden ingresar
    async signIn({ user }) {
      if (!user.email) return false;
      const allowed = await prisma.allowedEmail.findUnique({
        where: { email: user.email },
      });
      return !!allowed;
    },
    // Inyectar datos extra en la sesión (ej: rol)
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        (session.user as { role?: string }).role = dbUser?.role ?? "USER";
      }
      return session;
    },
  },
});
```

### 2. Route handler de NextAuth

**Ubicación:** `src/app/api/auth/[...nextauth]/route.ts`

```typescript
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

### 3. Middleware de protección

**Ubicación:** `src/middleware.ts`

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas públicas — adaptar según el proyecto
  if (
    pathname === "/api/health" ||
    pathname.startsWith("/api/auth") ||
    pathname === "/login"
  ) {
    return NextResponse.next();
  }

  // Verificar cookie de sesión (nombre varía entre dev y prod)
  const hasSession =
    request.cookies.has("authjs.session-token") ||
    request.cookies.has("__Secure-authjs.session-token");

  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

### 4. Layout protegido por rol

**Ubicación ejemplo:** `src/app/(admin)/layout.tsx`

```typescript
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "ADMIN") redirect("/login");
  return <>{children}</>;
}
```

### 5. Helper para proteger API routes

**Ubicación sugerida:** `src/lib/require-admin.ts`

```typescript
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function requireAdmin(): Promise<{ error: NextResponse | null }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "No autorizado" }, { status: 403 }) };
  }
  return { error: null };
}

// Uso:
// const { error } = await requireAdmin();
// if (error) return error;
```

### 6. Página de login

```typescript
// src/app/login/page.tsx — adaptar diseño al proyecto
import { signIn } from "@/lib/auth";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <form action={async () => {
        "use server";
        await signIn("google", { redirectTo: "/" });
      }}>
        <button type="submit">Iniciar sesión con Google</button>
      </form>
    </main>
  );
}
```

## Schema de base de datos (Prisma)

Tablas requeridas por NextAuth + tablas propias:

```prisma
enum Role {
  ADMIN
  USER
  // Agregar roles según el proyecto
}

// Requerido por NextAuth — extender con campos propios
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  role          Role      @default(USER)
  accounts      Account[]
  sessions      Session[]
}

// Requerido por NextAuth — NO modificar
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}

// Requerido por NextAuth
model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// Requerido por NextAuth
model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  @@unique([identifier, token])
}

// Allowlist de emails — control de acceso propio
model AllowedEmail {
  id        String   @id @default(cuid())
  email     String   @unique
  createdAt DateTime @default(now())
}
```

## Dependencias

```bash
npm install next-auth@beta @auth/prisma-adapter
```

## Checklist de integración

- [ ] Crear proyecto en Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client
- [ ] Configurar Authorized redirect URI: `https://tu-dominio/api/auth/callback/google` (y `http://localhost:3000/api/auth/callback/google` para dev)
- [ ] Configurar variables de entorno (`NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
- [ ] Agregar tablas de NextAuth al schema de Prisma y correr migración
- [ ] Crear `src/lib/auth.ts` con la configuración de NextAuth
- [ ] Crear route handler en `src/app/api/auth/[...nextauth]/route.ts`
- [ ] Crear middleware para proteger rutas
- [ ] Crear layout protegido por rol (si aplica)
- [ ] Crear helper `requireAdmin()` para API routes (si aplica)
- [ ] Crear página de login
- [ ] Agregar email del admin a la tabla `AllowedEmail` (seed o script de startup)
- [ ] Probar flujo completo: login → sesión → acceso → logout

## Decisiones de diseño y por qué

| Decisión | Razón |
|---|---|
| Sesiones en DB (no JWT) | Permite invalidar sesiones server-side y consultar rol real en cada request |
| `trustHost: true` | Necesario en hosts con dominio dinámico (Railway, Render, etc.) |
| Allowlist de emails | Control de acceso estricto — solo entran los que vos autorices |
| Middleware solo verifica cookie | Es la capa rápida; la verificación real de rol está en layouts y API routes |
| Server Actions para signIn | Patrón recomendado por NextAuth v5 |

## Errores comunes

| Error | Causa | Fix |
|---|---|---|
| NextAuth falla silenciosamente | Faltan tablas en DB | Correr `prisma db push` o migración |
| "Unauthorized" en producción | Falta `NEXTAUTH_SECRET` | Generar con `openssl rand -base64 32` |
| Redirect loop en login | Middleware no excluye `/login` de la protección | Agregar `/login` a las rutas públicas |
| `session.user.role` es undefined | Falta el callback `session` en auth config | Agregar callback que inyecte el rol |
| Login rechazado para email válido | Email no está en tabla `AllowedEmail` | Agregar email al seed o desde el panel |

## Deuda técnica conocida

- Las Server Actions deben verificar sesión y rol internamente (no solo depender del layout).
- `session.user.role` requiere casteo explícito — resolver con augmentación de tipos de NextAuth.

---

*Referencia detallada con el código del proyecto original: `docs/oauth/IMPLEMENTACION_OAUTH.md`*
