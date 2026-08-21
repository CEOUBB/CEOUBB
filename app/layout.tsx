import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Manrope, Merriweather } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import "./mobile-shell.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

/** Voz institucional: firma títulos y nombres de ramo. */
const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "700", "900"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ceoubb.com"),
  title: "Centro de Estudio UBB | Ingeniería Mecánica",
  description:
    "Aula, certámenes, ejercicios resueltos, apuntes y recursos para estudiantes de Ingeniería Mecánica UBB.",
  applicationName: "Centro de Estudio UBB",
  manifest: "/manifest.webmanifest",
  keywords: [
    "centro de estudios UBB",
    "Ingeniería Mecánica UBB",
    "Estática",
    "Termodinámica Aplicada",
    "MATLAB",
  ],
  robots: { index: true, follow: true },
  openGraph: {
    title: "Centro de Estudio UBB",
    description: "Tu aula y biblioteca académica de Ingeniería Mecánica en cualquier dispositivo.",
    type: "website",
    locale: "es_CL",
  },
  twitter: {
    card: "summary_large_image",
    title: "Centro de Estudio UBB",
    description: "Aula y biblioteca académica de Ingeniería Mecánica UBB.",
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      className={`${manrope.variable} ${merriweather.variable} ${jetBrainsMono.variable}`}
      lang="es"
    >
      <body>{children}</body>
    </html>
  );
}
