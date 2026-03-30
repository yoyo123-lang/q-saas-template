import Link from "next/link";
import { FolderKanban, Shield, Zap } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--q-bg)' }}>
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-4 py-24 text-center">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl" style={{ color: 'var(--q-text-primary)' }}>
          Tu próximo SaaS,{" "}
          <span className="text-[var(--color-q-accent)]">listo para producción</span>
        </h1>
        <p className="mt-6 max-w-lg text-lg" style={{ color: 'var(--q-text-body)' }}>
          Template completo con autenticación, dashboard, CRUD y deploy
          configurado. Lanzá tu producto en horas, no semanas.
        </p>
        <div className="mt-8 flex gap-4">
          <Link
            href="/login"
            className="rounded-md bg-[var(--color-q-accent)] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-q-accent-dim)]"
          >
            Comenzar
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md border px-6 py-2.5 text-sm font-medium transition-colors" style={{ borderColor: 'var(--q-border)', color: 'var(--q-text-body)' }}
          >
            Ver demo
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="border-t px-4 py-20" style={{ borderColor: 'var(--q-border)', backgroundColor: 'var(--q-bg-secondary)' }}>
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold" style={{ color: 'var(--q-text-primary)' }}>
            Todo lo que necesitás para arrancar
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            <Feature
              icon={<Shield className="h-6 w-6 text-[var(--color-q-accent)]" />}
              title="Auth completa"
              description="Google OAuth, roles, allowlist de emails y middleware de protección."
            />
            <Feature
              icon={<FolderKanban className="h-6 w-6 text-[var(--color-q-accent)]" />}
              title="CRUD de ejemplo"
              description="Endpoints REST, validación con Zod, paginación y soft delete."
            />
            <Feature
              icon={<Zap className="h-6 w-6 text-[var(--color-q-accent)]" />}
              title="Listo para deploy"
              description="Vercel, Supabase, migraciones SQL y variables de entorno documentadas."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-20 text-center">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--q-text-primary)' }}>
          ¿Listo para construir?
        </h2>
        <p className="mt-3" style={{ color: 'var(--q-text-body)' }}>
          Cloná el repo, llená el BLUEPRINT.md y corré{" "}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm">
            /project:sesion
          </code>
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-md bg-[var(--color-q-accent)] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-q-accent-dim)]"
        >
          Empezar ahora
        </Link>
      </section>
    </main>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border p-6" style={{ borderColor: 'var(--q-border)', backgroundColor: 'var(--q-surface)' }}>
      <div className="mb-3">{icon}</div>
      <h3 className="text-base font-semibold" style={{ color: 'var(--q-text-primary)' }}>{title}</h3>
      <p className="mt-2 text-sm" style={{ color: 'var(--q-text-secondary)' }}>{description}</p>
    </div>
  );
}
