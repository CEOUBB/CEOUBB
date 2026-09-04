import { Portal } from "./Portal";

// Implements: REQ-AUTH-01, REQ-PERF-01, REQ-AUTH-06, REQ-SEO-03
export default function Home() {
  const isQuickAuthAvailable =
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_CEOUBB_ENVIRONMENT === "preview" ||
    process.env.NEXT_PUBLIC_CEOUBB_ENVIRONMENT === "staging" ||
    process.env.CEOUBB_ENVIRONMENT === "preview" ||
    process.env.CEOUBB_ENVIRONMENT === "staging";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: "Centro de Estudio UBB",
    url: "https://ceoubb.com",
    logo: "https://ceoubb.com/brand/ubb-shield.webp",
    description:
      "LMS y plataforma académica independiente para estudiantes y docentes de la Universidad del Bío-Bío.",
    sameAs: ["https://github.com/CEOUBB/CEOUBB"],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Portal isQuickAuthAvailable={isQuickAuthAvailable} />
    </>
  );
}
