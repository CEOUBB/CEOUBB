"use client";

import React, {
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion, type Transition, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  BellSlash,
  Checks,
  EnvelopeSimple,
  MegaphoneSimple,
} from "@phosphor-icons/react";
import type { NotificationItem } from "../lib/communications.ts";
import { EASE_OUT, SPRING_LAYOUT, SPRING_PRESS, SPRING_SWAP } from "../lib/ease";

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

export type NotificationGroupKey = "today" | "this_week" | "older";

export function groupNotifications(items: readonly NotificationItem[]): {
  today: NotificationItem[];
  thisWeek: NotificationItem[];
  older: NotificationItem[];
} {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStart = todayStart - 6 * 24 * 60 * 60 * 1000;

  const today: NotificationItem[] = [];
  const thisWeek: NotificationItem[] = [];
  const older: NotificationItem[] = [];

  for (const item of items) {
    const time = new Date(item.createdAt).getTime();
    if (Number.isNaN(time)) {
      older.push(item);
    } else if (time >= todayStart) {
      today.push(item);
    } else if (time >= weekStart) {
      thisWeek.push(item);
    } else {
      older.push(item);
    }
  }

  return { today, thisWeek, older };
}

/* ─────────────────────────────────────────────────────────
 * NOTIFICATION STACK PRIMITIVES (beUI / ReUI)
 * ───────────────────────────────────────────────────────── */

export type NotificationStackItem = {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  trailing?: ReactNode;
};

export type NotificationStackClassNames = {
  stack?: string;
  card?: string;
  content?: string;
  title?: string;
  description?: string;
  trailing?: string;
  footer?: string;
  count?: string;
};

export interface NotificationStackProps {
  items: NotificationStackItem[];
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  onViewAll?: () => void;
  maxVisible?: number;
  collapsedLabel?: string;
  expandedLabel?: string;
  emptyLabel?: string;
  className?: string;
  classNames?: NotificationStackClassNames;
}

const STACK_PEEK = 8;
const STACK_INSET = 12;

export function ActionSwapText({
  value,
  children,
  className = "",
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <span
      className={`relative -my-[0.08em] inline-block max-w-full whitespace-nowrap py-[0.08em] align-bottom ${className}`}
      style={{ clipPath: "inset(0 -999px)", WebkitClipPath: "inset(0 -999px)" }}
    >
      <span aria-hidden className="invisible inline-block whitespace-nowrap">
        {children}
      </span>
      <motion.span
        key={value}
        initial={reduce ? false : { opacity: 0, y: "90%", filter: "blur(3px)" }}
        animate={reduce ? { opacity: 1, y: 0 } : { opacity: 1, y: "0%", filter: "blur(0px)" }}
        exit={reduce ? undefined : { opacity: 0, y: "-90%", filter: "blur(3px)" }}
        transition={SPRING_SWAP}
        className="absolute left-0 top-[0.08em] inline-block max-w-full truncate will-change-[opacity,filter,transform]"
      >
        {children}
      </motion.span>
    </span>
  );
}

