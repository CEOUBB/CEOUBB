import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3001";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const imageUrl = `${protocol}://${host}/og.png`;
  return {
    title: "Centro de Estudio UBB | Ingeniería Mecánica",
    description: "Aula, certámenes, ejercicios resueltos, apuntes y recursos para estudiantes de Ingeniería Mecánica UBB.",
    applicationName: "Centro de Estudio UBB",
    manifest: "/manifest.webmanifest",
    keywords: ["centro de estudios UBB", "Ingeniería Mecánica UBB", "Estática", "Termodinámica Aplicada", "MATLAB"],
    robots: { index: true, follow: true },
    openGraph: {
      title: "Centro de Estudio UBB",
      description: "Tu aula y banco de certámenes de Ingeniería Mecánica en cualquier dispositivo.",
      type: "website",
      locale: "es_CL",
      images: [{ url: imageUrl, width: 1728, height: 920, alt: "Centro de Estudio UBB · Ingeniería Mecánica" }],
    },
    twitter: { card: "summary_large_image", title: "Centro de Estudio UBB", description: "Aula y banco de certámenes de Ingeniería Mecánica UBB.", images: [imageUrl] },
    icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
  };
}

export const viewport: Viewport = {
  themeColor: "#0057a4",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
