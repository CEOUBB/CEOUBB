"use client";

import * as m from "motion/react-m";
import { Course } from "../../../lib/courses";
import { ClassroomStudent } from "../../../lib/firebase-classroom-client";
import { ease, formatDate } from "../../../lib/portal-utils";
import { Bar } from "./ProgressBar";

export function ProgressSection({
  units,
  canTeach,
  completed,
  students,
  updateProgress,
}: {
  units: Course["units"];
  canTeach: boolean;
  completed: number;
  students: ClassroomStudent[];
  updateProgress: (next: number) => void;
}) {
  const total = units.length;
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
          <strong>
            {completed}/{total}
          </strong>
          <div>
            <h3>Resultados de aprendizaje completados</h3>
            <p>Tu avance se guarda en tu cuenta y aparece en todos tus dispositivos.</p>
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
          {students.map((student) => (
            <div className="progress-table-row" key={student.userId}>
              <span>
                <b>{student.name}</b>
                <small>{student.email}</small>
              </span>
              <span>
                <b>
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
                    transition={{ duration: 0.6, ease }}
                  />
                </i>
              </span>
              <span>{student.updatedAt ? formatDate(student.updatedAt) : "Sin actividad"}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
