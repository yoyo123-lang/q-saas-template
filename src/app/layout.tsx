import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Q SaaS Template",
    template: "%s | Q SaaS",
  },
  description: "Template funcional para lanzar SaaS rápidamente",
  openGraph: {
    title: "Q SaaS Template",
    description: "Template funcional para lanzar SaaS rápidamente",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
