"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";
import { Drawer } from "vaul";
import { hapticTap } from "../lib/mobile-bridge";

/*
  Capa móvil del portal. En pantalla estrecha el riel lateral de 268px no cabe y la
  cabecera de escritorio se queda con los dedos lejos: la navegación baja a la zona
  del pulgar y los detalles pasan a hojas arrastrables. Nada de esto se monta en
  escritorio — `useIsMobileApp()` decide y estos componentes ni siquiera se renderizan.
*/

export type MobileTab = {
  key: string;
  label: string;
  Icon: Icon;
  active: boolean;
  /** Enlace real cuando la pestaña sale del portal (la biblioteca es HTML estático). */
  href?: string;
  onSelect?: () => void;
};

/**
 * Barra inferior fija. El `padding-bottom` sale de `env(safe-area-inset-bottom)`
 * en CSS: sobre la barra de gestos de Android el rótulo quedaría cortado.
 */
// Implements: REQ-CAP-04, REQ-CAP-07
export function MobileBottomNav({ items }: { items: MobileTab[] }) {
  return (
    <nav aria-label="Navegación principal" className="mobile-nav">
      {items.map(({ key, label, Icon, active, href, onSelect }) => {
        const content = (
          <>
            <span aria-hidden="true" className="mobile-nav-icon"><Icon size={22} weight={active ? "fill" : "regular"} /></span>
            <span className="mobile-nav-label">{label}</span>
          </>
        );
        // Implements: REQ-CAP-06 — un golpe seco al cambiar de pestaña; en web es un no-op.
        const tap = () => {
          hapticTap();
          onSelect?.();
        };
        return href ? (
          <Link className="mobile-nav-item" href={href} key={key} onClick={tap}>{content}</Link>
        ) : (
          <button
            aria-current={active ? "page" : undefined}
            className="mobile-nav-item"
            data-active={active}
            key={key}
            onClick={tap}
            type="button"
          >
            {content}
          </button>
        );
      })}
    </nav>
  );
}

/**
 * Hoja inferior arrastrable. `vaul` aporta la física del arrastre, el bloqueo de
 * scroll y el `aria-modal`; reimplementarlo sería más código y peor accesibilidad.
 */
// Implements: REQ-CAP-05
export function MobileSheet({ open, onOpenChange, title, description, children }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="sheet-overlay" />
        <Drawer.Content className="sheet-content">
          <Drawer.Handle className="sheet-handle" />
          <div className="sheet-head">
            <Drawer.Title className="sheet-title">{title}</Drawer.Title>
            <Drawer.Description className={description ? "sheet-description" : "sr-only"}>
              {description ?? "Arrastra hacia abajo para cerrar."}
            </Drawer.Description>
          </div>
          <div className="sheet-body">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
