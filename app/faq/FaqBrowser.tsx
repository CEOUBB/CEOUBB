"use client";

import { CaretRight, MagnifyingGlass } from "@phosphor-icons/react";
import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { CATEGORIAS_FAQ, TOTAL_PREGUNTAS, type PreguntaFrecuente } from "./faq-content.ts";

/*
  Implements: REQ-HELP-07, REQ-HELP-08

  El contenido se importa, no llega por props: es un módulo plano y así no viaja
  dos veces en la carga de la página.

  Todo el listado se renderiza en el servidor. Sin JavaScript el filtro no
  aparece, pero las preguntas siguen ahí y `<details>` abre de forma nativa.
*/

/*
  Buscar "matematica" tiene que encontrar "matemática". Se descomponen los
  acentos y se descartan las marcas diacríticas combinantes (U+0300 a U+036F).
*/
function normalizar(valor: string) {
  return valor.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function coincide(pregunta: PreguntaFrecuente, termino: string) {
  if (!termino) return true;
  const objetivo = normalizar(`${pregunta.pregunta} ${pregunta.respuesta.join(" ")}`);
  return normalizar(termino)
    .split(/\s+/)
    .filter(Boolean)
    .every((palabra) => objetivo.includes(palabra));
}

/*
  Implements: REQ-HELP-08
  El fragmento de la URL es estado del navegador, no del componente, así que se
  lee con `useSyncExternalStore` en lugar de copiarlo a un `useState` desde un
  efecto. De regalo, suscribirse a `hashchange` hace que un enlace a otra
  pregunta funcione también estando ya en la página.
*/
function suscribirAlFragmento(alCambiar: () => void) {
  window.addEventListener("hashchange", alCambiar);
  return () => window.removeEventListener("hashchange", alCambiar);
}

function leerFragmento() {
  return window.location.hash;
}

/** En el servidor no hay fragmento: la página se entrega con todo cerrado. */
function fragmentoEnServidor() {
  return "";
}

export default function FaqBrowser() {
  const [termino, setTermino] = useState("");
  /*
    `useDeferredValue` deja que el tecleo se pinte de inmediato y difiere el
    refiltrado. Hace el trabajo de un debounce sin temporizadores que limpiar.
  */
  const filtro = useDeferredValue(termino).trim();
  const fragmento = useSyncExternalStore(suscribirAlFragmento, leerFragmento, fragmentoEnServidor);
  const anclaAbierta = fragmento ? decodeURIComponent(fragmento.slice(1)) : null;

  /*
    Desplazar es un efecto sobre el DOM, no estado. El navegador ya salta al
    fragmento al cargar, pero lo hace antes de que React abra la pregunta, y la
    apertura mueve el documento bajo los pies del lector.
  */
  useEffect(() => {
    if (!anclaAbierta) return;
    document.getElementById(anclaAbierta)?.scrollIntoView({ block: "start", behavior: "auto" });
  }, [anclaAbierta]);

  const grupos = useMemo(
    () =>
      CATEGORIAS_FAQ.map((categoria) => ({
        ...categoria,
        preguntas: categoria.preguntas.filter((pregunta) => coincide(pregunta, filtro)),
      })).filter((categoria) => categoria.preguntas.length > 0),
    [filtro]
  );

  const visibles = grupos.reduce((total, grupo) => total + grupo.preguntas.length, 0);
  const filtrando = filtro.length > 0;

  return (
    <>
      <div className="policy-filter">
        <label htmlFor="faq-filtro">Buscar en las preguntas</label>
        <div className="policy-filter-control">
          <MagnifyingGlass aria-hidden="true" size={18} />
          <input
            autoComplete="off"
            id="faq-filtro"
            onChange={(evento) => setTermino(evento.target.value)}
            placeholder="notas, contraseña, biblioteca…"
            type="search"
            value={termino}
          />
        </div>
        <p aria-live="polite" className="policy-count">
          {filtrando
            ? `${visibles} de ${TOTAL_PREGUNTAS} preguntas coinciden`
            : `${TOTAL_PREGUNTAS} preguntas publicadas`}
        </p>
      </div>

      {grupos.map((categoria) => (
        <section aria-labelledby={`titulo-${categoria.slug}`} key={categoria.slug}>
          <h2 id={`titulo-${categoria.slug}`}>{categoria.titulo}</h2>
          <div className="policy-group">
            {categoria.preguntas.map((pregunta) => (
              <details
                className="policy-disclosure"
                id={pregunta.slug}
                key={pregunta.slug}
                /*
                  Con filtro activo las coincidencias se abren solas: filtrar y
                  después tener que abrir cada resultado sería pedir dos gestos
                  para una sola intención.
                */
                open={filtrando || pregunta.slug === anclaAbierta ? true : undefined}
              >
                <summary>
                  <CaretRight aria-hidden="true" size={16} weight="bold" />
                  <span>{pregunta.pregunta}</span>
                </summary>
                <div className="policy-answer">
                  {pregunta.respuesta.map((parrafo) => (
                    <p key={parrafo.slice(0, 40)}>{parrafo}</p>
                  ))}
                  {pregunta.enlace ? (
                    pregunta.enlace.href.startsWith("/biblioteca") ? (
                      <a href={pregunta.enlace.href}>{pregunta.enlace.texto}</a>
                    ) : (
                      <Link href={pregunta.enlace.href}>{pregunta.enlace.texto}</Link>
                    )
                  ) : null}
                </div>
              </details>
            ))}
          </div>
        </section>
      ))}

      {visibles === 0 ? (
        <div className="policy-empty">
          <p>
            Ninguna pregunta publicada menciona <strong>{filtro}</strong>. Puede que sea algo que
            todavía no hemos respondido aquí.
          </p>
          <Link className="policy-submit" href="/contacto">
            Preguntar directamente
          </Link>
        </div>
      ) : null}
    </>
  );
}
