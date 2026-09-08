"use client";
// beui.dev/components/blocks/command-palette

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { type ReactNode, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EASE_OUT } from "@/lib/ease";
import { useOnOpen } from "@/lib/hooks/use-on-open";
import { useRowCursor } from "@/lib/hooks/use-row-cursor";
import { useTouchCapable } from "@/lib/hooks/use-touch-capable";
import { PresenceGate } from "@/lib/presence-gate";

export type PaletteItem = {
  id: string;
  label: string;
  group?: string;
  hint?: string;
  tone?: string;
  keywords?: string[];
  icon?: ReactNode;
  badge?: ReactNode;
  run?: () => void;
  onSelect?: () => void;
};

export type CommandItem = PaletteItem;

export interface CommandPaletteProps {
  items: PaletteItem[];
  /** Opens with Cmd/Ctrl + this key. Default: "k" */
  shortcut?: string;
  placeholder?: string;
  emptyMessage?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
}

function fuzzyMatch(needle: string, hay: string) {
  if (!needle) return true;
  needle = needle.toLowerCase();
  hay = hay.toLowerCase();
  let i = 0;
  for (const ch of hay) {
    if (ch === needle[i]) i++;
    if (i === needle.length) return true;
  }
  return false;
}

const PANEL_SPRING = {
  type: "spring",
  stiffness: 560,
  damping: 40,
  mass: 0.5,
} as const;

const ACTIVE_SPRING = {
  type: "spring",
  stiffness: 340,
  damping: 28,
} as const;

