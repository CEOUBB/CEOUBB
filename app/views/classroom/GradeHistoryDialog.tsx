"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ClockCounterClockwise, LockKey, X } from "@phosphor-icons/react";
import { formatGrade } from "../../../lib/grades";
import {
  formatGradeHistoryDate,
  loadGradeHistoryPage,
  type GradeHistoryEntry,
  type GradeHistoryPage,
} from "../../../lib/grade-history";
import styles from "./grade-history.module.css";
import { GradeHistorySkeleton } from "../ViewSkeletons";

export type GradeHistorySelection = {
  studentId: string;
  studentName: string;
  studentEmail: string;
  gradeItemId: string;
  gradeItemName: string;
};

/* ─────────────────────────────────────────────────────────
 * DIFF TABLE (beautifului.dev)
 * Renderiza auditoría y rectificaciones de notas con diffs
 * visuales: valor anterior tachado en rojo, nuevo en esmeralda,
 * delta numérico con .num, autor y justificación.
 * ───────────────────────────────────────────────────────── */

export function DiffTable({
  items,
  className = "",
}: {
  items: GradeHistoryEntry[];
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-[oklch(0.9_0.012_250)] bg-white shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between border-b border-[oklch(0.9_0.012_250)] bg-[oklch(0.975_0.005_240)] px-4 py-2.5">
        <span className="text-xs font-semibold text-[oklch(0.2_0.03_260)]">
          Auditoría de rectificaciones ({items.length})
        </span>
        <span className="text-[11px] font-medium text-[oklch(0.48_0.03_250)]">
          Más recientes primero
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <colgroup>
            <col className="w-[28%]" />
            <col className="w-[18%]" />
            <col className="w-[18%]" />
            <col className="w-[14%]" />
            <col className="w-[22%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-[oklch(0.9_0.012_250)] bg-[oklch(0.975_0.005_240)]/60 text-xs font-semibold text-[oklch(0.48_0.03_250)]">
              <th className="px-3 py-2.5">Fecha y Acción</th>
              <th className="px-3 py-2.5 text-center">Nota Anterior</th>
              <th className="px-3 py-2.5 text-center">Nota Nueva</th>
              <th className="px-3 py-2.5 text-center">Delta</th>
              <th className="px-3 py-2.5">Autor</th>
            </tr>
          </thead>
          <tbody>
            {items.map((entry) => {
              const prevVal = entry.previousValue;
              const newVal = entry.newValue;
              const action =
                newVal === null
                  ? "Nota retirada"
                  : prevVal === null
                    ? "Nota registrada"
                    : "Nota rectificada";

              const hasPrevious = prevVal !== null;
              const hasNew = newVal !== null;

              let deltaNode: ReactNode = null;
              if (hasPrevious && hasNew) {
                const diff = Math.round(((newVal ?? 0) - (prevVal ?? 0)) * 10) / 10;
                if (diff > 0) {
                  deltaNode = (
                    <span className="inline-flex items-center rounded-full bg-[oklch(0.7_0.17_155_/_0.12)] px-2 py-0.5 text-xs font-semibold text-[oklch(0.7_0.17_155)] num">
                      +{diff.toFixed(1)}
                    </span>
                  );
                } else if (diff < 0) {
                  deltaNode = (
                    <span className="inline-flex items-center rounded-full bg-[oklch(0.55_0.22_25_/_0.12)] px-2 py-0.5 text-xs font-semibold text-[oklch(0.55_0.22_25)] num">
                      {diff.toFixed(1)}
                    </span>
                  );
                } else {
                  deltaNode = (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-[oklch(0.48_0.03_250)] num">
                      0.0
                    </span>
                  );
                }
              } else if (!hasPrevious && hasNew && newVal !== null) {
                deltaNode = (
                  <span className="inline-flex items-center rounded-full bg-[oklch(0.7_0.17_155_/_0.12)] px-2 py-0.5 text-xs font-semibold text-[oklch(0.7_0.17_155)] num">
                    +{formatGrade(newVal)}
                  </span>
                );
              } else if (hasPrevious && !hasNew && prevVal !== null) {
                deltaNode = (
                  <span className="inline-flex items-center rounded-full bg-[oklch(0.55_0.22_25_/_0.12)] px-2 py-0.5 text-xs font-semibold text-[oklch(0.55_0.22_25)] num">
                    -{formatGrade(prevVal)}
                  </span>
                );
              }

              return (
                <tr
                  key={entry.id}
                  className="border-b border-[oklch(0.9_0.012_250)] transition-colors duration-200 last:border-0 hover:bg-[oklch(0.975_0.005_240)]/40"
                >
                  <td className="px-3 py-2.5 align-top">
                    <div className="flex flex-col">
                      <strong className="text-xs font-semibold text-[oklch(0.2_0.03_260)]">
                        {action}
                      </strong>
                      <time
                        className="num text-[11px] text-[oklch(0.48_0.03_250)] mt-0.5"
                        dateTime={entry.changedAt}
                        title={entry.changedAt}
                      >
                        {formatGradeHistoryDate(entry.changedAt)}
                      </time>
                      <span className="text-[11px] text-[oklch(0.48_0.03_250)] italic mt-0.5">
                        {newVal === null
                          ? "Retiro de nota"
                          : prevVal === null
                            ? "Ingreso inicial"
                            : "Corrección oficial"}
                      </span>
                    </div>
                  </td>

                  <td
                    className="px-3 py-2.5 text-center align-middle"
                    style={{
                      background: hasPrevious ? "oklch(0.55 0.22 25 / 0.05)" : undefined,
                    }}
                  >
                    {prevVal !== null ? (
                      <span
                        className="num text-sm font-semibold transition-colors"
                        style={{
                          color: "oklch(0.55 0.22 25)",
                          textDecorationLine: "line-through",
                          textDecorationColor:
                            "color-mix(in srgb, oklch(0.55 0.22 25) 50%, transparent)",
                        }}
                      >
                        {formatGrade(prevVal)}
                      </span>
                    ) : (
                      <span className="text-xs text-[oklch(0.48_0.03_250)] italic">Sin nota</span>
                    )}
                  </td>

                  <td
                    className="px-3 py-2.5 text-center align-middle"
                    style={{
                      background: hasNew ? "oklch(0.7 0.17 155 / 0.06)" : undefined,
                    }}
                  >
                    {newVal !== null ? (
                      <span
                        className="num text-sm font-semibold transition-colors"
                        style={{ color: "oklch(0.7 0.17 155)" }}
                      >
                        {formatGrade(newVal)}
                      </span>
                    ) : (
                      <span className="num text-xs font-medium text-[oklch(0.55_0.22_25)] italic">
                        Sin nota
                      </span>
                    )}
                  </td>

                  <td className="px-3 py-2.5 text-center align-middle">{deltaNode}</td>

                  <td className="px-3 py-2.5 align-top">
                    <div className="flex flex-col min-w-0">
                      <span className="truncate text-xs font-semibold text-[oklch(0.2_0.03_260)]">
                        {entry.actorName || entry.actorEmail || entry.actorUid}
                      </span>
                      {entry.actorEmail && (
                        <span className="truncate text-[11px] text-[oklch(0.48_0.03_250)]">
                          {entry.actorEmail}
                        </span>
                      )}
                      {!entry.actorEmail && entry.actorName && (
                        <span className="truncate text-[10px] text-[oklch(0.48_0.03_250)] num">
                          ID: {entry.actorUid}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function GradeHistoryDialog({
  sectionId,
  selection,
  onClose,
}: {
  sectionId: string;
  selection: GradeHistorySelection;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [revision, setRevision] = useState(0);
  const cursor = cursors.at(-1) ?? null;

  useEffect(() => {
    if (dialog.current && !dialog.current.open) {
      trigger.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.current.showModal();
    }
  }, []);

  const close = () => {
    dialog.current?.close();
    onClose();
    trigger.current?.focus();
  };

  return (
    <dialog
      ref={dialog}
      className={`planner-dialog ${styles.dialog}`}
      aria-labelledby="grade-history-title"
      aria-describedby="grade-history-context"
      data-requirement="REQ-HISTORY-03 REQ-HISTORY-04"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClose={close}
    >
      <header className={styles.header}>
        <h2 id="grade-history-title">Historial de cambios</h2>
        <button type="button" aria-label="Cerrar historial" onClick={close}>
          <X aria-hidden="true" size={20} />
        </button>
      </header>
      <div className={styles.context} id="grade-history-context">
        <strong>{selection.gradeItemName}</strong>
        <span>{selection.studentName}</span>
        <small>{selection.studentEmail}</small>
      </div>
      <div className={styles.notice}>
        <LockKey aria-hidden="true" size={16} />
        <span>Registro de solo lectura · Hora de Chile (Santiago)</span>
      </div>
      <HistoryPage
        key={`${sectionId}:${selection.studentId}:${selection.gradeItemId}:${cursor}:${revision}`}
        sectionId={sectionId}
        selection={selection}
        cursor={cursor}
        pageNumber={cursors.length}
        onNext={(next) => setCursors((current) => [...current, next])}
        onPrevious={() => setCursors((current) => current.slice(0, -1))}
        onRefresh={() => {
          setCursors([null]);
          setRevision((value) => value + 1);
        }}
      />
    </dialog>
  );
}

function HistoryPage({
  sectionId,
  selection,
  cursor,
  pageNumber,
  onNext,
  onPrevious,
  onRefresh,
}: {
  sectionId: string;
  selection: GradeHistorySelection;
  cursor: string | null;
  pageNumber: number;
  onNext: (cursor: string) => void;
  onPrevious: () => void;
  onRefresh: () => void;
}) {
  const [page, setPage] = useState<GradeHistoryPage | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const { studentId, gradeItemId } = selection;

  useEffect(() => {
    const controller = new AbortController();
    loadGradeHistoryPage(sectionId, studentId, gradeItemId, cursor, controller.signal).then(
      (result) => {
        if (!controller.signal.aborted) setPage(result);
      },
      (cause) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : "No se pudo cargar el historial.");
      }
    );
    return () => controller.abort();
  }, [sectionId, studentId, gradeItemId, cursor, attempt]);

  return (
    <>
      <div className={styles.body} aria-busy={!page && !error}>
        {!page && !error && <GradeHistorySkeleton />}
        {error && (
          <div className={styles.state}>
            <p role="alert">{error}</p>
            <button
              className="utility-button"
              type="button"
              onClick={() => {
                setPage(null);
                setError("");
                setAttempt((value) => value + 1);
              }}
            >
              Reintentar
            </button>
          </div>
        )}
        {(page?.items?.length ?? 0) === 0 && page !== null && (
          <div className={styles.state} role="status">
            <ClockCounterClockwise aria-hidden="true" size={32} />
            <strong>No hay cambios registrados</strong>
            <p>
              Los cambios guardados desde la activación del historial aparecerán aquí. Las
              modificaciones anteriores pueden no estar disponibles.
            </p>
          </div>
        )}
        {page && (page.items?.length ?? 0) > 0 && <DiffTable items={page.items} />}
      </div>
      <nav className={styles.footer} aria-label="Paginación del historial">
        <button
          className="utility-button"
          type="button"
          disabled={pageNumber <= 1}
          onClick={onPrevious}
        >
          Más recientes
        </button>
        <span className="num">Página {pageNumber}</span>
        <button
          className="utility-button"
          type="button"
          disabled={!page?.nextCursor}
          onClick={() => page?.nextCursor && onNext(page.nextCursor)}
        >
          Más antiguos
        </button>
        <button className={`utility-button ${styles.refresh}`} type="button" onClick={onRefresh}>
          Actualizar historial
        </button>
      </nav>
    </>
  );
}
