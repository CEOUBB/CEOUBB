import { ArrowLeft } from "@phosphor-icons/react/ssr";
import Image from "next/image";
import Link from "next/link";
import FaqBrowser from "./FaqBrowser.tsx";
import { CATEGORIAS_FAQ } from "./faq-content.ts";

export const metadata = {
  title: "Preguntas frecuentes · Centro de Estudio UBB",
  description:
    "Respuestas sobre cuentas institucionales, secciones, cálculo de notas en la escala 1,0 a 7,0, biblioteca de estudio y aplicación móvil de Centro de Estudio UBB.",
};

// Implements: REQ-HELP-01, REQ-HELP-06, REQ-HELP-09, REQ-HELP-10
export default function FaqPage() {
  return (
    <main className="policy-page">
      <a className="skip-link" href="#contenido-principal">
        Saltar al contenido principal
      </a>
      <header className="policy-head">
        <Link className="app-brand" href="/">
          <Image
            src="/brand/ubb-shield.webp"
            alt=""
            aria-hidden="true"
            width={388}
            height={594}
            priority
          />
          <strong>Centro de Estudio UBB</strong>
        </Link>
        <Link className="policy-back" href="/">
          <ArrowLeft size={16} weight="bold" aria-hidden="true" />
          Volver al portal
        </Link>
      </header>

      <article id="contenido-principal" tabIndex={-1}>
        <h1>Preguntas frecuentes</h1>
        <p className="policy-lead">
          Lo que la comunidad UBB pregunta con más frecuencia sobre acceso, secciones,
          calificaciones, biblioteca y aplicación móvil. Cada respuesta tiene su propio enlace, por
          si necesitas compartirla.
        </p>

        <ul className="policy-index">
          {CATEGORIAS_FAQ.map((categoria, indice) => (
            <li key={categoria.slug}>
              <a href={`#titulo-${categoria.slug}`}>
                <span className="num">{indice + 1}</span>. {categoria.titulo}
              </a>
            </li>
          ))}
        </ul>

        <FaqBrowser />

        <h2 id="sin-respuesta">¿No encontraste tu respuesta?</h2>
        <p>
          Escríbenos y te respondemos. Acusamos recibo dentro de cinco días hábiles y procuramos
          entregar una respuesta dentro de treinta días corridos. Si la pregunta se repite, termina
          publicada en esta página.
        </p>
        <p>
          <Link className="policy-submit" href="/contacto">
            Ir a contacto y soporte
          </Link>
        </p>

        <nav aria-label="Documentos relacionados">
          Ver también la <Link href="/privacidad">política de privacidad</Link>, los{" "}
          <Link href="/terminos">términos de uso</Link> y la{" "}
          <Link href="/accesibilidad">declaración de accesibilidad</Link>.
        </nav>
      </article>
    </main>
  );
}
