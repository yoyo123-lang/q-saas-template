# Implementación de OAuth con NextAuth.js v5

> Documentación técnica de la implementación de autenticación Google OAuth en este proyecto.
> Pensada para reutilizar en proyectos nuevos con el mismo stack: **Next.js 15 + NextAuth v5 + Prisma + PostgreSQL + Railway**.

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router) |
| Auth | NextAuth.js v5 (beta) — `next-auth@5` |
| Provider | Google OAuth 2.0 |
| Persistencia de sesión | PrismaAdapter → PostgreSQL |
| Deploy | Railway |

---

## Arquitectura de la autenticación

```
Usuario → /login → Server Action → signIn("google") → Google OAuth
                                                          ↓
                                                 callback signIn()
                                                 (valida en AllowedEmail)
                                                          ↓
                                                 PrismaAdapter crea/actualiza
                                                 User, Account, Session en DB
                                                          ↓
                                                 callback session()
                                                 (inyecta id y role)
                                                          ↓
                                               Cookie de sesión → cliente
```

**Dos capas de protección:**

1. **Middleware** (`src/middleware.ts`): chequea que exista cookie de sesión. Es rápido, no toca DB.
2. **Layout admin** (`src/app/(admin)/layout.tsx`): llama `auth()`, verifica que `role === "ADMIN"`. Toca DB.

---

## Archivos a crear

### 1. `src/lib/auth.ts` — Configuración central

```typescript
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,           // necesario en Railway (sin NEXTAUTH_URL explícita)
  logger: {
    error(code, ...message) { console.error("[auth] ERROR", code, ...message); },
    warn(code)               { console.warn("[auth] WARN", code); },
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",        // página de login custom (no la de NextAuth)
  },
  callbacks: {
    // Allowlist: solo emails en la tabla AllowedEmail pueden ingresar
    async signIn({ user }) {
      if (!user.email) {
        console.error("[auth] signIn: no email");
        return false;
      }
      try {
        const allowed = await prisma.allowedEmail.findUnique({
          where: { email: user.email },
        });
        return !!allowed;
      } catch (err) {
        console.error("[auth] signIn error:", err);
        return false;
      }
    },
    // Inyecta id y role en el objeto session.user
    async session({ session, user }) {
      try {
        if (session.user) {
          session.user.id = user.id;
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { role: true },
          });
          (session.user as { role?: string }).role = dbUser?.role ?? "EMPLOYEE";
        }
      } catch (err) {
        console.error("[auth] session callback ERROR:", err);
      }
      return session;
    },
  },
});
```

**Por qué `trustHost: true`:** En Railway el dominio es dinámico. Sin esto, NextAuth rechaza requests porque no puede verificar el host.

**Por qué PrismaAdapter (sesiones en DB) y no JWT:** Permite invalidar sesiones desde el servidor, consultar `role` real desde la DB en cada request, y tener auditoría completa de sesiones activas.

---

### 2. `src/app/api/auth/[...nextauth]/route.ts` — Entry point de la API

```typescript
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

Esto expone `/api/auth/callback/google`, `/api/auth/session`, etc.

---

### 3. `src/middleware.ts` — Protección de rutas (capa 1)

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas públicas — sin auth
  if (
    pathname === "/api/health" ||
    pathname.startsWith("/api/auth") ||     // callbacks de NextAuth
    pathname.startsWith("/api/telegram") || // webhook de Telegram
    pathname === "/login"
  ) {
    return NextResponse.next();
  }

  // Chequea cookie de sesión (dev: sin Secure, prod: con __Secure-)
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

**Importante:** El middleware solo chequea que exista la cookie. No verifica firma ni rol. Es intencional: es la capa rápida. La verificación real de rol está en los layouts y API routes.

---

### 4. `src/app/(admin)/layout.tsx` — Protección de rol (capa 2)

```typescript
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if ((session.user as { role?: string }).role !== "ADMIN") {
    redirect("/login"); // o /unauthorized
  }

  return <>{children}</>;
}
```

---

### 5. `src/lib/require-admin.ts` — Helper para API Routes

```typescript
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * Verifica sesión activa con rol ADMIN.
 * Uso: const { error } = await requireAdmin(); if (error) return error;
 */
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
```

**Uso en una API route:**
```typescript
export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  // lógica protegida...
}
```

---

### 6. `src/app/login/page.tsx` — Página de login

```typescript
import { signIn } from "@/lib/auth";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-2 text-center text-2xl font-bold text-gray-900">
          Mi Aplicación
        </h1>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Iniciar sesión con Google
          </button>
        </form>
      </div>
    </main>
  );
}
```

---

## Schema de Prisma — tablas requeridas

Estas tablas las requiere **PrismaAdapter**. Si no existen, NextAuth falla silenciosamente o con errores de DB.

```prisma
// Enum de roles (adaptar según el proyecto)
enum Role {
  ADMIN
  EMPLOYEE
}