export function CommandPalette({
  items,
  shortcut = "k",
  placeholder = "Buscar ramos, vistas y recursos…",
  emptyMessage = "Sin resultados para tu búsqueda. Prueba con el nombre o código del ramo.",
  open: controlledOpen,
  onOpenChange,
  onClose,
}: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const controlled = controlledOpen !== undefined;
  const open = controlled ? controlledOpen : internalOpen;
  const setOpen = useCallback(
    (v: boolean) => {
      if (!controlled) setInternalOpen(v);
      onOpenChange?.(v);
      if (!v) onClose?.();
    },
    [controlled, onClose, onOpenChange]
  );

  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const uid = useId();
  const reduce = useReducedMotion();
  const canTouch = useTouchCapable();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === shortcut.toLowerCase()) {
        e.preventDefault();
        setOpen(!open);
        return;
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, shortcut, setOpen]);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    root.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      root.style.overflow = previousRootOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [open]);

  const filtered = useMemo(() => {
    if (!query) return items;
    return items.filter((it) => {
      const haystacks = [it.label, it.group ?? "", it.hint ?? "", ...(it.keywords ?? [])];
      return haystacks.some((h) => fuzzyMatch(query, h));
    });
  }, [items, query]);

  const hasIcons = useMemo(() => items.some((it) => it.icon), [items]);

  const grouped = useMemo(() => {
    const map = new Map<string, PaletteItem[]>();
    filtered.forEach((it) => {
      const g = it.group ?? "General";
      const groupItems = map.get(g) ?? [];
      groupItems.push(it);
      map.set(g, groupItems);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const rows = useMemo(() => grouped.flatMap(([, list]) => list), [grouped]);

  const { activeIndex: active, moveTo, moveActive } = useRowCursor(rows, query);

  useOnOpen(open, () => {
    setQuery("");
    moveTo(null);
  });

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveActive(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveActive(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const it = rows[active];
      if (it) {
        setOpen(false);
        const action = it.run ?? it.onSelect;
        action?.();
      }
    }
  };

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLButtonElement>(`[data-index="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence initial={false}>
      {open ? (
        <PresenceGate key="backdrop">
          {({ gate }) => (
            <motion.button
              type="button"
              aria-label="Cerrar búsqueda"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{
                opacity: 0,
                transition: { duration: 0.12, ease: EASE_OUT },
              }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
              {...gate}
              onClick={() => setOpen(false)}
              className="pointer-events-auto fixed inset-0 z-[100] bg-[rgba(15,23,42,0.45)] [backdrop-filter:blur(12px)_saturate(140%)] [-webkit-backdrop-filter:blur(12px)_saturate(140%)]"
            />
          )}
        </PresenceGate>
      ) : null}

      {open ? (
        <PresenceGate key="panel-layer">
          {({ isPresent, gate }) => (
            <div
              inert={!isPresent}
              className="pointer-events-none fixed inset-x-4 bottom-4 top-[12vh] z-[100] flex items-start justify-center"
            >
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label="Buscar en Centro de Estudio UBB"
                initial={{
                  opacity: 0,
                  y: reduce ? 0 : -8,
                  scale: reduce ? 1 : 0.97,
                }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{
                  opacity: 0,
                  y: reduce ? 0 : -8,
                  scale: reduce ? 1 : 0.97,
                  transition: { duration: 0.12, ease: EASE_OUT },
                }}
                transition={reduce ? { duration: 0.1 } : PANEL_SPRING}
                {...gate}
                onKeyDown={onKeyDown}
                className="pointer-events-auto w-full max-w-xl overflow-hidden rounded-2xl border border-[oklch(0.92_0.006_60)] bg-white shadow-2xl will-change-transform text-[oklch(0.2_0.03_260)]"
              >
                <div className="flex items-center gap-3 border-b border-[oklch(0.92_0.006_60)] px-4">
                  <MagnifyingGlass
                    size={18}
                    aria-hidden="true"
                    className="shrink-0 text-[oklch(0.48_0.03_250)]"
                  />
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={placeholder}
                    role="combobox"
                    aria-expanded="true"
                    aria-controls={`${uid}-list`}
                    aria-activedescendant={rows.length > 0 ? `${uid}-opt-${active}` : undefined}
                    aria-autocomplete="list"
                    className={`h-13 flex-1 bg-transparent text-sm text-[oklch(0.2_0.03_260)] placeholder:text-[oklch(0.52_0.03_250)] caret-[oklch(0.48_0.18_255)] outline-none ${
                      canTouch ? "text-base" : "text-sm"
                    }`}
                  />
                  <kbd className="hidden rounded border border-[oklch(0.92_0.006_60)] bg-[oklch(0.975_0.005_240)] px-1.5 py-0.5 font-mono text-[10px] text-[oklch(0.52_0.03_250)] sm:inline-block">
                    ESC
                  </kbd>
                  <button
                    aria-label="Cerrar la búsqueda"
                    className="grid size-8 place-items-center rounded-lg text-[oklch(0.52_0.03_250)] hover:bg-[oklch(0.975_0.005_240)] sm:hidden"
                    onClick={() => setOpen(false)}
                    type="button"
                  >
                    <X size={18} weight="bold" aria-hidden="true" />
                  </button>
                </div>
                <div
                  ref={listRef}
                  id={`${uid}-list`}
                  role="listbox"
                  aria-label="Comandos y resultados"
                  className="max-h-[60vh] overflow-y-auto overscroll-contain p-2 [-ms-overflow-style:none] [scrollbar-width:thin] [scrollbar-color:oklch(0.92_0.006_60)_transparent]"
                >
                  {rows.length === 0 ? (
                    <div className="p-8 text-center text-sm text-[oklch(0.48_0.03_250)] leading-relaxed">
                      {emptyMessage}
                    </div>
                  ) : (
                    grouped.map(([group, list]) => (
                      <div key={group} className="mb-1.5 last:mb-0">
                        <div
                          aria-hidden
                          className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[oklch(0.52_0.03_250)]"
                        >
                          {group}
                        </div>
                        {list.map((it) => {
                          const idx = rows.indexOf(it);
                          const isActive = idx === active;
                          return (
                            <button
                              key={it.id}
                              type="button"
                              id={`${uid}-opt-${idx}`}
                              role="option"
                              aria-selected={isActive}
                              data-index={idx}
                              onMouseEnter={() => moveTo(it.id)}
                              onClick={() => {
                                setOpen(false);
                                const action = it.run ?? it.onSelect;
                                action?.();
                              }}
                              style={
                                it.tone
                                  ? ({ "--course-tone": it.tone } as React.CSSProperties)
                                  : undefined
                              }
                              className={`relative isolate flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors outline-none cursor-pointer ${
                                isActive
                                  ? "text-[oklch(0.48_0.18_255)] font-semibold"
                                  : "text-[oklch(0.36_0.03_255)] hover:text-[oklch(0.2_0.03_260)]"
                              }`}
                            >
                              {isActive ? (
                                <motion.span
                                  layoutId={`${uid}-active`}
                                  className="absolute inset-0 z-0 rounded-lg bg-[rgba(0,85,184,0.08)] border border-[oklch(0.48_0.18_255/0.2)]"
                                  transition={reduce ? { duration: 0 } : ACTIVE_SPRING}
                                />
                              ) : null}
                              {it.icon ? (
                                <span
                                  className="relative z-10 grid size-5 shrink-0 place-items-center text-[var(--course-tone,currentColor)]"
                                  aria-hidden="true"
                                >
                                  {it.icon}
                                </span>
                              ) : hasIcons ? (
                                <span
                                  className="relative z-10 size-5 shrink-0"
                                  aria-hidden="true"
                                />
                              ) : null}
                              <span className="relative z-10 flex-1 truncate">{it.label}</span>
                              {it.badge ? (
                                <span className="relative z-10 shrink-0">{it.badge}</span>
                              ) : null}
                              {it.hint ? (
                                <kbd className="relative z-10 rounded border border-[oklch(0.92_0.006_60)] bg-[oklch(0.975_0.005_240)] px-1.5 py-0.5 font-mono text-[11px] text-[oklch(0.52_0.03_250)] font-normal">
                                  {it.hint}
                                </kbd>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </PresenceGate>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
