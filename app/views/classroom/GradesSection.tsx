"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { CheckCircle, Paperclip } from "@phosphor-icons/react";
import { Course } from "../../../lib/courses";
import {
  ClassroomState,
  ClassroomStudent,
  MAX_SUBMISSION_BYTES,
  StudentSubmission,
  saveGradebook,
  saveSimulation,
  saveStudentScores,
  uploadStudentSubmission,
  watchOwnSubmissions,
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
import { formatBytes, formatDay } from "../../../lib/portal-utils";
import { MobileSheet } from "../../mobile-shell";
import type { Note } from "./classroom-utils";

const EMPTY_SCORES: GradeScores = {};

export function GradesSection({
  course,
  classroom,
  canTeach,
  readOnly,
  note,
  status,
}: {
  course: Course;
  classroom: ClassroomState;
  canTeach: boolean;
  readOnly: boolean;
  note: (text: string, tone?: Note["tone"]) => void;
  status: Note;
}) {
  const { gradebook, exemption } = classroom;
  if (canTeach)
    return (
      <TeacherGrades
        course={course}
        classroom={classroom}
        note={note}
        readOnly={readOnly}
        status={status}
      />
    );
  return (
    <StudentGrades
      course={course}
      gradebook={gradebook}
      exemption={exemption}
      officialScores={classroom.officialScores}
      simulation={classroom.simulation}
      readOnly={readOnly}
      note={note}
      status={status}
    />
  );
}

function StudentGrades({
  course,
  gradebook,
  exemption,
  officialScores,
  simulation,
  readOnly,
  note,
  status,
}: {
  course: Course;
  gradebook: GradeItem[];
  exemption: number | null;
  officialScores: GradeScores;
  simulation: GradeScores;
  readOnly: boolean;
  note: (text: string, tone?: Note["tone"]) => void;
  status: Note;
}) {
  const [typed, setTyped] = useState<Record<string, string> | null>(null);
  const mobile = useIsMobileApp();
  const [detail, setDetail] = useState<GradeItem | null>(null);
  const submissions = useOwnSubmissions(course.id);
  const upload = useSubmissionUpload(course.id, note, !readOnly);
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
    if (readOnly) return;
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
      disabled={readOnly || isValidGrade(officialScores[item.id])}
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
              {/* Implements: REQ-DELIB-02 */}
              <span>
                {item.name}
                <small>
                  <span className="num">{item.weight}%</span> ·{" "}
                  <span className="num">
                    {isValidGrade(scores[item.id]) ? formatGrade(scores[item.id]) : "sin nota"}
                  </span>
                  {submissions.has(item.id) ? " · entregado" : ""}
                </small>
              </span>
            </button>
          ))}
        </div>
        <aside className="grades-summary">
          <div className="grades-average">
            <strong className="num">
              {summary.average === null ? "—" : formatGrade(summary.average)}
            </strong>
            <div>
              <h3>{summary.complete ? "Nota final" : "Promedio de lo evaluado"}</h3>
              <p>
                <span className="num">{summary.gradedWeight}%</span> de{" "}
                <span className="num">{summary.totalWeight}%</span> ya tiene nota
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
                <dd className="num">{detail.weight}%</dd>
              </div>
              <div>
                <dt>Nota oficial</dt>
                <dd className="num">
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
            {/* Implements: REQ-EVAL-01 */}
            <div className="sheet-field">
              Entrega
              <SubmissionSlot
                item={detail}
                onPick={upload.pick}
                percent={upload.state?.evalId === detail.id ? upload.state.percent : null}
                readOnly={readOnly}
                receipt={submissions.get(detail.id)}
              />
            </div>
          </MobileSheet>
        )}
        {upload.field}
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
          <span>Entrega</span>
        </div>
        {gradebook.map((item) => (
          <div className="grades-row" key={item.id}>
            <span>
              <b>{item.name}</b>
              {item.date && <small>{formatDay(item.date)}</small>}
            </span>
            <span className="grades-weight num">{item.weight}%</span>
            <span className="grades-official num">
              {isValidGrade(officialScores[item.id]) ? formatGrade(officialScores[item.id]) : "—"}
            </span>
            <span>{simulationField(item)}</span>
            {/* Implements: REQ-EVAL-01 */}
            <span className="grades-submission">
              <SubmissionSlot
                item={item}
                onPick={upload.pick}
                percent={upload.state?.evalId === item.id ? upload.state.percent : null}
                readOnly={readOnly}
                receipt={submissions.get(item.id)}
              />
            </span>
          </div>
        ))}
      </div>
      <aside className="grades-summary">
        <div className="grades-average">
          <strong className="num">
            {summary.average === null ? "—" : formatGrade(summary.average)}
          </strong>
          <div>
            <h3>{summary.complete ? "Nota final" : "Promedio de lo evaluado"}</h3>
            <p>
              <span className="num">{summary.gradedWeight}%</span> de{" "}
              <span className="num">{summary.totalWeight}%</span> ya tiene nota
            </p>
          </div>
        </div>
        <dl className="grades-targets">
          <TargetLine label={`Para aprobar con ${formatGrade(PASSING_GRADE)}`} target={passing} />
          <TargetLine label={`Para eximirte con ${formatGrade(exemptionTarget)}`} target={exempt} />
        </dl>
        <p className="grades-note">
          La simulación es tuya y privada. Las notas oficiales las carga el docente y no se pueden
          editar aquí. Cada entrega admite hasta {formatBytes(MAX_SUBMISSION_BYTES)} y sólo la ve el
          equipo docente del ramo.
        </p>
        {status.text && (
          <p className={`tool-status ${status.tone}`} role="status">
            {status.text}
          </p>
        )}
      </aside>
      {upload.field}
    </section>
  );
}

