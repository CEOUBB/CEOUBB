import type { Metadata, Viewport } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

/** Voz institucional: la serif académica sólo firma títulos y nombres de ramo. */
const sourceSerif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
  weight: ["600", "700"],
  style: ["normal"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ceoubb.com"),
  title: "Centro de Estudio UBB | Ingeniería Mecánica",
  description: "Aula, certámenes, ejercicios resueltos, apuntes y recursos para estudiantes de Ingeniería Mecánica UBB.",
  applicationName: "Centro de Estudio UBB",
  manifest: "/manifest.webmanifest",
  keywords: ["centro de estudios UBB", "Ingeniería Mecánica UBB", "Estática", "Termodinámica Aplicada", "MATLAB"],
  robots: { index: true, follow: true },
  openGraph: {
    title: "Centro de Estudio UBB",
    description: "Tu aula y biblioteca académica de Ingeniería Mecánica en cualquier dispositivo.",
    type: "website",
    locale: "es_CL",
  },
  twitter: { card: "summary_large_image", title: "Centro de Estudio UBB", description: "Aula y biblioteca académica de Ingeniería Mecánica UBB." },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
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
    <html className={`${inter.variable} ${sourceSerif.variable}`} lang="es">
      <body>{children}</body>
    </html>
  );
}
