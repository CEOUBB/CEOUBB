"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, ClockCounterClockwise, LockKey, X } from "@phosphor-icons/react";
import { formatGrade } from "../../../lib/grades";
import {
  formatGradeHistoryDate,
  loadGradeHistoryPage,
  type GradeHistoryPage,
} from "../../../lib/grade-history";
import styles from "./grade-history.module.css";

export type GradeHistorySelection = {
  studentId: string;
  studentName: string;
  studentEmail: string;
  gradeItemId: string;
  gradeItemName: string;
};

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
        {!page && !error && (
          <p className={styles.state} role="status">
            Cargando historial…
          </p>
        )}
        {error && (
          <div className={styles.state}>
            <p role="alert">{error}</p>
            <button
              className="utility-button"
              type="button"
              onClick={() => {
                setError("");
                setAttempt((value) => value + 1);
              }}
            >
              Reintentar
            </button>
          </div>
        )}
        {page?.items.length === 0 && (
          <div className={styles.state} role="status">
            <ClockCounterClockwise aria-hidden="true" size={32} />
            <strong>No hay cambios registrados</strong>
            <p>
              Los cambios guardados desde la activación del historial aparecerán aquí. Las
              modificaciones anteriores pueden no estar disponibles.
            </p>
          </div>
        )}
        {page && page.items.length > 0 && (
          <>
            <p className={styles.order}>Más recientes primero</p>
            <ol className={styles.timeline} aria-label="Cambios de la nota">
              {page.items.map((entry) => (
                <li key={entry.id}>
                  <div className={styles.eventHeading}>
                    <strong>
                      {entry.newValue === null
                        ? "Nota retirada"
                        : entry.previousValue === null
                          ? "Nota registrada"
                          : "Nota corregida"}
                    </strong>
                    <time className="num" dateTime={entry.changedAt} title={entry.changedAt}>
                      {formatGradeHistoryDate(entry.changedAt)}
                    </time>
                  </div>
                  <div className={styles.values}>
                    <dl>
                      <dt>Nota anterior</dt>
                      <dd className="num">
                        {entry.previousValue === null
                          ? "Sin nota"
                          : formatGrade(entry.previousValue)}
                      </dd>
                    </dl>
                    <ArrowRight aria-hidden="true" size={20} />
                    <dl>
                      <dt>Nota final</dt>
                      <dd className="num">
                        {entry.newValue === null ? "Sin nota" : formatGrade(entry.newValue)}
                      </dd>
                    </dl>
                  </div>
                  <p className={styles.actor}>
                    {entry.actorName || entry.actorEmail || entry.actorUid}
                    {entry.actorName && entry.actorEmail && <span>{entry.actorEmail}</span>}
                    {!entry.actorEmail && entry.actorName && <span>ID: {entry.actorUid}</span>}
                  </p>
                </li>
              ))}
            </ol>
          </>
        )}
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
