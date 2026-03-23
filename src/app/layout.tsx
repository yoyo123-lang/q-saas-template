import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Q SaaS Template",
  description: "Template funcional para lanzar SaaS rápidamente",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