export function NotificationStack({
  items,
  expanded,
  defaultExpanded = false,
  onExpandedChange,
  onViewAll,
  maxVisible = 3,
  collapsedLabel = "Notificaciones",
  expandedLabel = "Ver todas",
  emptyLabel = "Todo al día",
  className = "",
  classNames,
}: NotificationStackProps) {
  const reduce = useReducedMotion();
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isControlled = expanded !== undefined;
  const isExpanded = expanded ?? internalExpanded;

  const setIsExpanded = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalExpanded(next);
      onExpandedChange?.(next);
    },
    [isControlled, onExpandedChange]
  );

  const visibleItems = items.slice(0, Math.max(1, maxVisible));
  const primaryItem = visibleItems[0];
  const transition: Transition = reduce ? { duration: 0 } : SPRING_LAYOUT;
  const cardTransition: Transition = reduce ? { duration: 0 } : { duration: 0.32, ease: EASE_OUT };
  const backgroundTransition: Transition = reduce
    ? { duration: 0 }
    : { duration: 0.26, ease: EASE_OUT };

  if (!primaryItem) {
    return (
      <div
        className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-[oklch(0.975_0.005_240)] px-4 py-6 text-sm font-medium text-[oklch(0.48_0.03_250)] ${className}`}
      >
        <BellSlash className="h-4 w-4" aria-hidden="true" />
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className={`relative z-10 block w-full text-left text-[oklch(0.2_0.03_260)] ${className}`}>
      <div className="relative p-2">
        <motion.span
          aria-hidden="true"
          layout
          initial={false}
          transition={backgroundTransition}
          className="absolute inset-0 rounded-2xl bg-[oklch(0.975_0.005_240)]"
        />
        <div
          className={`relative z-10 grid gap-1.5 ${!isExpanded ? "pb-2" : ""} ${classNames?.stack ?? ""}`}
        >
          {visibleItems.map((item, index) => {
            const isPrimary = index === 0;
            return (
              <motion.div
                key={item.id}
                layout="position"
                initial={false}
                animate={{
                  y: isExpanded ? 0 : index * STACK_PEEK,
                  clipPath: isExpanded
                    ? "inset(0px 0px round 12px)"
                    : `inset(0px ${index * STACK_INSET}px round 12px)`,
                }}
                transition={cardTransition}
                className={`block rounded-xl border border-[oklch(0.9_0.012_250)] bg-white px-3.5 py-2.5 shadow-sm ${classNames?.card ?? ""}`}
                style={{
                  zIndex: visibleItems.length - index,
                  gridColumn: 1,
                  gridRow: isExpanded ? index + 1 : 1,
                }}
              >
                <span className={`block ${!isPrimary && !isExpanded ? "invisible" : ""}`}>
                  <span className="flex min-w-0 items-start justify-between gap-2">
                    <span className="min-w-0 text-sm font-medium leading-snug truncate">
                      {item.title}
                    </span>
                    {item.trailing ? (
                      <span className="shrink-0 text-xs text-[oklch(0.48_0.03_250)] num">
                        {item.trailing}
                      </span>
                    ) : null}
                  </span>
                  {item.description ? (
                    <span className="block mt-1 text-xs text-[oklch(0.48_0.03_250)] line-clamp-2">
                      {item.description}
                    </span>
                  ) : null}
                </span>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          layout="position"
          transition={transition}
          className={`relative z-10 mt-2 flex min-h-8 items-center justify-between px-1 ${classNames?.footer ?? ""}`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[oklch(0.48_0.18_255)] text-xs font-semibold text-white num ${classNames?.count ?? ""}`}
            >
              {items.length}
            </span>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs font-semibold text-[oklch(0.2_0.03_260)] hover:text-[oklch(0.48_0.18_255)]"
            >
              <ActionSwapText value={isExpanded ? "expanded" : "collapsed"}>
                {isExpanded ? "Contraer pila" : collapsedLabel}
              </ActionSwapText>
            </button>
          </div>
          {onViewAll && (
            <button
              type="button"
              onClick={onViewAll}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[oklch(0.48_0.18_255)] hover:underline"
            >
              <span>{expandedLabel}</span>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </motion.div>
      </div>
    </div>
  );
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

/* ─────────────────────────────────────────────────────────
 * NOTIFICATION LIST & TEMPORAL GROUPS
 * ───────────────────────────────────────────────────────── */

function NotificationAvatar({ item }: { item: NotificationItem }) {
  const isThread = item.source === "thread";
  const initial = (item.courseName || item.title || "U").slice(0, 1).toUpperCase();

  return (
    <span
      aria-hidden="true"
      className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white shadow-sm overflow-hidden"
      style={{
        backgroundColor: item.tone || (isThread ? "oklch(0.48 0.18 255)" : "oklch(0.24 0.09 255)"),
      }}
    >
      {isThread ? (
        <EnvelopeSimple size={15} weight="bold" />
      ) : item.excerpt.includes("aviso") ? (
        <MegaphoneSimple size={15} weight="bold" />
      ) : (
        initial
      )}
    </span>
  );
}

function NotificationRow({
  item,
  onOpen,
}: {
  item: NotificationItem;
  onOpen: (item: NotificationItem) => void;
}) {
  return (
    <li>
      <motion.button
        className="notification-row group relative flex w-full items-center gap-3 border-b border-[oklch(0.9_0.012_250)] p-3 text-left transition-colors duration-150 hover:bg-[oklch(0.975_0.005_240)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.48_0.18_255)]"
        data-unread={item.unread ? "true" : "false"}
        onClick={() => onOpen(item)}
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.99 }}
        transition={SPRING_PRESS}
        type="button"
      >
        <span
          aria-hidden="true"
          className="notification-band shrink-0 w-1 self-stretch rounded-full"
          style={{ background: item.tone || "oklch(0.48 0.18 255)" }}
        />

        <NotificationAvatar item={item} />

        <span className="notification-copy flex min-w-0 flex-1 flex-col">
          <strong className="truncate text-sm font-semibold text-[oklch(0.2_0.03_260)] group-hover:text-[oklch(0.48_0.18_255)] transition-colors">
            {item.title}
          </strong>
          <small className="truncate text-xs text-[oklch(0.48_0.03_250)] mt-0.5">
            {item.courseName} · {item.excerpt}
          </small>
        </span>

        <span className="notification-time num shrink-0 text-right text-[11px] text-[oklch(0.48_0.03_250)]">
          {notificationDate(item.createdAt)}
        </span>

        {item.unread && (
          <span className="notification-dot" aria-label="Sin leer" role="img">
            <motion.span
              className="block h-full w-full rounded-full bg-[oklch(0.55_0.22_25)]"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.4 }}
              whileTap={{ scale: 0.8 }}
              transition={{ type: "spring", stiffness: 420, damping: 24 }}
            />
          </span>
        )}
      </motion.button>
    </li>
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
  const groups = useMemo(() => groupNotifications(items), [items]);

  return (
    <div className="notification-panel-body flex flex-col max-h-[min(70vh,540px)]">
      <header className="notification-panel-head flex items-center justify-between gap-2 border-b border-[oklch(0.9_0.012_250)] px-4 py-3">
        <div className="flex items-center gap-2">
          <p
            id="notification-panel-title"
            className="text-sm font-semibold text-[oklch(0.2_0.03_260)]"
          >
            Notificaciones
          </p>
          {unread > 0 && (
            <span className="inline-flex items-center rounded-full bg-[oklch(0.48_0.18_255)] px-2 py-0.5 text-[11px] font-semibold text-white num">
              {unread}
            </span>
          )}
        </div>
        {unread > 0 && (
          <motion.button
            className="notification-mark-all inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-[oklch(0.48_0.18_255)] hover:bg-[rgba(0,85,184,0.07)] transition-colors"
            onClick={onMarkAll}
            type="button"
            whileTap={{ scale: 0.97 }}
            transition={SPRING_PRESS}
          >
            <Checks aria-hidden="true" size={15} />
            Marcar todas como leídas
          </motion.button>
        )}
      </header>

      {loading ? (
        <NotificationSkeleton />
      ) : items.length === 0 ? (
        <div className="notification-empty flex flex-col items-center justify-center gap-2 py-10 text-center text-sm text-[oklch(0.48_0.03_250)]">
          <BellSlash size={32} className="text-[oklch(0.48_0.03_250)]" />
          <p>No tienes notificaciones nuevas</p>
        </div>
      ) : (
        <div className="notification-list flex-1 overflow-y-auto">
          {groups.today.length > 0 && (
            <div className="notification-group">
              <div className="sticky top-0 z-10 border-b border-[oklch(0.9_0.012_250)] bg-[oklch(0.975_0.005_240)]/90 backdrop-blur-sm px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[oklch(0.48_0.03_250)]">
                Hoy ({groups.today.length})
              </div>
              <ul className="list-none p-0 m-0">
                {groups.today.map((item) => (
                  <NotificationRow key={item.id} item={item} onOpen={onOpen} />
                ))}
              </ul>
            </div>
          )}

          {groups.thisWeek.length > 0 && (
            <div className="notification-group">
              <div className="sticky top-0 z-10 border-b border-[oklch(0.9_0.012_250)] bg-[oklch(0.975_0.005_240)]/90 backdrop-blur-sm px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[oklch(0.48_0.03_250)]">
                Esta semana ({groups.thisWeek.length})
              </div>
              <ul className="list-none p-0 m-0">
                {groups.thisWeek.map((item) => (
                  <NotificationRow key={item.id} item={item} onOpen={onOpen} />
                ))}
              </ul>
            </div>
          )}

          {groups.older.length > 0 && (
            <div className="notification-group">
              <div className="sticky top-0 z-10 border-b border-[oklch(0.9_0.012_250)] bg-[oklch(0.975_0.005_240)]/90 backdrop-blur-sm px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[oklch(0.48_0.03_250)]">
                Anteriores ({groups.older.length})
              </div>
              <ul className="list-none p-0 m-0">
                {groups.older.map((item) => (
                  <NotificationRow key={item.id} item={item} onOpen={onOpen} />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <button
        className="notification-see-all flex items-center justify-between border-t border-[oklch(0.9_0.012_250)] bg-white px-4 py-3 text-xs font-semibold text-[oklch(0.48_0.18_255)] transition-colors hover:bg-[oklch(0.975_0.005_240)]"
        onClick={onSeeAll}
        type="button"
      >
        <span>Ver todas las notificaciones</span>
        <ArrowRight aria-hidden="true" size={15} />
      </button>
    </div>
  );
}
