"use client";

import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import Image from "next/image";
import { ArrowUpRight, DeviceMobile, DownloadSimple } from "@phosphor-icons/react";
import {
  APK_URL,
  instantTransition,
  rise,
  springDefault,
  stagger,
} from "../../../lib/portal-utils";
import { RESOURCE_GROUPS } from "./resources-data";
import type { Brand, ResourceItem } from "./resources-data";

const BRAND_LOGOS: Record<Brand, string> = {
  chatgpt: "/brand/chatgpt.svg",
  claude: "/brand/claude.svg",
  gemini: "/brand/gemini.svg",
  deepseek: "/brand/deepseek.svg",
  kimi: "/brand/kimi.svg",
  qwen: "/brand/qwen.svg",
  github: "/brand/github.svg",
  notion: "/brand/notion.svg",
  microsoft: "/brand/microsoft.svg",
  autodesk: "/brand/autodesk.svg",
  spotify: "/brand/spotify.svg",
  applemusic: "/brand/applemusic.svg",
  moodle: "/brand/moodle.svg",
  youtubemusic: "/brand/youtubemusic.svg",
  perplexity: "/brand/perplexity.svg",
};

/* El índice entra después de la portada: opacidad y 6px, no el mismo salto que
   la zona superior. Un solo gesto de carga, en dos tiempos. */
const settle = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } };

function BrandMark({ brand }: { brand: Brand }) {
  const logoSrc = BRAND_LOGOS[brand];
  if (!logoSrc) return null;
  return (
    <Image
      alt=""
      aria-hidden="true"
      className="brand-mark"
      height={24}
      src={logoSrc}
      unoptimized
      width={24}
    />
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
        <ArrowUpRight aria-hidden="true" className="brand-go" size={14} />
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
        <div className="mobile-strip">
          <span className="mobile-strip-icon">
            <DeviceMobile aria-hidden="true" size={20} />
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
            <DownloadSimple aria-hidden="true" size={16} /> Descargar APK
          </a>
        </div>
      </m.div>

      <nav className="resource-index" aria-label="Categorías de recursos">
        {RESOURCE_GROUPS.map((group) => (
          <a href={`#recursos-${group.id}`} key={group.id}>
            {group.title}
          </a>
        ))}
      </nav>
      {RESOURCE_GROUPS.map((group) => (
        <m.section
          className={`res-group${group.disclaimer ? " res-group-ubb" : ""}`}
          key={group.id}
          id={`recursos-${group.id}`}
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
