import Image from "next/image";
import { ArrowUpRight, DeviceMobile, DownloadSimple } from "@phosphor-icons/react";
import { APK_URL } from "../../../lib/portal-utils";
import type { ResourceGroup, ResourceItem } from "./resources-data";

export function MobileStrip() {
  return (
    <div className="res-top">
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
        <div aria-label="Aplicaciones móviles en preparación" className="store-badges" role="group">
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
    </div>
  );
}

export function ResourceRow({ item, mark }: { item: ResourceItem; mark: React.ReactNode }) {
  return (
    <li className="res-row">
      <a
        aria-label={`${item.name}${item.tag ? ` · ${item.tag}` : ""} (se abre en una nueva pestaña)`}
        href={item.url}
        rel="noreferrer noopener"
        target="_blank"
      >
        <span className="res-mark">{mark}</span>
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

export function ResourceGroupSection({
  group,
  renderMark,
}: {
  group: ResourceGroup;
  renderMark: (item: ResourceItem) => React.ReactNode;
}) {
  return (
    <section
      className={`res-group${group.disclaimer ? " res-group-ubb" : ""}`}
      id={`recursos-${group.id}`}
      tabIndex={-1}
    >
      <div className="section-title compact-title">
        <h2>{group.title}</h2>
        <span className="res-group-count num">{group.items.length}</span>
      </div>
      <ul className="res-index">
        {group.items.map((item) => (
          <ResourceRow item={item} key={item.url} mark={renderMark(item)} />
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
    </section>
  );
}
