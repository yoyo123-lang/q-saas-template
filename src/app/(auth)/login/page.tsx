import { LoginForm } from "@/components/auth/login-form";

interface LoginPageProps {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <>
      <h1 className="mb-6 text-center text-xl font-semibold text-gray-900">
        Ingresá a tu cuenta
      </h1>
      <LoginForm error={params.error} callbackUrl={params.callbackUrl} />
    </>
  );
}
