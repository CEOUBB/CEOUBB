"use client";

import type { FormEvent } from "react";
import { Check, CopySimple, Info } from "@phosphor-icons/react";
import type { Course } from "../../../lib/courses";
import type { LiveClassLink } from "../../../lib/live-class";
import { studentCount, type Note } from "./classroom-utils";
import { Bar } from "./ProgressBar";
import { LiveClassEditor } from "./LiveClassSection";

/*
  El riel reúne todo lo que describe a la sección sin ser una acción: la ficha
  del ramo, su código de referencia y la configuración del enlace de clase.
  Antes el código competía con «Nueva publicación» en el encabezado y el enlace
  de reunión encabezaba la Portada, dos tareas puntuales ocupando el lugar de
  las frecuentes.
*/
export function CourseRail({
  course,
  canTeach,
  readOnly,
  students,
  units,
  completed,
  courseReference,
  copiedCourseReference,
  copyCourseReference,
  liveClass,
  liveClassStatus,
  liveClassInvalid,
  saveLiveClass,
  clearLiveClass,
  status,
}: {
  course: Course;
  canTeach: boolean;
  readOnly: boolean;
  students: readonly unknown[];
  units: Course["units"];
  completed: number;
  courseReference: string;
  copiedCourseReference: boolean;
  copyCourseReference: () => void;
  liveClass: LiveClassLink | null;
  liveClassStatus: Note;
  liveClassInvalid: boolean;
  saveLiveClass: (event: FormEvent<HTMLFormElement>) => void;
  clearLiveClass: () => void;
  status: Note;
}) {
  return (
    <aside className="course-rail">
      <div className="section-title compact-title">
        <h2>
          <Info size={19} weight="fill" aria-hidden="true" />
          Información del ramo
        </h2>
      </div>
      <div className="course-facts">
        <dl>
          <div>
            <dt>Coordinación</dt>
            <dd>
              <b>{course.teacher}</b>
              <small>Cuenta docente institucional</small>
            </dd>
          </div>
          <div>
            <dt>{canTeach ? "Estudiantes" : "Tu avance"}</dt>
            <dd>
              <b>
                {canTeach
                  ? studentCount(students.length)
                  : units.length > 0
                    ? `${completed} de ${units.length} unidades`
                    : "Sin unidades cargadas"}
              </b>
              {!canTeach && units.length > 0 && (
                <span className="mini-progress">
                  <Bar ratio={units.length ? completed / units.length : 0} />
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt>Código de la sección</dt>
            <dd>
              <button
                aria-label={
                  copiedCourseReference ? "Código copiado" : `Copiar código ${courseReference}`
                }
                className="course-reference"
                onClick={copyCourseReference}
                type="button"
              >
                <span className="num">{courseReference}</span>
                {copiedCourseReference ? (
                  <>
                    <Check size={14} aria-hidden="true" />
                    Copiado
                  </>
                ) : (
                  <>
                    <CopySimple size={14} aria-hidden="true" />
                    Copiar
                  </>
                )}
              </button>
            </dd>
          </div>
        </dl>
      </div>
      {canTeach && !readOnly && (
        <LiveClassEditor
          liveClass={liveClass}
          status={liveClassStatus}
          invalid={liveClassInvalid}
          onSave={saveLiveClass}
          onClear={clearLiveClass}
        />
      )}
      {status.text && (
        <p className={`tool-status ${status.tone}`} role="status">
          {status.text}
        </p>
      )}
    </aside>
  );
}

export default CourseRail;
