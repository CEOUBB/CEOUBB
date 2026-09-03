"use client";

import { useEffect, useRef, useState } from "react";
import { TrashSimple, X } from "@phosphor-icons/react";
import { Course } from "../../../lib/courses";
import { deletePersonalEvent, savePersonalEvent } from "../../../lib/firebase-classroom-client";
import { validateBlock } from "../../../lib/planner";
import type { PersonalEventKind } from "../../../lib/planner";
import { KIND_LABEL } from "./calendar-constants";
import type { BlockDraft } from "./calendar-constants";

export function BlockDialog({
  draft,
  courses,
  onClose,
  onFail,
}: {
  draft: BlockDraft;
  courses: Course[];
  onClose: () => void;
  onFail: (message: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState(draft);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // `showModal()` sobre un diálogo ya modal lanza `InvalidStateError`, y en
    // desarrollo React monta cada efecto dos veces.
    if (dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
    titleRef.current?.focus();
  }, []);

  const set = <Key extends keyof BlockDraft>(key: Key, value: BlockDraft[Key]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const invalid = validateBlock(values);
    if (invalid) return setProblem(invalid);
    setBusy(true);
    try {
      await savePersonalEvent({ ...values, courseId: values.courseId || null });
      onClose();
    } catch (cause) {
      setProblem(cause instanceof Error ? cause.message : "No se pudo guardar el bloque.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!values.id || !window.confirm(`¿Eliminar “${values.title}”?`)) return;
    try {
      await deletePersonalEvent(values.id);
      onClose();
    } catch {
      onFail("No se pudo eliminar el bloque.");
    }
  };

  return (
    <dialog
      aria-labelledby="planner-dialog-title"
      className="planner-dialog"
      onCancel={onClose}
      onClose={onClose}
      ref={dialogRef}
    >
      <form onSubmit={submit}>
        <header>
          <h2 id="planner-dialog-title">{values.id ? "Editar bloque" : "Nuevo bloque"}</h2>
          <button aria-label="Cerrar" onClick={onClose} type="button">
            <X aria-hidden="true" size={16} weight="bold" />
          </button>
        </header>
        <label>
          Título
          <input
            maxLength={120}
            onChange={(event) => set("title", event.target.value)}
            placeholder="Estudiar EDO"
            ref={titleRef}
            required
            value={values.title}
          />
        </label>
        <div className="planner-dialog-row">
          <label>
            Ramo
            <select
              onChange={(event) => set("courseId", event.target.value)}
              value={values.courseId}
            >
              <option value="">Sin ramo</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tipo
            <select
              onChange={(event) => set("kind", event.target.value as PersonalEventKind)}
              value={values.kind}
            >
              {(Object.keys(KIND_LABEL) as PersonalEventKind[]).map((kind) => (
                <option key={kind} value={kind}>
                  {KIND_LABEL[kind]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="planner-dialog-row three">
          <label>
            Fecha
            <input
              onChange={(event) => set("date", event.target.value)}
              required
              type="date"
              value={values.date}
            />
          </label>
          <label>
            Desde
            <input
              onChange={(event) => set("startTime", event.target.value)}
              required
              step={900}
              type="time"
              value={values.startTime}
            />
          </label>
          <label>
            Hasta
            <input
              onChange={(event) => set("endTime", event.target.value)}
              required
              step={900}
              type="time"
              value={values.endTime}
            />
          </label>
        </div>
        <label>
          Detalle opcional
          <textarea
            maxLength={400}
            onChange={(event) => set("detail", event.target.value)}
            rows={2}
            value={values.detail}
          />
        </label>
        {problem && (
          <p className="planner-dialog-error" role="alert">
            {problem}
          </p>
        )}
        <footer>
          {values.id && (
            <button className="planner-dialog-delete" onClick={remove} type="button">
              <TrashSimple aria-hidden="true" size={15} /> Eliminar
            </button>
          )}
          <button className="planner-dialog-cancel" onClick={onClose} type="button">
            Cancelar
          </button>
          <button className="planner-dialog-save" disabled={busy} type="submit">
            {busy ? "Guardando…" : "Guardar bloque"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
