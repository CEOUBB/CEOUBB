"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "@phosphor-icons/react";
import { MobileSheet } from "../../mobile-shell";
import { useCompactViewport } from "../calendar/calendar-constants";

// Implements: REQ-PAGE-03, REQ-CAP-05
export function PageDialog({
  title,
  description,
  wide = false,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  wide?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const compact = useCompactViewport();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
  }, [compact]);

  if (compact) {
    return (
      <MobileSheet
        description={description}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        open
        title={title}
      >
        {children}
      </MobileSheet>
    );
  }

  return (
    <dialog
      aria-labelledby={titleId}
      className={wide ? "planner-dialog page-dialog is-wide" : "planner-dialog page-dialog"}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      ref={dialogRef}
    >
      <div className="page-dialog-inner">
        <header>
          <h2 id={titleId}>{title}</h2>
          <button aria-label="Cerrar" onClick={onClose} type="button">
            <X aria-hidden="true" size={16} weight="bold" />
          </button>
        </header>
        {description && <p className="page-dialog-lead">{description}</p>}
        <div className="page-dialog-body">{children}</div>
      </div>
    </dialog>
  );
}
