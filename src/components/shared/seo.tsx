import type { Metadata } from "next";

interface SEOProps {
  title: string;
  description: string;
  path?: string;
  ogImage?: string;
}

/** Genera metadata de Next.js para una página. Usar en generateMetadata(). */
export function generateSEO({
  title,
  description,
  path = "",
  ogImage = "/og-default.svg",
}: SEOProps): Metadata {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const url = `${baseUrl}${path}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      images: [{ url: `${baseUrl}${ogImage}`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: url,
    },
  };
}
