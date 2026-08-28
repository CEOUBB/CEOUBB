"use client";

import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  Books,
  Check,
  DeviceMobile,
  DownloadSimple,
} from "@phosphor-icons/react";
import {
  APK_URL,
  instantTransition,
  rise,
  springDefault,
  stagger,
} from "../../../lib/portal-utils";
import { BRAND, RESOURCE_GROUPS } from "./resources-data";
import type { Brand, ResourceItem } from "./resources-data";

const LIBRARY_POINTS = [
  "Accede a evaluaciones y documentos de años anteriores cuando lo necesites.",
  "Practica con material real de la UBB para estudiar con anticipación.",
  "Abierta a todas las facultades: crece con lo que aportan estudiantes y docentes.",
];

/* El índice entra después de la portada: opacidad y 6px, no el mismo salto que
   la zona superior. Un solo gesto de carga, en dos tiempos. */
const settle = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } };

function BrandMark({ brand }: { brand: Brand }) {
  return (
    <svg aria-hidden="true" className="brand-mark" focusable="false" viewBox="0 0 24 24">
      {BRAND[brand].map((path) => (
        <path d={path.d} fill={path.fill} key={path.d} />
      ))}
    </svg>
  );
}

/* Marca de la fila: vector propio, imagen de la marca o el escudo UBB para los
   servicios institucionales que no tienen logotipo propio. */
function ResourceMark({ item }: { item: ResourceItem }) {
  if (item.brand) return <BrandMark brand={item.brand} />;
  if (item.image) {
    return (
      <Image
        alt=""
        aria-hidden="true"
        className="brand-mark"
        height={64}
        src={item.image}
        width={64}
      />
    );
  }
  return (
    <Image
      alt=""
      aria-hidden="true"
      className="brand-mark"
      height={594}
      src="/brand/ubb-shield.webp"
      width={388}
    />
  );
}

function ResourceRow({ item }: { item: ResourceItem }) {
  return (
    <li className="res-row">
      <a
        aria-label={`${item.name}${item.tag ? ` · ${item.tag}` : ""} (se abre en una nueva pestaña)`}
        href={item.url}
        rel="noreferrer noopener"
        target="_blank"
      >
        <span className="res-mark">
          <ResourceMark item={item} />
        </span>
        <span className="res-body">
          <span className="res-name">
            <b>{item.name}</b>
            {item.tag && <span className={`res-tag ${item.tone ?? "free"}`}>{item.tag}</span>}
          </span>
          {item.note ? <small>{item.note}</small> : <small className="res-host">{item.host}</small>}
        </span>
        <ArrowUpRight className="brand-go" size={14} />
      </a>
    </li>
  );
}

export function ResourcesView() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <m.section
      animate="show"
      className="resources-hub"
      initial={shouldReduceMotion ? "show" : "hidden"}
      variants={shouldReduceMotion ? undefined : stagger}
    >
      <div className="page-head lead">
        <h1>Recursos de estudio</h1>
        <p>
          <span>
            Herramientas, material académico y convenios para acompañar tu estudio durante el
            semestre.
          </span>
        </p>
      </div>

      <m.div
        className="res-top"
        transition={shouldReduceMotion ? instantTransition : springDefault}
        variants={shouldReduceMotion ? undefined : rise}
      >
        <section className="library-panel">
          <div className="library-lead">
            <span className="library-icon">
              <Books size={24} />
            </span>
            <h2>Biblioteca académica</h2>
            {/* Implements: REQ-QMD-03 */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a className="library-cta" href="/biblioteca/index.html">
              Abrir biblioteca <ArrowRight size={16} />
            </a>
          </div>
          <ul className="library-points">
            {LIBRARY_POINTS.map((point) => (
              <li key={point}>
                <Check size={15} weight="bold" /> {point}
              </li>
            ))}
          </ul>
        </section>

        <div className="mobile-strip">
          <span className="mobile-strip-icon">
            <DeviceMobile size={20} />
          </span>
          <div className="mobile-strip-text">
            <b>CEOUBB Móvil</b>
            <small>
              La publicación en tiendas está en preparación. El APK de Android ya se puede instalar.
            </small>
          </div>
          <div
            aria-label="Aplicaciones móviles en preparación"
            className="store-badges"
            role="group"
          >
            <div className="store-badge">
              <Image
                alt="App Store"
                height={1284}
                src="/brand/app-store-badge-es.webp"
                width={3840}
              />
            </div>
            <div className="store-badge">
              <Image
                alt="Google Play"
                height={675}
                src="/brand/google-play-badge-es.webp"
                width={2214}
              />
            </div>
          </div>
          <a className="mobile-strip-action" href={APK_URL}>
            <DownloadSimple size={16} /> Descargar APK
          </a>
        </div>
      </m.div>

      {RESOURCE_GROUPS.map((group) => (
        <m.section
          className={`res-group${group.disclaimer ? " res-group-ubb" : ""}`}
          key={group.id}
          transition={shouldReduceMotion ? instantTransition : springDefault}
          variants={shouldReduceMotion ? undefined : settle}
        >
          <div className="section-title compact-title">
            <h2>{group.title}</h2>
            <span className="res-group-count num">{group.items.length}</span>
          </div>
          <ul className="res-index">
            {group.items.map((item) => (
              <ResourceRow item={item} key={item.url} />
            ))}
          </ul>
          {group.notes && (
            <ul className="res-notes">
              {group.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          )}
          {group.disclaimer && <p className="res-disclaimer">{group.disclaimer}</p>}
        </m.section>
      ))}
    </m.section>
  );
}
