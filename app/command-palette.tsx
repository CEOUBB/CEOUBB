"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { MagnifyingGlass, X } from "@phosphor-icons/react";

export type PaletteItem = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  tone?: string;
  icon: ReactNode;
  run: () => void;
};

/** Búsqueda global del portal: filtra vistas y ramos, se abre con Ctrl/⌘ + K. */
export function CommandPalette({
  open,
  items,
  onClose,
}: {
  open: boolean;
  items: PaletteItem[];
  onClose: () => void;
}) {
  if (!open) return null;
  return <CommandPaletteDialog items={items} onClose={onClose} />;
}

function CommandPaletteDialog({ items, onClose }: { items: PaletteItem[]; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) =>
      `${item.label} ${item.hint ?? ""} ${item.group}`.toLowerCase().includes(needle)
    );
  }, [items, query]);

  // El cursor se recorta al leerlo: si el filtro achica la lista, Enter nunca
  // dispara un resultado que ya no está en pantalla.
  const active = Math.min(cursor, Math.max(matches.length - 1, 0));

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    /* `showModal()` sobre un diálogo ya modal lanza `InvalidStateError`, y en
       desarrollo React monta cada efecto dos veces. */
    if (!dialog.open) dialog.showModal();
    inputRef.current?.focus();
    /* Sin limpieza a propósito. `dialog.close()` aquí emitía un evento `close`
       —diferido, no síncrono— que llegaba a `onClose` después de que el efecto
       se hubiera vuelto a montar: el padre ponía `open` en false y la paleta se
       cerraba en el mismo frame en que se abría. Quitar el nodo del DOM ya lo
       saca de la capa superior; el navegador no necesita ayuda. */
  }, []);

  // Clic en el velo: el evento apunta al propio <dialog>, no a su contenido.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onPointerDown = (event: MouseEvent) => {
      if (event.target === dialog) onClose();
    };
    dialog.addEventListener("pointerdown", onPointerDown);
    return () => dialog.removeEventListener("pointerdown", onPointerDown);
  }, [onClose]);

  useEffect(() => {
    dialogRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active, matches.length]);

  const move = (step: number) => {
    if (matches.length === 0) return;
    setCursor((active + step + matches.length) % matches.length);
  };

  const choose = (item: PaletteItem | undefined) => {
    if (!item) return;
    onClose();
    item.run();
  };

  let lastGroup = "";

  return (
    <dialog
      aria-label="Buscar en Centro de Estudio UBB"
      className="palette"
      onClose={onClose}
      ref={dialogRef}
    >
      <div className="palette-field">
        <MagnifyingGlass size={18} aria-hidden="true" />
        <input
          aria-label="Buscar ramos y vistas"
          onChange={(event) => {
            setQuery(event.target.value);
            setCursor(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              move(1);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              move(-1);
            } else if (event.key === "Enter") {
              event.preventDefault();
              choose(matches[active]);
            }
          }}
          placeholder="Buscar ramos, vistas y recursos…"
          ref={inputRef}
          type="text"
          value={query}
        />
        <kbd>Esc</kbd>
        {/* En el teléfono no hay tecla Escape y el botón atrás lo intercepta el
            contenedor nativo: la búsqueda necesita una salida a la vista. */}
        <button
          aria-label="Cerrar la búsqueda"
          className="palette-close"
          onClick={onClose}
          type="button"
        >
          <X size={18} weight="bold" aria-hidden="true" />
        </button>
      </div>
      <div className="palette-list">
        {matches.length === 0 ? (
          <p className="palette-empty">
            Sin resultados para <strong>{query.trim()}</strong>. Prueba con el nombre o el código
            del ramo.
          </p>
        ) : (
          matches.map((item, index) => {
            const heading = item.group === lastGroup ? null : (lastGroup = item.group);
            return (
              <div key={item.id}>
                {heading && <p className="palette-group">{heading}</p>}
                <button
                  className="palette-item"
                  data-active={index === active}
                  onClick={() => choose(item)}
                  onPointerMove={() => setCursor(index)}
                  style={
                    item.tone ? ({ "--course-tone": item.tone } as React.CSSProperties) : undefined
                  }
                  type="button"
                >
                  <span className="palette-icon">{item.icon}</span>
                  <span className="palette-label">{item.label}</span>
                  {item.hint && <small>{item.hint}</small>}
                </button>
              </div>
            );
          })
        )}
      </div>
    </dialog>
  );
}
