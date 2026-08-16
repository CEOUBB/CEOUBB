"use client";

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
import { APK_URL, ease, rise, stagger } from "../../../lib/portal-utils";
import { AI_TIERS, BRAND, PERK_GROUPS, UBB_PORTALS } from "./resources-data";
import type { Brand } from "./resources-data";

function BrandMark({ brand }: { brand: Brand }) {
  return (
    <svg aria-hidden="true" className="brand-mark" focusable="false" viewBox="0 0 24 24">
      {BRAND[brand].map((path) => (
        <path d={path.d} fill={path.fill} key={path.d} />
      ))}
    </svg>
  );
}

export function ResourcesView() {
  return (
    <m.section animate="show" className="resources-hub" initial="hidden" variants={stagger}>
      <div className="page-head lead">
        <h1>Recursos de estudio</h1>
        <p>
          <span>
            Biblioteca colaborativa, asistentes de inteligencia artificial y beneficios con tu
            correo institucional, para cualquier carrera de la Universidad del Bío-Bío.
          </span>
        </p>
      </div>

      <m.div className="resource-block" transition={{ duration: 0.4, ease }} variants={rise}>
        <div className="section-title">
          <h2>Ecosistema CEOUBB</h2>
        </div>
        <div className="resource-layout">
          <m.a className="resource-card" href="/biblioteca/index.html" whileHover={{ y: -1 }}>
            <span className="resource-icon">
              <Books size={22} />
            </span>
            <h3>Biblioteca académica</h3>
            <p>
              Banco colaborativo de certámenes, controles y apuntes que la comunidad va sumando
              período a período.
            </p>
            <ul className="resource-points">
              <li>
                <Check size={15} weight="bold" /> Evaluaciones completas con puntaje y tiempo real
                de aplicación.
              </li>
              <li>
                <Check size={15} weight="bold" /> Pautas desarrolladas paso a paso, no sólo la
                alternativa correcta.
              </li>
              <li>
                <Check size={15} weight="bold" /> Abierta a todas las facultades: se amplía con lo
                que aportan estudiantes y docentes.
              </li>
            </ul>
            <b>
              Abrir biblioteca <ArrowRight size={14} />
            </b>
          </m.a>
          <div className="resource-card">
            <span className="resource-icon">
              <DeviceMobile size={22} />
            </span>
            <h3>CEOUBB Móvil</h3>
            <p>La biblioteca de estudio viaja contigo y funciona sin conexión.</p>
            <div
              className="store-badges"
              role="group"
              aria-label="Aplicaciones móviles próximamente disponibles"
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
            <em>
              Publicación en tiendas en preparación. Mientras tanto, el APK de Android está
              disponible.
            </em>
            <a className="resource-inline" href={APK_URL}>
              <DownloadSimple size={15} /> Descargar APK para Android
            </a>
          </div>
        </div>
      </m.div>

      <m.div className="resource-block" transition={{ duration: 0.4, ease }} variants={rise}>
        <div className="section-title">
          <h2>Asistentes de inteligencia artificial</h2>
        </div>
        {AI_TIERS.map((tier) => (
          <div className="tier-group" key={tier.id}>
            <div className="tier-head">
              <h3 className={`tier-label ${tier.tone}`}>{tier.label}</h3>
              <p>{tier.note}</p>
            </div>
            <ul className="chip-grid">
              {tier.tools.map((tool) => (
                <li key={tool.name}>
                  <a
                    className="brand-chip"
                    href={tool.url}
                    rel="noreferrer noopener"
                    target="_blank"
                  >
                    <BrandMark brand={tool.brand} />
                    <b>{tool.name}</b>
                    <ArrowUpRight className="brand-go" size={14} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </m.div>

      <m.div className="resource-block" transition={{ duration: 0.4, ease }} variants={rise}>
        <div className="section-title">
          <h2>Beneficios con tu correo institucional</h2>
        </div>
        {PERK_GROUPS.map((group) => (
          <div className="tier-group" key={group.id}>
            <div className="tier-head">
              <h3 className={`tier-label ${group.tone}`}>{group.label}</h3>
            </div>
            <ul className="brand-grid">
              {group.items.map((perk) => (
                <li key={perk.name}>
                  <a
                    className="brand-tile"
                    href={perk.url}
                    rel="noreferrer noopener"
                    target="_blank"
                  >
                    <span className="brand-head">
                      <BrandMark brand={perk.brand} />
                      <b>{perk.name}</b>
                      <ArrowUpRight className="brand-go" size={14} />
                    </span>
                    <small>{perk.note}</small>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </m.div>

      <m.div className="resource-block" transition={{ duration: 0.4, ease }} variants={rise}>
        <div className="section-title">
          <h2>Portales y servicios oficiales UBB</h2>
        </div>
        <div className="portal-panel">
          <p>
            Sistemas administrados por la Universidad del Bío-Bío. CEOUBB es una plataforma
            estudiantil independiente y no los reemplaza.
          </p>
          <ul className="portal-links">
            {UBB_PORTALS.map((portal) => (
              <li key={portal.host}>
                <a
                  className="portal-link"
                  href={portal.url}
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  <span className="portal-mark">
                    {portal.brand && <BrandMark brand={portal.brand} />}
                    {portal.image && (
                      <Image
                        alt=""
                        aria-hidden="true"
                        height={128}
                        src={portal.image}
                        width={128}
                      />
                    )}
                    {!portal.brand && !portal.image && (
                      <Image
                        alt=""
                        aria-hidden="true"
                        height={594}
                        src="/brand/ubb-shield.webp"
                        width={388}
                      />
                    )}
                  </span>
                  <span className="portal-copy">
                    <b>{portal.name}</b>
                    <small>{portal.host}</small>
                  </span>
                  <ArrowUpRight className="brand-go" size={14} />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </m.div>
    </m.section>
  );
}
