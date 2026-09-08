"use client";

import { useState } from "react";
import { Plus, Trash } from "@phosphor-icons/react";
import { gradeSchemeError } from "../../../lib/course-management";
import { saveGradebook, type ClassroomStudent } from "../../../lib/firebase-classroom-client";
import {
  DEFAULT_EXEMPTION_GRADE,
  MAX_GRADE,
  MIN_GRADE,
  SUBMISSION_MODES,
  SUBMISSION_MODE_LABELS,
  submissionModeOf,
  type GradeItem,
  type SubmissionMode,
} from "../../../lib/grades";
import { EvaluationTeamsEditor } from "./EvaluationTeamsEditor";

export function GradebookSettingsEditor({
  courseId,
  gradebook,
  exemption,
  students,
}: {
  courseId: string;
  gradebook: GradeItem[];
  exemption: number | null;
  /*
    Nómina con la que se arman los equipos fijos. La ficha de gestión docente
    edita el esquema fuera del aula y no la tiene cargada: allí la modalidad se
    puede elegir y los equipos se completan dentro del ramo, donde el docente ve
    a quién está agrupando.
  */
  students?: readonly ClassroomStudent[];
}) {
  const [draftItems, setDraftItems] = useState<GradeItem[] | null>(null);
  const [draftExemption, setDraftExemption] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ text: string; tone: "" | "ok" | "bad" }>({
    text: "",
    tone: "",
  });
  const items = draftItems ?? gradebook;
  const exemptionValue = draftExemption ?? String(exemption ?? DEFAULT_EXEMPTION_GRADE);
  const totalWeight = items.reduce(
    (total, item) => total + (Number.isFinite(item.weight) ? item.weight : 0),
    0
  );

  const setItems = (update: (current: GradeItem[]) => GradeItem[]) => {
    setDraftItems(update(items));
    setStatus({ text: "", tone: "" });
  };

  const patchItem = (id: string, values: Partial<GradeItem>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...values } : item)));
  };

  const addItem = () => {
    setItems((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: "",
        weight: 0,
        date: "",
        submissionMode: "individual",
        teams: [],
      },
    ]);
  };

  const save = async () => {
    if (saving) return;
    const target = exemptionValue.trim() ? Number(exemptionValue) : null;
    const validation = gradeSchemeError(items, target);
    if (validation) {
      setStatus({ text: validation, tone: "bad" });
      return;
    }
    setSaving(true);
    setStatus({ text: "Guardando esquema de evaluaciones…", tone: "" });
    try {
      await saveGradebook(courseId, items, target);
      setDraftItems(null);
      setDraftExemption(null);
      setStatus({ text: "Esquema guardado. Los estudiantes ya pueden verlo.", tone: "ok" });
    } catch (cause) {
      setStatus({
        text: cause instanceof Error ? cause.message : "No fue posible guardar el esquema.",
        tone: "bad",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grades-editor">
      {items.length === 0 && <p className="empty-row">Agrega la primera evaluación del ramo.</p>}
      {items.map((item) => {
        const mode = submissionModeOf(item);
        return (
          <div className="grades-editor-row" key={item.id}>
            <label>
              Evaluación
              <input
                maxLength={120}
                onChange={(event) => patchItem(item.id, { name: event.target.value })}
                value={item.name}
              />
            </label>
            <label>
              Pondera %
              <input
                max={100}
                min={0}
                onChange={(event) => {
                  const parsed = event.target.valueAsNumber;
                  patchItem(item.id, { weight: Number.isFinite(parsed) ? parsed : 0 });
                }}
                type="number"
                value={item.weight}
              />
            </label>
            <label>
              Fecha
              <input
                onChange={(event) => patchItem(item.id, { date: event.target.value })}
                type="date"
                value={item.date}
              />
            </label>
            {/* Implements: REQ-TEAM-01 */}
            <label>
              Entrega
              <select
                onChange={(event) => {
                  const next = event.target.value as SubmissionMode;
                  patchItem(item.id, {
                    submissionMode: next,
                    /* Cambiar de modalidad no debe dejar una nómina de equipos
                       viva pero invisible, lista para revivir sin aviso. */
                    teams: next === "team_fixed" ? (item.teams ?? []) : [],
                  });
                }}
                value={mode}
              >
                {SUBMISSION_MODES.map((value) => (
                  <option key={value} value={value}>
                    {SUBMISSION_MODE_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
            <button
              aria-label={`Quitar ${item.name || "evaluación"}`}
              className="remove-row"
              onClick={() => setItems((current) => current.filter((row) => row.id !== item.id))}
              type="button"
            >
              <Trash aria-hidden="true" size={15} />
              Quitar
            </button>
            {mode === "team_fixed" && (
              <EvaluationTeamsEditor
                itemName={item.name}
                onChange={(teams) => patchItem(item.id, { teams })}
                students={students ?? []}
                teams={item.teams ?? []}
              />
            )}
          </div>
        );
      })}
      <div className="grades-editor-foot">
        <label>
          Nota de eximición
          <input
            max={MAX_GRADE}
            min={MIN_GRADE}
            onChange={(event) => {
              setDraftExemption(event.target.value);
              setStatus({ text: "", tone: "" });
            }}
            step="0.1"
            type="number"
            value={exemptionValue}
          />
        </label>
        <span className={totalWeight === 100 ? "weight-total ok num" : "weight-total num"}>
          Suma {totalWeight}%
        </span>
        <button className="secondary-button" onClick={addItem} type="button">
          <Plus aria-hidden="true" size={16} />
          Agregar evaluación
        </button>
        <button className="primary-button" disabled={saving} onClick={save} type="button">
          {saving ? "Guardando…" : "Guardar esquema"}
        </button>
      </div>
      <p aria-live="polite" className={`tool-status ${status.tone}`}>
        {status.text}
      </p>
    </div>
  );
}