/*
  Buzón de entregas del estudiante. Vive dentro de la fila de la evaluación
  porque una entrega no es una pantalla aparte: es el estado de esa evaluación.
  La celda muestra sólo un estado a la vez —adjuntar, enviando o comprobante—
  para que la tabla siga leyéndose de un vistazo.
*/
// Implements: REQ-EVAL-01
function useOwnSubmissions(courseId: string) {
  /*
    El identificador del ramo viaja junto a los comprobantes: al cambiar de aula
    la lista anterior deja de coincidir y se descarta al derivar, sin reiniciar
    estado durante el render.
  */
  const [state, setState] = useState<{ courseId: string; items: StudentSubmission[] }>({
    courseId,
    items: [],
  });
  useEffect(
    () =>
      watchOwnSubmissions(
        courseId,
        (items) => setState({ courseId, items }),
        () => setState({ courseId, items: [] })
      ),
    [courseId]
  );
  return useMemo(() => {
    const rows = state.courseId === courseId ? state.items : [];
    return new Map(rows.map((item) => [item.evalId, item]));
  }, [courseId, state]);
}

// Implements: REQ-EVAL-01
function useSubmissionUpload(
  courseId: string,
  note: (text: string, tone?: Note["tone"]) => void,
  enabled: boolean
) {
  const input = useRef<HTMLInputElement | null>(null);
  const pending = useRef("");
  const [state, setState] = useState<{ evalId: string; percent: number } | null>(null);

  const pick = useCallback(
    (evalId: string) => {
      if (!enabled) return note("Este ramo está archivado y no recibe nuevas entregas.", "bad");
      pending.current = evalId;
      input.current?.click();
    },
    [enabled, note]
  );

  const send = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      const evalId = pending.current;
      event.target.value = "";
      pending.current = "";
      if (!file || !evalId) return;
      if (file.size <= 0 || file.size > MAX_SUBMISSION_BYTES) {
        note(`La entrega debe pesar entre 1 byte y ${formatBytes(MAX_SUBMISSION_BYTES)}.`, "bad");
        return;
      }
      setState({ evalId, percent: 0 });
      try {
        await uploadStudentSubmission(courseId, evalId, file, (percent) =>
          setState({ evalId, percent })
        );
        note("Entrega recibida. El comprobante queda en la evaluación.", "ok");
      } catch (cause) {
        note(cause instanceof Error ? cause.message : "No se pudo enviar la entrega.", "bad");
      } finally {
        setState(null);
      }
    },
    [courseId, note]
  );

  const field = (
    <input
      aria-hidden="true"
      className="sr-only"
      onChange={send}
      ref={input}
      tabIndex={-1}
      type="file"
    />
  );

  return { field, pick, state };
}

