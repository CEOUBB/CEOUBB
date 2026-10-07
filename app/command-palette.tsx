"use client";

// Implements: REQ-CMD-01, REQ-CMD-02, REQ-CMD-03
import { Command } from "cmdk";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTouchCapable } from "@/lib/hooks/use-touch-capable";
import { ClientPortal } from "./Portal";

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

  const [query, setQuery] = useState("");
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) {
      setQuery("");
    }
  }

  const setOpen = useCallback(
    (v: boolean) => {
      if (!controlled) setInternalOpen(v);
      onOpenChange?.(v);
      if (!v) {
        setQuery("");
        onClose?.();
      }
    },
    [controlled, onClose, onOpenChange]
  );

  const canTouch = useTouchCapable();

  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  const setOpenRef = useRef(setOpen);
  useEffect(() => {
    setOpenRef.current = setOpen;
  }, [setOpen]);

  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const listEl = listRef.current;
    if (!listEl) return;
    const updateRole = () => {
      const emptyEl = listEl.querySelector("[cmdk-empty]");
      const isEmpty = Boolean(emptyEl && !emptyEl.hasAttribute("hidden"));
      const currentRole = listEl.getAttribute("role");
      if (isEmpty) {
        if (currentRole === "listbox") {
          listEl.removeAttribute("role");
        }
      } else {
        if (currentRole !== "listbox") {
          listEl.setAttribute("role", "listbox");
        }
      }
    };
    updateRole();
    const observer = new MutationObserver(updateRole);
    observer.observe(listEl, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["hidden", "role"],
    });
    return () => observer.disconnect();
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === shortcut.toLowerCase()) {
        e.preventDefault();
        if (e.repeat) return;
        setOpenRef.current(!openRef.current);
        return;
      }
      if (e.key === "Escape" && openRef.current) {
        e.preventDefault();
        setOpenRef.current(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcut]);

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

  const hasIcons = useMemo(() => items.some((it) => it.icon), [items]);

  const grouped = useMemo(() => {
    const map = new Map<string, PaletteItem[]>();
    items.forEach((it) => {
      const g = it.group ?? "General";
      const groupItems = map.get(g) ?? [];
      groupItems.push(it);
      map.set(g, groupItems);
    });
    return Array.from(map.entries());
  }, [items]);

  if (!open) return null;

  return (
    <ClientPortal>
      <button
        type="button"
        aria-label="Cerrar búsqueda"
        onClick={() => setOpen(false)}
        className="pointer-events-auto fixed inset-0 z-[100] bg-[oklch(0.2_0.02_265/0.32)] md:[backdrop-filter:blur(12px)_saturate(140%)] md:[-webkit-backdrop-filter:blur(12px)_saturate(140%)]"
      />
      <div className="pointer-events-none fixed inset-x-4 bottom-4 top-[12vh] z-[100] flex items-start justify-center">
        <div
          role="none"
          className="pointer-events-auto w-full max-w-xl overflow-hidden rounded-2xl border border-(--border-hairline) bg-white shadow-2xl text-(--text-body)"
        >
          <Command label="Buscar en Centro de Estudio UBB" className="flex flex-col w-full">
            <div className="flex items-center gap-3 border-b border-(--border-hairline) px-4">
              <MagnifyingGlass
                size={18}
                aria-hidden="true"
                className="shrink-0 text-(--text-muted)"
              />
              <Command.Input
                ref={inputRef}
                value={query}
                onValueChange={setQuery}
                placeholder={placeholder}
                className={`h-13 flex-1 border-0 bg-transparent text-sm text-(--text-body) placeholder:text-(--text-faint) caret-(--color-primary) !outline-none !ring-0 focus:border-0 focus:!outline-none focus:!ring-0 focus-visible:!outline-none focus-visible:!ring-0 shadow-none ${
                  canTouch ? "text-base" : "text-sm"
                }`}
                style={{ outline: "none", boxShadow: "none" }}
              />
              <kbd className="hidden rounded border border-(--border-hairline) bg-(--canvas-soft) px-1.5 py-0.5 font-mono text-[10px] text-(--text-faint) sm:inline-block">
                ESC
              </kbd>
              <button
                aria-label="Cerrar la búsqueda"
                className="grid size-8 place-items-center rounded-lg text-(--text-faint) hover:bg-(--canvas-soft) sm:hidden"
                onClick={() => setOpen(false)}
                type="button"
              >
                <X size={18} weight="bold" aria-hidden="true" />
              </button>
            </div>

            <Command.List
              ref={listRef}
              className="max-h-[60vh] overflow-y-auto overscroll-contain p-2 [-ms-overflow-style:none] [scrollbar-width:thin] [scrollbar-color:var(--border-control)_transparent]"
            >
              <Command.Empty className="p-8 text-center text-sm text-(--text-muted) leading-relaxed">
                {emptyMessage}
              </Command.Empty>

              {grouped.map(([group, list]) => (
                <Command.Group
                  key={group}
                  heading={group}
                  className="mb-1.5 last:mb-0 [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-(--text-faint)"
                >
                  {list.map((it) => (
                    <Command.Item
                      key={it.id}
                      value={`${it.label} ${it.group ?? ""} ${(it.keywords ?? []).join(" ")}`}
                      onSelect={() => {
                        setOpen(false);
                        const action = it.run ?? it.onSelect;
                        action?.();
                      }}
                      style={
                        it.tone ? ({ "--course-tone": it.tone } as React.CSSProperties) : undefined
                      }
                      className="relative isolate flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors outline-none cursor-pointer data-[selected='true']:bg-(--color-primary-wash) data-[selected='true']:text-(--color-primary) data-[selected='true']:font-semibold text-(--text-secondary) hover:text-(--text-body)"
                    >
                      {it.icon ? (
                        <span
                          className="relative z-10 grid size-5 shrink-0 place-items-center text-[var(--course-tone,currentColor)]"
                          aria-hidden="true"
                        >
                          {it.icon}
                        </span>
                      ) : hasIcons ? (
                        <span className="relative z-10 size-5 shrink-0" aria-hidden="true" />
                      ) : null}
                      <span className="relative z-10 flex-1 truncate">{it.label}</span>
                      {it.badge ? <span className="relative z-10 shrink-0">{it.badge}</span> : null}
                      {it.hint ? (
                        <kbd className="relative z-10 rounded border border-(--border-hairline) bg-(--canvas-soft) px-1.5 py-0.5 font-mono text-[11px] text-(--text-faint) font-normal">
                          {it.hint}
                        </kbd>
                      ) : null}
                    </Command.Item>
                  ))}
                </Command.Group>
              ))}
            </Command.List>
          </Command>
        </div>
      </div>
    </ClientPortal>
  );
}
