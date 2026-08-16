"use client";

import { useState } from "react";
import { Course } from "../../../lib/courses";
import {
  ClassroomState,
  saveGradebook,
  saveSimulation,
  saveStudentScores,
} from "../../../lib/firebase-classroom-client";
import {
  DEFAULT_EXEMPTION_GRADE,
  GradeItem,
  GradeScores,
  MAX_GRADE,
  MIN_GRADE,
  PASSING_GRADE,
  formatGrade,
  isValidGrade,
  requiredGrade,
  summarize,
} from "../../../lib/grades";
import { hapticTap, useIsMobileApp } from "../../../lib/mobile-bridge";
import { formatDay } from "../../../lib/portal-utils";
import { MobileSheet } from "../../mobile-shell";
import type { Note } from "./classroom-utils";

export function GradesSection({
  course,
  classroom,
  canTeach,
  note,
  status,
}: {
  course: Course;
  classroom: ClassroomState;
  canTeach: boolean;
  note: (text: string, tone?: Note["tone"]) => void;
  status: Note;
}) {
  const { gradebook, exemption } = classroom;
  if (canTeach)
    return <TeacherGrades course={course} classroom={classroom} note={note} status={status} />;
  return (
    <StudentGrades
      course={course}
      gradebook={gradebook}
      exemption={exemption}
      officialScores={classroom.officialScores}
      simulation={classroom.simulation}
      note={note}
      status={status}
    />
  );
}

export function StudentGrades({
  course,
  gradebook,
  exemption,
  officialScores,
  simulation,
  note,
  status,
}: {
  course: Course;
  gradebook: GradeItem[];
  exemption: number | null;
  officialScores: GradeScores;
  simulation: GradeScores;
  note: (text: string, tone?: Note["tone"]) => void;
  status: Note;
}) {
  const [typed, setTyped] = useState<Record<string, string> | null>(null);
  const mobile = useIsMobileApp();
  const [detail, setDetail] = useState<GradeItem | null>(null);
  const draft =
    typed ??
    Object.fromEntries(Object.entries(simulation).map(([id, score]) => [id, String(score)]));
  const setDraft = (update: (current: Record<string, string>) => Record<string, string>) =>
    setTyped(update(draft));

  const scores: GradeScores = {};
  for (const item of gradebook) {
    const rawSim = draft[item.id];
    const simulated =
      typeof rawSim === "string" && rawSim.trim() !== "" ? Number(rawSim) : Number.NaN;
    if (isValidGrade(officialScores[item.id])) scores[item.id] = officialScores[item.id];
    else if (isValidGrade(simulated)) scores[item.id] = simulated;
  }

  const summary = summarize(gradebook, scores);
  const passing = requiredGrade(gradebook, scores, PASSING_GRADE);
  const exemptionTarget = exemption ?? DEFAULT_EXEMPTION_GRADE;
  const exempt = requiredGrade(gradebook, scores, exemptionTarget);

  const persist = async () => {
    const next: GradeScores = {};
    for (const [id, value] of Object.entries(draft)) {
      const score = typeof value === "string" && value.trim() !== "" ? Number(value) : Number.NaN;
      if (isValidGrade(score)) next[id] = score;
    }
    await saveSimulation(course.id, next).catch((cause) =>
      note(cause instanceof Error ? cause.message : "No se pudo guardar la simulación.", "bad")
    );
  };

  if (gradebook.length === 0) {
    return (
      <div className="empty-state">
        <strong>El docente aún no publica la ponderación del ramo.</strong>
        <p>
          Cuando cargue las evaluaciones y sus porcentajes podrás ver tu promedio y simular la nota
          que necesitas.
        </p>
      </div>
    );
  }

  const simulationField = (item: GradeItem) => (
    <input
      aria-label={`Nota simulada de ${item.name}`}
      disabled={isValidGrade(officialScores[item.id])}
      max={MAX_GRADE}
      min={MIN_GRADE}
      onBlur={persist}
      onChange={(event) => setDraft((current) => ({ ...current, [item.id]: event.target.value }))}
      step="0.1"
      type="number"
      value={draft[item.id] ?? ""}
    />
  );

  /*
    Cuatro columnas no entran en un teléfono sin encoger la nota a un tamaño
    ilegible: en móvil la tabla se convierte en una lista y el desglose de cada
    evaluación —ponderación, nota oficial y simulación— sube en una hoja.
  */
  // Implements: REQ-CAP-05
  if (mobile) {
    return (
      <section className="grades-view">
        <div className="sheet-list">
          {gradebook.map((item) => (
            <button
              className="sheet-row"
              key={item.id}
              onClick={() => {
                hapticTap();
                setDetail(item);
              }}
              type="button"
            >
              <span>
                {item.name}
                <small>
                  {item.weight}% ·{" "}
                  {isValidGrade(scores[item.id]) ? formatGrade(scores[item.id]) : "sin nota"}
                </small>
              </span>
            </button>
          ))}
        </div>
        <aside className="grades-summary">
          <div className="grades-average">
            <strong>{summary.average === null ? "—" : formatGrade(summary.average)}</strong>
            <div>
              <h3>{summary.complete ? "Nota final" : "Promedio de lo evaluado"}</h3>
              <p>
                {summary.gradedWeight}% de {summary.totalWeight}% ya tiene nota
              </p>
            </div>
          </div>
          <dl className="grades-targets">
            <TargetLine label={`Para aprobar con ${formatGrade(PASSING_GRADE)}`} target={passing} />
            <TargetLine
              label={`Para eximirte con ${formatGrade(exemptionTarget)}`}
              target={exempt}
            />
          </dl>
          <p className="grades-note">
            La simulación es tuya y privada. Las notas oficiales las carga el docente y no se pueden
            editar aquí.
          </p>
          {status.text && (
            <p className={`tool-status ${status.tone}`} role="status">
              {status.text}
            </p>
          )}
        </aside>
        {detail && (
          <MobileSheet
            onOpenChange={(open) => !open && setDetail(null)}
            open
            title={detail.name}
            description={detail.date ? formatDay(detail.date) : undefined}
          >
            <dl className="sheet-facts">
              <div>
                <dt>Ponderación</dt>
                <dd>{detail.weight}%</dd>
              </div>
              <div>
                <dt>Nota oficial</dt>
                <dd>
                  {isValidGrade(officialScores[detail.id])
                    ? formatGrade(officialScores[detail.id])
                    : "—"}
                </dd>
              </div>
            </dl>
            <label className="sheet-field">
              {isValidGrade(officialScores[detail.id])
                ? "Simulación (bloqueada: ya hay nota oficial)"
                : "Simulación"}
              {simulationField(detail)}
            </label>
          </MobileSheet>
        )}
      </section>
    );
  }

  return (
    <section className="grades-view">
      <div className="grades-table">
        <div className="grades-head">
          <span>Evaluación</span>
          <span>Pondera</span>
          <span>Nota oficial</span>
          <span>Simulación</span>
        </div>
        {gradebook.map((item) => (
          <div className="grades-row" key={item.id}>
            <span>
              <b>{item.name}</b>
              {item.date && <small>{formatDay(item.date)}</small>}
            </span>
            <span className="grades-weight">{item.weight}%</span>
            <span className="grades-official">
              {isValidGrade(officialScores[item.id]) ? formatGrade(officialScores[item.id]) : "—"}
            </span>
            <span>{simulationField(item)}</span>
          </div>
        ))}
      </div>
      <aside className="grades-summary">
        <div className="grades-average">
          <strong>{summary.average === null ? "—" : formatGrade(summary.average)}</strong>
          <div>
            <h3>{summary.complete ? "Nota final" : "Promedio de lo evaluado"}</h3>
            <p>
              {summary.gradedWeight}% de {summary.totalWeight}% ya tiene nota
            </p>
          </div>
        </div>
        <dl className="grades-targets">
          <TargetLine label={`Para aprobar con ${formatGrade(PASSING_GRADE)}`} target={passing} />
          <TargetLine label={`Para eximirte con ${formatGrade(exemptionTarget)}`} target={exempt} />
        </dl>
        <p className="grades-note">
          La simulación es tuya y privada. Las notas oficiales las carga el docente y no se pueden
          editar aquí.
        </p>
        {status.text && (
          <p className={`tool-status ${status.tone}`} role="status">
            {status.text}
          </p>
        )}
      </aside>
    </section>
  );
}

