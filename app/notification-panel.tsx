"use client";

import { ArrowRight, Checks } from "@phosphor-icons/react";
import type { NotificationItem } from "../lib/communications.ts";

const NOTIFICATION_DATE = new Intl.DateTimeFormat("es-CL", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Santiago",
});

function notificationDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Fecha no disponible" : NOTIFICATION_DATE.format(date);
}

/*
  El esqueleto repite la geometría real de la fila: banda de tono, dos líneas de
  texto y el mismo alto útil. Si difiere, el panel salta al resolverse la
  suscripción y el usuario pierde la fila que estaba por tocar.
*/
// Implements: REQ-NOTIF-06
export function NotificationSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando notificaciones"
      className="notification-skeleton"
      role="status"
    >
      {[0, 1, 2].map((row) => (
        <span className="notification-skeleton-row" key={row}>
          <span className="notification-skeleton-band" />
          <span className="notification-skeleton-lines">
            <span className="notification-skeleton-line" />
            <span className="notification-skeleton-line short" />
          </span>
        </span>
      ))}
    </div>
  );
}

// Implements: REQ-NOTIF-02 REQ-NOTIF-03 REQ-NOTIF-04 REQ-NOTIF-05 REQ-NOTIF-06 REQ-NOTIF-07
export function NotificationList({
  items,
  loading,
  onOpen,
  onMarkAll,
  onSeeAll,
}: {
  items: readonly NotificationItem[];
  loading: boolean;
  onOpen: (item: NotificationItem) => void;
  onMarkAll: () => void;
  onSeeAll: () => void;
}) {
  const unread = items.filter((item) => item.unread).length;

  return (
    <div className="notification-panel-body">
      <header className="notification-panel-head">
        <p id="notification-panel-title">Notificaciones</p>
        {unread > 0 && (
          <button className="notification-mark-all" onClick={onMarkAll} type="button">
            <Checks aria-hidden="true" size={15} />
            Marcar todas como leídas
          </button>
        )}
      </header>
      {loading ? (
        <NotificationSkeleton />
      ) : items.length === 0 ? (
        <p className="notification-empty">No tienes notificaciones nuevas</p>
      ) : (
        <ul className="notification-list">
          {items.map((item) => (
            <li key={item.id}>
              <button
                className="notification-row"
                data-unread={item.unread ? "true" : "false"}
                onClick={() => onOpen(item)}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className="notification-band"
                  style={{ background: item.tone }}
                />
                <span className="notification-copy">
                  <strong>{item.title}</strong>
                  <small>
                    {item.courseName} · {item.excerpt}
                  </small>
                </span>
                <span className="notification-time num">{notificationDate(item.createdAt)}</span>
                {item.unread && <span className="notification-dot" aria-label="Sin leer" />}
              </button>
            </li>
          ))}
        </ul>
      )}
      <button className="notification-see-all" onClick={onSeeAll} type="button">
        Ver todas las notificaciones
        <ArrowRight aria-hidden="true" size={15} />
      </button>
    </div>
  );
}
