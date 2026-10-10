"use client";

import { useState } from "react";
import type { Course } from "../../../lib/courses";
import { savePersonalEvent } from "../../../lib/firebase-classroom-client";
import { PERSONAL_TONE, durationLabel, timeOfMinutes, validateBlock } from "../../../lib/planner";
import { KIND_LABEL, PERSONAL_KINDS, longDate } from "./calendar-constants";
import type { AnchorRect, BlockDraft } from "./calendar-constants";
import { CalendarPopover } from "./CalendarPopover";
import { ToneMark } from "./CalendarParts";
import type { PendingRange } from "./PlannerGrid";

// Implements: REQ-CEO72-06 — título, horario, tipo y ramo junto a la selección; el resto vive en Más opciones.
export function QuickCreate({
  range,
  anchor,
  courses,
  onClose,
  onMore,
}: {
  range: PendingRange;
  anchor: AnchorRect;
  courses: Course[];
  onClose: () => void;
  onMore: (draft: BlockDraft) => void;
}) {
  const [values, setValues] = useState<BlockDraft>({
    title: "",
    detail: "",
    date: range.day,
    startTime: timeOfMinutes(range.start),
    endTime: timeOfMinutes(range.end),
    courseId: "",
    kind: "study",
  });
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const course = courses.find((entry) => entry.id === values.courseId);

  const set = <Key extends keyof BlockDraft>(key: Key, value: BlockDraft[Key]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const invalid = validateBlock(values);
    if (invalid) return setProblem(invalid);
    setBusy(true);
    try {
      await savePersonalEvent({ ...values, courseId: values.courseId || null });
      onClose();
    } catch (cause) {
      setProblem(cause instanceof Error ? cause.message : "No se pudo guardar el bloque.");
      setBusy(false);
    }
  };

  return (
    <CalendarPopover
      anchor={anchor}
      className="planner-quick"
      label="Nuevo bloque"
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <label className="planner-quick-title">
          <span className="sr-only">Título</span>
          <input
            data-autofocus
            maxLength={120}
            onChange={(event) => set("title", event.target.value)}
            placeholder="Añade un título"
            value={values.title}
          />
        </label>
        <p className="planner-quick-date">{longDate(values.date)}</p>
        <div className="planner-quick-times">
          <label>
            <span className="sr-only">Desde</span>
            <input
              onChange={(event) => set("startTime", event.target.value)}
              step={900}
              type="time"
              value={values.startTime}
            />
          </label>
          <span aria-hidden="true">–</span>
          <label>
            <span className="sr-only">Hasta</span>
            <input
              onChange={(event) => set("endTime", event.target.value)}
              step={900}
              type="time"
              value={values.endTime}
            />
          </label>
          <span className="planner-quick-duration num">
            {durationLabel(values.startTime, values.endTime)}
          </span>
        </div>
        <fieldset className="planner-kinds">
          <legend className="sr-only">Tipo</legend>
          {PERSONAL_KINDS.map((kind) => (
            <label key={kind}>
              <input
                checked={values.kind === kind}
                name="planner-quick-kind"
                onChange={() => set("kind", kind)}
                type="radio"
                value={kind}
              />
              {KIND_LABEL[kind]}
            </label>
          ))}
        </fieldset>
        {courses.length > 0 && (
          <label className="planner-quick-course">
            <ToneMark tone={course?.tone ?? PERSONAL_TONE} />
            <span className="sr-only">Ramo</span>
            <select
              onChange={(event) => set("courseId", event.target.value)}
              value={values.courseId}
            >
              <option value="">Sin ramo</option>
              {courses.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {problem && (
          <p className="planner-dialog-error" role="alert">
            {problem}
          </p>
        )}
        <footer>
          <button className="planner-quick-more" onClick={() => onMore(values)} type="button">
            Más opciones
          </button>
          <button
            aria-label="Guardar bloque"
            className="primary-button"
            disabled={busy}
            type="submit"
          >
            {busy ? "Guardando…" : "Guardar"}
          </button>
        </footer>
      </form>
    </CalendarPopover>
  );
}
