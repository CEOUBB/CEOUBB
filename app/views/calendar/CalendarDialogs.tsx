"use client";

import { TrashSimple, X } from "@phosphor-icons/react";
import type { PlannerItem } from "../../../lib/planner";
import type { AnchorRect } from "./calendar-constants";
import { CalendarPopover } from "./CalendarPopover";

const SHORTCUTS: [string, string][] = [
  ["T", "Ir a hoy"],
  ["J", "Período siguiente"],
  ["K", "Período anterior"],
  ["D", "Vista de día"],
  ["S", "Vista de semana"],
  ["M", "Vista de mes"],
  ["A", "Agenda"],
  ["C", "Nuevo bloque"],
  ["?", "Mostrar estos atajos"],
];

export function ShortcutsPopover({ anchor, onClose }: { anchor: AnchorRect; onClose: () => void }) {
  return (
    <CalendarPopover
      anchor={anchor}
      className="planner-shortcuts"
      label="Atajos de teclado"
      onClose={onClose}
    >
      <h2>Atajos de teclado</h2>
      <dl>
        {SHORTCUTS.map(([key, action]) => (
          <div key={key}>
            <dt>
              <kbd>{key}</kbd>
            </dt>
            <dd>{action}</dd>
          </div>
        ))}
      </dl>
    </CalendarPopover>
  );
}

export function DeleteBlockDialog({
  item,
  onClose,
  onConfirm,
}: {
  item: PlannerItem;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <dialog
      aria-labelledby="delete-dialog-title"
      className="planner-dialog publication-confirm-dialog"
      onCancel={onClose}
      onClose={onClose}
      ref={(dialog) => {
        if (dialog && !dialog.open) dialog.showModal();
      }}
    >
      <form method="dialog" onSubmit={onConfirm}>
        <header>
          <h2 id="delete-dialog-title">¿Eliminar bloque?</h2>
          <button aria-label="Cerrar" onClick={onClose} type="button">
            <X aria-hidden="true" size={16} weight="bold" />
          </button>
        </header>
        <p className="confirmation-message">
          ¿Eliminar “<strong>{item.title}</strong>”? Esta acción no se puede deshacer.
        </p>
        <footer>
          <button className="planner-dialog-cancel" onClick={onClose} type="button">
            Cancelar
          </button>
          <button className="confirmation-danger" type="submit">
            <TrashSimple aria-hidden="true" size={15} /> Eliminar
          </button>
        </footer>
      </form>
    </dialog>
  );
}