// Implements: REQ-EVAL-01
function SubmissionSlot({
  item,
  receipt,
  percent,
  onPick,
  readOnly,
}: {
  item: GradeItem;
  receipt: StudentSubmission | undefined;
  percent: number | null;
  onPick: (evalId: string) => void;
  readOnly: boolean;
}) {
  const shouldReduceMotion = useReducedMotion();

  if (percent !== null) {
    return (
      <span className="grades-upload">
        <span className="grades-upload-track">
          <span
            className="grades-upload-fill"
            style={{
              transform: `scaleX(${percent / 100})`,
              transition: shouldReduceMotion ? "none" : undefined,
            }}
          />
        </span>
        <small className="num" role="status">
          Enviando {percent}%
        </small>
      </span>
    );
  }

  if (receipt) {
    return (
      <span className="grades-receipt">
        <b title={receipt.fileName}>
          <CheckCircle aria-hidden="true" size={14} weight="fill" />
          {receipt.fileName}
        </b>
        <small className="num">
          {formatBytes(receipt.size)} · {formatDay(receipt.createdAt.slice(0, 10))}
        </small>
        {!readOnly && (
          <button
            aria-label={`Reemplazar la entrega de ${item.name}`}
            className="grades-attach"
            onClick={() => onPick(item.id)}
            type="button"
          >
            Reemplazar
          </button>
        )}
      </span>
    );
  }

  if (readOnly) return <span className="grades-closed">Sin nuevas entregas</span>;

  return (
    <button
      aria-label={`Adjuntar la entrega de ${item.name}`}
      className="grades-attach"
      onClick={() => onPick(item.id)}
      type="button"
    >
      <Paperclip aria-hidden="true" size={14} />
      Adjuntar
    </button>
  );
}

function TargetLine({
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

function TeacherGrades({
  course,
  classroom,
  note,
  readOnly,
  status,
}: {
  course: Course;
  classroom: ClassroomState;
  note: (text: string, tone?: Note["tone"]) => void;
  readOnly: boolean;
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
    if (readOnly) return note("Este ramo está archivado y no admite cambios.", "bad");
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

  const handleSetScore = useCallback(
    async (userId: string, itemId: string, value: string, currentScores: GradeScores) => {
      if (readOnly) return note("Este ramo está archivado y no admite cambios.", "bad");
      const score = typeof value === "string" && value.trim() !== "" ? Number(value) : Number.NaN;
      const next = { ...currentScores };
      if (isValidGrade(score)) next[itemId] = score;
      else delete next[itemId];
      try {
        await saveStudentScores(course.id, userId, next);
      } catch (cause) {
        note(cause instanceof Error ? cause.message : "No fue posible guardar la nota.", "bad");
      }
    },
    [course.id, note, readOnly]
  );

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
                disabled={readOnly}
                onChange={(event) => patch(item.id, { name: event.target.value })}
                value={item.name}
              />
            </label>
            <label>
              Pondera %
              <input
                disabled={readOnly}
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
                disabled={readOnly}
                onChange={(event) => patch(item.id, { date: event.target.value })}
                type="date"
                value={item.date}
              />
            </label>
            <button
              className="remove-row"
              disabled={readOnly}
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
              disabled={readOnly}
              max={MAX_GRADE}
              min={MIN_GRADE}
              onChange={(event) => setDraftExempt(event.target.value)}
              step="0.1"
              type="number"
              value={exempt}
            />
          </label>
          <span className={totalWeight === 100 ? "weight-total ok num" : "weight-total num"}>
            Suma {totalWeight}%
          </span>
          <button className="secondary-button" disabled={readOnly} onClick={addItem} type="button">
            Agregar evaluación
          </button>
          <button className="primary-button" disabled={readOnly} onClick={save} type="button">
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
          {students.map((student) => (
            <TeacherStudentRow
              gradebook={gradebook}
              key={student.userId}
              onSetScore={handleSetScore}
              scores={classScores[student.userId] ?? EMPTY_SCORES}
              student={student}
              readOnly={readOnly}
            />
          ))}
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

// Implements: REQ-PERF-08
const TeacherStudentRow = React.memo(function TeacherStudentRow({
  student,
  gradebook,
  scores,
  onSetScore,
  readOnly,
}: {
  student: ClassroomStudent;
  gradebook: GradeItem[];
  scores: GradeScores;
  onSetScore: (userId: string, itemId: string, value: string, currentScores: GradeScores) => void;
  readOnly: boolean;
}) {
  const summary = summarize(gradebook, scores);
  return (
    <div className="grades-matrix-row">
      <span>
        <b>{student.name}</b>
        <small>{student.email}</small>
      </span>
      {gradebook.map((item) => (
        <span key={item.id}>
          <input
            aria-label={`${item.name} de ${student.name}`}
            disabled={readOnly}
            defaultValue={isValidGrade(scores[item.id]) ? scores[item.id] : ""}
            key={`${item.id}-${scores[item.id] ?? ""}`}
            max={MAX_GRADE}
            min={MIN_GRADE}
            onBlur={(event) => onSetScore(student.userId, item.id, event.target.value, scores)}
            step="0.1"
            type="number"
          />
        </span>
      ))}
      <span className="grades-official num">
        {summary.average === null ? "—" : formatGrade(summary.average)}
      </span>
    </div>
  );
});
