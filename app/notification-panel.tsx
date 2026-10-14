"use client";

import { useState, type CSSProperties } from "react";
import {
  ArrowRight,
  BellSimple,
  BookOpen,
  Checks,
  ClipboardText,
  LinkSimple,
  Megaphone,
  type Icon,
} from "@phosphor-icons/react";
import { stampLabel, type NotificationItem } from "../lib/communications.ts";
import type { CourseActivity } from "../lib/firebase-classroom-client.ts";
import { useClock } from "../lib/hooks/use-clock";
import { initials } from "../lib/portal-utils";
import { skeletonWave } from "../lib/skeleton-wave";
import { Bone, Line } from "./views/skeleton-bones";

type PostKind = CourseActivity["kind"];

const POST_ICONS: Record<PostKind, Icon> = {
  notice: Megaphone,
  guide: BookOpen,
  assessment: ClipboardText,
  resource: LinkSimple,
};

export function CommunicationMark({
  tone,
  kind,
  name = "",
}: {
  tone: string;
  kind?: PostKind;
  name?: string;
}) {
  const PostIcon = kind ? POST_ICONS[kind] : null;
  return (
    <span
      aria-hidden="true"
      className="communication-mark"
      data-shape={PostIcon ? "post" : "person"}
      style={{ "--course-tone": tone } as CSSProperties}
    >
      {PostIcon ? <PostIcon size={18} /> : initials(name)}
    </span>
  );
}

// Implements: REQ-NOTIF-06
export function NotificationSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando notificaciones"
      className="notification-list"
      ref={skeletonWave}
      role="status"
    >
      <div className="notification-group">
        <span className="notification-group-title">
          <Line quiet w="4.5em" />
        </span>
        <ul>
          {[0, 1, 2].map((row) => (
            <li key={row}>
              <span className="notification-row">
                <span className="row-flag" />
                <Bone h={34} r="var(--radius-md)" w={34} />
                <span className="notification-copy">
                  <strong>
                    <Line w={`${58 + ((row * 17) % 30)}%`} />
                  </strong>
                  <small>
                    <Line quiet w={`${70 - row * 9}%`} />
                  </small>
                </span>
                <span className="notification-time">
                  <Line quiet w="3em" />
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function NotificationGroup({
  title,
  items,
  now,
  onOpen,
}: {
  title: string;
  items: readonly NotificationItem[];
  now: Date;
  onOpen: (item: NotificationItem) => void;
}) {
  return (
    <section aria-label={title} className="notification-group">
      <h3 className="notification-group-title">{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <button
              className="notification-row"
              data-unread={item.unread}
              onClick={() => onOpen(item)}
              type="button"
            >
              <span className="row-flag">
                {item.unread && (
                  <span className="notification-dot" aria-label="Sin leer" role="img" />
                )}
              </span>
              <CommunicationMark kind={item.kind} name={item.title} tone={item.tone} />
              <span className="notification-copy">
                <strong>{item.title}</strong>
                <small>
                  {item.courseName} · {item.excerpt}
                </small>
              </span>
              <time className="notification-time num" dateTime={item.createdAt}>
                {stampLabel(item.createdAt, now)}
              </time>
            </button>
          </li>
        ))}
      </ul>
    </section>
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
  const now = useClock();
  const [initialLoading] = useState(loading);
  const unread = items.filter((item) => item.unread);
  const read = items.filter((item) => !item.unread);

  return (
    <div className="notification-panel-body">
      <header className="notification-panel-head">
        <p id="notification-panel-title">Notificaciones</p>
        {unread.length > 0 && (
          <button className="notification-mark-all" onClick={onMarkAll} type="button">
            <Checks aria-hidden="true" size={16} />
            Marcar todas como leídas
          </button>
        )}
      </header>

      {loading ? (
        <NotificationSkeleton />
      ) : items.length === 0 ? (
        <div className="notification-empty">
          <BellSimple aria-hidden="true" size={26} />
          <p>No tienes notificaciones nuevas</p>
          <small>Los avisos de tus ramos y las respuestas a tus consultas llegarán aquí.</small>
        </div>
      ) : (
        <div className={initialLoading ? "notification-list resolve" : "notification-list"}>
          {unread.length > 0 && (
            <NotificationGroup items={unread} now={now} onOpen={onOpen} title="Sin leer" />
          )}
          {read.length > 0 && (
            <NotificationGroup
              items={read}
              now={now}
              onOpen={onOpen}
              title={unread.length > 0 ? "Anteriores" : "Recientes"}
            />
          )}
        </div>
      )}

      <button className="notification-see-all" onClick={onSeeAll} type="button">
        Ver todas las notificaciones
        <ArrowRight aria-hidden="true" size={16} />
      </button>
    </div>
  );
}
