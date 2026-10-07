import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Question } from "@phosphor-icons/react/ssr";
import { SiteFooter } from "./site-footer";

export const metadata = {
  title: "Página no encontrada · Centro de Estudio UBB",
  description:
    "El recurso o página solicitada no está disponible en la plataforma académica de Centro de Estudio UBB.",
};

/*
  Implements: REQ-UI-404

  Hoja de decisiones (/deliberate decision sheet) — Modo Operate (/impeccable):
  SUBJECT:   Página de error 404 institucional para reorientar a estudiantes o docentes extraviados hacia el portal principal.
  GROUND:    Superficie institucional cálida (tokens OKLCH bg-surface-base / bg-surface-raised), evitando negros puros (bg-black, bg-zinc-950).
  PALETTE:   OKLCH calibrado de DESIGN.md:
             - Fondo base: bg-surface-base (oklch(0.975 0.005 240))
             - Superficie de tarjeta: bg-surface-raised (#ffffff)
             - Texto principal: text-text-primary (oklch(0.2 0.03 260))
             - Texto secundario: text-text-secondary (oklch(0.36 0.03 255))
             - Borde sutil: border-surface-border (oklch(0.92 0.006 60), micro-border 1px)
             - Acento: Azul institucional UBB (oklch(0.48 0.18 255))
  TYPE:      Titular y código de estado ("404") en Merriweather (serif editorial institucional).
             Cuerpo explicativo y botones de acción en Manrope (sans-serif moderna y legible).
  SPACE:     Rhythm de sección espacioso (min-h-[70vh] flex items-center justify-center p-6), espaciado interno estricto (gap-4, p-8).
  SHAPE:     Radio canónico rounded-2xl, micro-border perimetral border-surface-border.
  MOTION:    Animación CSS fluida respetando prefers-reduced-motion (0ms de transición bajo reducción de movimiento).
  SIGNATURE: Composición sobria con isotipo institucional de CEOUBB, mensaje empático en español ("Página no encontrada")
             y botón accesible con icono Phosphor ArrowLeft hacia "/".
*/

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-base text-text-primary">
      <a className="skip-link" href="#main-content">
        Saltar al contenido principal
      </a>

      <header className="policy-head">
        <Link className="app-brand" href="/">
          <Image
            src="/brand/ubb-shield.webp"
            alt="Escudo oficial de la Universidad del Bío-Bío"
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

      <main
        id="main-content"
        tabIndex={-1}
        className="flex flex-1 items-center justify-center px-4 py-12 outline-none sm:px-6"
      >
        <div className="w-full max-w-lg rounded-2xl border border-surface-border bg-surface-raised p-8 text-center shadow-xs transition-transform duration-150 motion-reduce:transform-none sm:p-10">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-surface-border bg-surface-base">
            <Image
              src="/favicon.svg"
              alt=""
              aria-hidden="true"
              width={32}
              height={32}
              className="h-8 w-8"
            />
          </div>

          <p className="num mt-6 font-serif text-6xl font-bold tracking-tight text-brand-blue select-none sm:text-7xl">
            404
          </p>

          <h1 className="mt-3 font-serif text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
            Página no encontrada
          </h1>

          <p className="mt-4 font-sans text-base leading-relaxed text-text-secondary">
            El recurso, sección académica o documento que buscas no está disponible en la
            plataforma, fue archivado en un período anterior o la dirección web ingresada no es
            válida.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-blue px-5 py-2.5 font-sans text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-blue-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue active:scale-[0.98]"
            >
              <ArrowLeft size={16} weight="bold" aria-hidden="true" />
              Volver al inicio
            </Link>

            <Link
              href="/faq"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-surface-border bg-surface-raised px-5 py-2.5 font-sans text-sm font-medium text-text-secondary transition-colors duration-150 hover:bg-stone-100 hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue active:scale-[0.98]"
            >
              <Question size={16} weight="bold" aria-hidden="true" />
              Preguntas frecuentes
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
