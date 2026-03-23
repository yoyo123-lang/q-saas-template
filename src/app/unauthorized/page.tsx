import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-8">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-300">403</h1>
        <h2 className="mt-4 text-xl font-semibold text-gray-900">
          Acceso denegado
        </h2>
        <p className="mt-2 text-gray-500">
          No tenés permisos para acceder a esta página.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
