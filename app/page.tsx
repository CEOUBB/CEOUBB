import { cookies } from "next/headers";
import { Portal } from "./Portal";
import { getServerSessionState, SESSION_COOKIE } from "../lib/auth";

// Implements: REQ-AUTH-01, REQ-PERF-01, REQ-AUTH-06, REQ-SEO-03, PERF-083
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "Centro de Estudio UBB",
  alternateName: ["CEOUBB", "Centro de Estudio UBB"],
  url: "https://ceoubb.com",
  logo: "https://ceoubb.com/brand/ubb-shield.webp",
  description:
    "Plataforma académica y aula virtual independiente para estudiantes y docentes de la Universidad del Bío-Bío.",
  sameAs: ["https://github.com/CEOUBB/CEOUBB"],
};

const JSON_LD_STRING = JSON.stringify(JSON_LD).replace(/</g, "\\u003c");

export default async function Home() {
  let initialSession = undefined;
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value ?? null;
    initialSession = await getServerSessionState(token);
  } catch {
    // Si la lectura en servidor falla, degrada graciosamente a cliente
  }

  const isQuickAuthAvailable =
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_CEOUBB_ENVIRONMENT === "preview" ||
    process.env.NEXT_PUBLIC_CEOUBB_ENVIRONMENT === "staging" ||
    process.env.CEOUBB_ENVIRONMENT === "preview" ||
    process.env.CEOUBB_ENVIRONMENT === "staging";

  return (
    <>
      {/*
        PERF-083: el escudo de `.access-brand::before` sólo se descubre tras
        descargar y parsear el CSS, así que el navegador lo encolaba a los
        2879 ms y fijaba un LCP de 3495 ms. Anunciarlo en el documento inicial
        elimina esa espera. React iza este `<link>` al `<head>`; vive en la
        página y no en el layout para no precargarlo en rutas que no lo pintan.
      */}
      <link rel="preload" as="image" href="/brand/ubb-shield.webp" fetchPriority="high" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD_STRING }} />
      <Portal initialSession={initialSession} isQuickAuthAvailable={isQuickAuthAvailable} />
    </>
  );
}
