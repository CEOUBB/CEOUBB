import Link from "next/link";
import { ArrowLeft, Question } from "@phosphor-icons/react/ssr";
import { PolicyHead } from "./policy-head";
import { SiteFooter } from "./site-footer";

export const metadata = {
  title: "Página no encontrada · Centro de Estudio UBB",
  description:
    "El recurso o página solicitada no está disponible en la plataforma académica de Centro de Estudio UBB.",
};

// Implements: REQ-UI-404
export default function NotFound() {
  return (
    <div className="public-page">
      <a className="skip-link" href="#main-content">
        Saltar al contenido principal
      </a>
      <PolicyHead />
      <main className="public-status" id="main-content" tabIndex={-1}>
        <section aria-labelledby="not-found-title" className="public-status-sheet">
          <span aria-hidden="true" className="public-status-tab num">
            Error 404
          </span>
          <h1 id="not-found-title">Página no encontrada</h1>
          <p>
            El recurso, sección académica o documento que buscas no está disponible en la
            plataforma, fue archivado en un período anterior o la dirección web ingresada no es
            válida.
          </p>
          <div className="public-status-actions">
            <Link className="policy-submit" href="/">
              <ArrowLeft size={16} weight="bold" aria-hidden="true" />
              Volver al inicio
            </Link>
            <Link className="policy-back" href="/faq">
              <Question size={16} weight="bold" aria-hidden="true" />
              Preguntas frecuentes
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
