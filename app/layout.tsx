import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Manrope, Merriweather } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { AppToaster } from "../components/AppToaster";
import "./globals.css";
import "./mobile-shell.css";
import "./campus.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

// Implements: REQ-SEO-04
const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

/** Voz institucional: firma títulos y nombres de ramo. */
const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  display: "swap",
  weight: ["700"],
  style: ["normal"],
});

// Implements: REQ-SEO-03
export const metadata: Metadata = {
  metadataBase: new URL("https://ceoubb.com"),
  alternates: {
    canonical: "./",
  },
  title: "Centro de Estudio UBB | Aula Virtual UBB",
  description:
    "Plataforma académica y aula virtual independiente para estudiantes y docentes de la Universidad del Bío-Bío.",
  applicationName: "Centro de Estudio UBB",
  manifest: "/manifest.webmanifest",
  keywords: [
    "Centro de Estudio UBB",
    "CEOUBB",
    "aula virtual UBB",
    "Universidad del Bío-Bío",
    "LMS UBB",
    "plataforma académica",
    "estudiantes UBB",
    "docentes UBB",
  ],
  robots: { index: true, follow: true },
  openGraph: {
    title: "Centro de Estudio UBB | Aula Virtual UBB",
    description:
      "Plataforma académica y aula virtual independiente para estudiantes y docentes de la Universidad del Bío-Bío.",
    type: "website",
    locale: "es_CL",
  },
  twitter: {
    card: "summary_large_image",
    title: "Centro de Estudio UBB | Aula Virtual UBB",
    description:
      "Plataforma académica y aula virtual independiente para estudiantes y docentes de la Universidad del Bío-Bío.",
  },
  icons: {
    icon: [
      { url: "/icons/icon-32.webp", sizes: "32x32", type: "image/webp" },
      { url: "/icons/icon-48.webp", sizes: "48x48", type: "image/webp" },
      { url: "/icons/icon-192.webp", sizes: "192x192", type: "image/webp" },
      { url: "/icons/icon-512.webp", sizes: "512x512", type: "image/webp" },
    ],
    apple: [
      { url: "/icons/icon-192.webp", sizes: "192x192", type: "image/webp" },
      { url: "/icons/icon-512.webp", sizes: "512x512", type: "image/webp" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#0055b8",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Implements: REQ-TOAST-01, REQ-URL-01
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      className={`${manrope.variable} ${merriweather.variable} ${jetBrainsMono.variable}`}
      lang="es"
    >
      <head>
        <link rel="preconnect" href="https://accounts.google.com" />
        <link rel="dns-prefetch" href="https://accounts.google.com" />
        <link rel="preconnect" href="https://identitytoolkit.googleapis.com" />
        <link rel="dns-prefetch" href="https://identitytoolkit.googleapis.com" />
        <link rel="preconnect" href="https://firestore.googleapis.com" />
        <link rel="dns-prefetch" href="https://firestore.googleapis.com" />
      </head>
      <body>
        <NuqsAdapter>
          {children}
          <AppToaster />
        </NuqsAdapter>
      </body>
    </html>
  );
}