// Tabla de usuarios — extendida con campos propios
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  role          Role      @default(EMPLOYEE)
  // campos propios del proyecto...
  accounts      Account[]
  sessions      Session[]
}

// Requerido por NextAuth — NO modificar estructura
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

// Allowlist de emails (control de acceso propio del proyecto)
model AllowedEmail {
  id        String   @id @default(cuid())
  email     String   @unique
  createdAt DateTime @default(now())
}
```

---

## Variables de entorno

```bash
# NextAuth
NEXTAUTH_URL="http://localhost:3000"          # En prod Railway lo detecta automáticamente
NEXTAUTH_SECRET=""                             # openssl rand -base64 32

# Google OAuth (ver TUTORIAL_ALTA_MANUAL.md)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

---

## Inicialización de la DB (startup.mjs)

Este proyecto usa un script `prisma/startup.mjs` en lugar de `prisma db push` en producción.
Razón: el CLI de Prisma no está disponible en el bundle standalone de Next.js.

El script hace `CREATE TABLE IF NOT EXISTS` para todas las tablas y además hace el **seed inicial del admin**:

```sql
-- Agrega el email del admin a la allowlist
INSERT INTO "AllowedEmail" ("id", "email", "createdAt")
VALUES (gen_random_uuid()::text, 'admin@ejemplo.com', now())
ON CONFLICT ("email") DO NOTHING;

-- Asegura que el usuario tenga rol ADMIN (workaround: NextAuth crea usuarios con EMPLOYEE por default)
UPDATE "User" SET "role" = 'ADMIN'
WHERE "email" = 'admin@ejemplo.com';
```

**Cambiar el email hardcodeado** por el del admin real antes de deployar.

---

## Dependencias npm

```bash
npm install next-auth@beta @auth/prisma-adapter
```

Versión usada en este proyecto: `next-auth@5.0.0-beta.*`

---

## Deuda técnica conocida

| Problema | Severidad | Estado |
|---|---|---|
| Server Actions en `actions.ts` no verifican sesión ni rol — solo el layout protege | CRÍTICO | Pendiente |
| Email del admin hardcodeado en `startup.mjs` | MEDIO | Aceptado (bootstrap) |
| `session.user.role` requiere casteo explícito de tipos | BAJO | Pendiente (augmentación de tipos NextAuth) |

Ver `docs/KNOWN_ISSUES.md` y `docs/reviews/2026-03-09_security.md` para más contexto.

---

## Flujo completo de login (paso a paso)

```
1. Usuario abre / → middleware detecta sin cookie → redirect /login
2. Usuario hace click en "Iniciar sesión con Google"
3. Server Action llama signIn("google", { redirectTo: "/" })
4. NextAuth redirige a Google con los parámetros OAuth
5. Usuario autoriza en Google
6. Google redirige a /api/auth/callback/google con el code
7. NextAuth intercambia code → tokens → obtiene perfil del usuario
8. Callback signIn(): busca email en AllowedEmail → si no está, retorna false → login rechazado
9. PrismaAdapter crea/actualiza User y Account en DB, crea Session
10. Callback session(): inyecta user.id y user.role en el objeto de sesión
11. NextAuth setea cookie de sesión (authjs.session-token en dev, __Secure- en prod)
12. Redirect a /
13. Layout admin llama auth() → verifica role === "ADMIN" → permite acceso
```
