"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { CaretLeft, CaretRight, MagnifyingGlass, X } from "@phosphor-icons/react";
import type { Course } from "../../../lib/courses.ts";
import type { ClassroomStudent } from "../../../lib/firebase-classroom-client.ts";
import { ease, formatDate, instantTransition } from "../../../lib/portal-utils";
import { Bar } from "./ProgressBar";
import { filterRoster, paginateList } from "./classroom-utils";

// Implements: REQ-DELIB-02, REQ-DELIB-06, REQ-PAG-04
export function ProgressSection({
  units,
  canTeach,
  completed,
  students,
  updateProgress,
  readOnly,
}: {
  units: Course["units"];
  canTeach: boolean;
  completed: number;
  students: ClassroomStudent[];
  updateProgress: (next: number) => void;
  readOnly: boolean;
}) {
  const shouldReduceMotion = useReducedMotion();
  const total = units.length;

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredStudents = useMemo(
    () => filterRoster(students, deferredQuery),
    [students, deferredQuery]
  );

  const paginated = useMemo(
    () => paginateList(filteredStudents, currentPage, pageSize),
    [filteredStudents, currentPage, pageSize]
  );

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  return (
    <section className="progress-view">
      {!canTeach && total === 0 && (
        <div className="empty-state">
          <strong>Este ramo aún no tiene resultados de aprendizaje cargados.</strong>
          <p>Tu avance por unidad aparecerá cuando el curso publique su programa.</p>
        </div>
      )}
      {!canTeach && total > 0 && (
        <div className="personal-progress">
          <strong className="num">
            {completed}/{total}
          </strong>
          <div>
            <h3>Resultados de aprendizaje completados</h3>
            <p>
              {readOnly
                ? "Este es el avance conservado al cierre del período."
                : "Tu avance se guarda en tu cuenta y aparece en todos tus dispositivos."}
            </p>
            <div className="big-progress">
              <Bar ratio={total > 0 ? completed / total : 0} />
            </div>
          </div>
        </div>
      )}
      {!canTeach && total > 0 && (
        <div className="unit-grid">
          {units.map((unit, index) => (
            <article key={unit.title}>
              <div>
                <h3>{unit.title}</h3>
                <p>{unit.subtitle}</p>
              </div>
              <label className="unit-check">
                <input
                  checked={index < completed}
                  disabled={readOnly}
                  onChange={(event) =>
                    updateProgress(
                      event.target.checked
                        ? Math.max(completed, index + 1)
                        : Math.min(completed, index)
                    )
                  }
                  type="checkbox"
                />
                Completado
              </label>
            </article>
          ))}
        </div>
      )}
      {canTeach && (
        <>
          {students.length > 0 && (
            <search className="classroom-list-toolbar">
              <div className="classroom-search-box">
                <MagnifyingGlass aria-hidden="true" size={16} />
                <input
                  aria-label="Buscar estudiante por nombre o correo"
                  id="teacher-progress-search"
                  onChange={(event) => handleQueryChange(event.target.value)}
                  placeholder="Buscar por nombre o correo…"
                  type="search"
                  value={query}
                />
                {query && (
                  <button
                    aria-label="Limpiar búsqueda"
                    className="search-clear-btn"
                    onClick={() => handleQueryChange("")}
                    type="button"
                  >
                    <X aria-hidden="true" size={14} />
                  </button>
                )}
              </div>
              <div className="classroom-page-size">
                <label htmlFor="teacher-progress-page-size">Mostrar:</label>
                <select
                  id="teacher-progress-page-size"
                  onChange={(event) => handlePageSizeChange(Number(event.target.value))}
                  value={pageSize}
                >
                  <option value={25}>25 por página</option>
                  <option value={50}>50 por página</option>
                  <option value={100}>100 por página</option>
                </select>
              </div>
            </search>
          )}

          <div className="progress-table">
            <div className="progress-table-head">
              <span>Estudiante</span>
              <span>Avance</span>
              <span>Última actividad</span>
            </div>
            {students.length === 0 && (
              <p className="empty-row">
                Los estudiantes aparecerán cuando creen su cuenta institucional.
              </p>
            )}
            {students.length > 0 && filteredStudents.length === 0 && (
              <p className="empty-row" role="status">
                No se encontraron estudiantes que coincidan con “{deferredQuery}”.
              </p>
            )}
            {paginated.items.map((student) => (
              <div className="progress-table-row" key={student.userId}>
                <span>
                  <b>{student.name}</b>
                  <small>{student.email}</small>
                </span>
                <span>
                  <b className="num">
                    {student.completed}/{student.total}
                  </b>
                  <i>
                    <m.em
                      animate={{
                        transform: `scaleX(${
                          student.total &&
                          typeof student.completed === "number" &&
                          !Number.isNaN(student.completed)
                            ? Math.min(1, Math.max(0, student.completed / student.total))
                            : 0
                        })`,
                      }}
                      initial={{ transform: "scaleX(0)" }}
                      style={{ transformOrigin: "left" }}
                      transition={shouldReduceMotion ? instantTransition : { duration: 0.25, ease }}
                    />
                  </i>
                </span>
                <span>{student.updatedAt ? formatDate(student.updatedAt) : "Sin actividad"}</span>
              </div>
            ))}
          </div>
          {filteredStudents.length > 0 && (
            <nav aria-label="Paginación de avance de estudiantes" className="classroom-pagination">
              <span className="pagination-summary num">
                Mostrando {paginated.startIndex}–{paginated.endIndex} de {paginated.totalItems}{" "}
                estudiantes
                {deferredQuery ? ` (${students.length} en total)` : ""}
              </span>
              {paginated.totalPages > 1 && (
                <div className="pagination-actions">
                  <button
                    aria-label="Página anterior"
                    className="pagination-btn"
                    disabled={paginated.page <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    type="button"
                  >
                    <CaretLeft aria-hidden="true" size={16} />
                    Anterior
                  </button>
                  <span className="pagination-indicator num">
                    Página {paginated.page} de {paginated.totalPages}
                  </span>
                  <button
                    aria-label="Página siguiente"
                    className="pagination-btn"
                    disabled={paginated.page >= paginated.totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(paginated.totalPages, p + 1))}
                    type="button"
                  >
                    Siguiente
                    <CaretRight aria-hidden="true" size={16} />
                  </button>
                </div>
              )}
            </nav>
          )}
        </>
      )}
    </section>
  );
}
