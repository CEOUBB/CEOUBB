"use client";

import { useEffect, useState } from "react";
import type { GradeItem } from "../../../lib/grades";
import {
  loadParticipantDirectoryPage,
  type ParticipantDirectoryPage,
} from "../../../lib/participants";
import { GradeHistoryDialog, type GradeHistorySelection } from "./GradeHistoryDialog";
import styles from "./grade-history.module.css";

export function GradeHistoryLookup({
  sectionId,
  gradebook,
}: {
  sectionId: string;
  gradebook: GradeItem[];
}) {
  const [query, setQuery] = useState("");
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [itemId, setItemId] = useState(gradebook[0]?.id ?? "");
  const [selection, setSelection] = useState<GradeHistorySelection | null>(null);
  const item = gradebook.find((entry) => entry.id === itemId) ?? gradebook[0];
  const cursor = cursors.at(-1) ?? null;
  return (
    <section className={styles.lookup} data-requirement="REQ-HISTORY-01 REQ-HISTORY-04">
      <h2>Historial de notas</h2>
      <p>Consulta los cambios de una evaluación. Tu acceso como ayudante es de solo lectura.</p>
      {gradebook.length === 0 ? (
        <p role="status">El ramo aún no tiene evaluaciones definidas.</p>
      ) : (
        <>
          <div className={styles.filters}>
            <label>
              Evaluación
              <select value={item?.id ?? ""} onChange={(event) => setItemId(event.target.value)}>
                {gradebook.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Buscar estudiante
              <input
                type="search"
                maxLength={80}
                value={query}
                placeholder="Nombre o correo"
                onChange={(event) => {
                  setQuery(event.target.value);
                  setCursors([null]);
                }}
              />
            </label>
          </div>
          <StudentPage
            key={`${sectionId}:${query}:${cursor}`}
            sectionId={sectionId}
            query={query}
            cursor={cursor}
            onSelect={(studentId, studentName, studentEmail) =>
              item &&
              setSelection({
                studentId,
                studentName,
                studentEmail,
                gradeItemId: item.id,
                gradeItemName: item.name,
              })
            }
            onNext={(next) => setCursors((current) => [...current, next])}
          />
          {cursors.length > 1 && (
            <button
              className="utility-button"
              type="button"
              onClick={() => setCursors((current) => current.slice(0, -1))}
            >
              Estudiantes anteriores
            </button>
          )}
        </>
      )}
      {selection && (
        <GradeHistoryDialog
          key={`${sectionId}:${selection.studentId}:${selection.gradeItemId}`}
          sectionId={sectionId}
          selection={selection}
          onClose={() => setSelection(null)}
        />
      )}
    </section>
  );
}

function StudentPage({
  sectionId,
  query,
  cursor,
  onSelect,
  onNext,
}: {
  sectionId: string;
  query: string;
  cursor: string | null;
  onSelect: (id: string, name: string, email: string) => void;
  onNext: (cursor: string) => void;
}) {
  const [page, setPage] = useState<ParticipantDirectoryPage | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      loadParticipantDirectoryPage(sectionId, query, "student", cursor, controller.signal).then(
        (result) => {
          if (!controller.signal.aborted) setPage(result);
        },
        () => {
          if (!controller.signal.aborted) setError("No se pudo cargar la lista de estudiantes.");
        }
      );
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [sectionId, query, cursor, attempt]);
  if (error)
    return (
      <div role="alert">
        {error}{" "}
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
    );
  if (!page) return <p role="status">Buscando estudiantes…</p>;
  return (
    <>
      {page.items.length === 0 && <p role="status">No se encontraron estudiantes.</p>}
      <ul className={styles.students}>
        {page.items.map((student) => (
          <li key={student.id}>
            <span>
              <strong>{student.name}</strong>
              <small>{student.email}</small>
            </span>
            <button
              type="button"
              className="utility-button"
              aria-label={`Ver historial de ${student.name}`}
              onClick={() => onSelect(student.id, student.name, student.email)}
            >
              Ver historial
            </button>
          </li>
        ))}
      </ul>
      {page.nextCursor && (
        <button
          className="utility-button"
          type="button"
          onClick={() => page.nextCursor && onNext(page.nextCursor)}
        >
          Más estudiantes
        </button>
      )}
    </>
  );
}