export function TargetLine({
  label,
  target,
}: {
  label: string;
  target: ReturnType<typeof requiredGrade>;
}) {
  const copy =
    target.state === "closed"
      ? "Ya no quedan evaluaciones pendientes."
      : target.state === "secured"
        ? "Asegurado con las notas actuales."
        : target.state === "impossible"
          ? `Ya no es alcanzable: necesitarías ${formatGrade(target.grade)}.`
          : `Necesitas ${formatGrade(target.grade)} en promedio en lo que queda.`;
  return (
    <div className={`grades-target ${target.state}`}>
      <dt>{label}</dt>
      <dd>{copy}</dd>
    </div>
  );
}

export function TeacherGrades({
  course,
  classroom,
  note,
  status,
}: {
  course: Course;
  classroom: ClassroomState;
  note: (text: string, tone?: Note["tone"]) => void;
  status: Note;
}) {
  const { gradebook, exemption, students, classScores } = classroom;
  const [draftItems, setDraftItems] = useState<GradeItem[] | null>(null);
  const [draftExempt, setDraftExempt] = useState<string | null>(null);
  const items = draftItems ?? gradebook;
  const exempt = draftExempt ?? String(exemption ?? DEFAULT_EXEMPTION_GRADE);
  const setItems = (update: (current: GradeItem[]) => GradeItem[]) => setDraftItems(update(items));

  const totalWeight = items.reduce(
    (total, item) =>
      total + (typeof item.weight === "number" && !Number.isNaN(item.weight) ? item.weight : 0),
    0
  );

  const patch = (id: string, values: Partial<GradeItem>) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...values } : item)));

  const addItem = () => {
    const id = crypto.randomUUID();
    setItems((current) => [...current, { id, name: "", weight: 0, date: "" }]);
  };

  const save = async () => {
    const target = typeof exempt === "string" && exempt.trim() !== "" ? Number(exempt) : Number.NaN;
    note("Guardando ponderación…");
    try {
      await saveGradebook(
        course.id,
        items.filter(
          (item) =>
            item.name.trim() &&
            typeof item.weight === "number" &&
            !Number.isNaN(item.weight) &&
            item.weight > 0
        ),
        isValidGrade(target) ? target : null
      );
      setDraftItems(null);
      setDraftExempt(null);
      note("Ponderación guardada. Los estudiantes ya la ven.", "ok");
    } catch (cause) {
      note(
        cause instanceof Error ? cause.message : "No fue posible guardar la ponderación.",
        "bad"
      );
    }
  };

  const setScore = async (userId: string, itemId: string, value: string) => {
    const score = typeof value === "string" && value.trim() !== "" ? Number(value) : Number.NaN;
    const next = { ...(classScores[userId] ?? {}) };
    if (isValidGrade(score)) next[itemId] = score;
    else delete next[itemId];
    try {
      await saveStudentScores(course.id, userId, next);
    } catch (cause) {
      note(cause instanceof Error ? cause.message : "No fue posible guardar la nota.", "bad");
    }
  };

  return (
    <section className="grades-teacher">
      <div className="section-title compact-title">
        <h2>Ponderación del ramo</h2>
      </div>
      <div className="grades-editor">
        {items.length === 0 && <p className="empty-row">Agrega la primera evaluación del ramo.</p>}
        {items.map((item) => (
          <div className="grades-editor-row" key={item.id}>
            <label>
              Evaluación
              <input
                onChange={(event) => patch(item.id, { name: event.target.value })}
                value={item.name}
              />
            </label>
            <label>
              Pondera %
              <input
                max={100}
                min={0}
                onChange={(event) => {
                  const raw = event.target.value.trim();
                  const parsed = raw === "" ? 0 : Number(raw);
                  patch(item.id, {
                    weight: Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 0,
                  });
                }}
                type="number"
                value={item.weight}
              />
            </label>
            <label>
              Fecha
              <input
                onChange={(event) => patch(item.id, { date: event.target.value })}
                type="date"
                value={item.date}
              />
            </label>
            <button
              className="remove-row"
              onClick={() => setItems((current) => current.filter((row) => row.id !== item.id))}
              type="button"
            >
              Quitar
            </button>
          </div>
        ))}
        <div className="grades-editor-foot">
          <label>
            Nota de eximición
            <input
              max={MAX_GRADE}
              min={MIN_GRADE}
              onChange={(event) => setDraftExempt(event.target.value)}
              step="0.1"
              type="number"
              value={exempt}
            />
          </label>
          <span className={totalWeight === 100 ? "weight-total ok" : "weight-total"}>
            Suma {totalWeight}%
          </span>
          <button className="secondary-button" onClick={addItem} type="button">
            Agregar evaluación
          </button>
          <button className="primary-button" onClick={save} type="button">
            Guardar ponderación
          </button>
        </div>
      </div>
      <div className="section-title compact-title">
        <h2>Notas oficiales</h2>
      </div>
      {gradebook.length === 0 && (
        <div className="empty-state">
          <strong>Guarda primero la ponderación.</strong>
          <p>Las columnas de notas aparecen cuando el ramo tiene evaluaciones definidas.</p>
        </div>
      )}
      {gradebook.length > 0 && (
        <div className="grades-matrix">
          <div className="grades-matrix-head">
            <span>Estudiante</span>
            {gradebook.map((item) => (
              <span key={item.id}>{item.name}</span>
            ))}
            <span>Promedio</span>
          </div>
          {students.length === 0 && (
            <p className="empty-row">
              Los estudiantes aparecerán cuando entren al aula con su cuenta institucional.
            </p>
          )}
          {students.map((student) => {
            const scores = classScores[student.userId] ?? {};
            const summary = summarize(gradebook, scores);
            return (
              <div className="grades-matrix-row" key={student.userId}>
                <span>
                  <b>{student.name}</b>
                  <small>{student.email}</small>
                </span>
                {gradebook.map((item) => (
                  <span key={item.id}>
                    <input
                      aria-label={`${item.name} de ${student.name}`}
                      defaultValue={isValidGrade(scores[item.id]) ? scores[item.id] : ""}
                      key={`${item.id}-${scores[item.id] ?? ""}`}
                      max={MAX_GRADE}
                      min={MIN_GRADE}
                      onBlur={(event) => setScore(student.userId, item.id, event.target.value)}
                      step="0.1"
                      type="number"
                    />
                  </span>
                ))}
                <span className="grades-official">
                  {summary.average === null ? "—" : formatGrade(summary.average)}
                </span>
              </div>
            );
          })}
        </div>
      )}
      {status.text && (
        <p className={`tool-status ${status.tone}`} role="status">
          {status.text}
        </p>
      )}
    </section>
  );
}
