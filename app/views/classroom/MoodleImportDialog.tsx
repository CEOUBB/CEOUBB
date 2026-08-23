"use client";

import { ChangeEvent, useId, useRef, useState } from "react";
import { DownloadSimple, FileArrowUp, X } from "@phosphor-icons/react";
import type { Course } from "../../../lib/courses";
import {
  executeMoodleImport,
  type MoodleImportProgress,
} from "../../../lib/firebase/moodle-import";
import { prepareCourseImport } from "../../../lib/moodle/parser";
import type { MoodleImportReport, PreparedCourseImport } from "../../../lib/moodle/types";

function downloadReport(report: MoodleImportReport) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(report, null, 2)], { type: "application/json" })
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `importacion-moodle-${report.source.fingerprint.slice(0, 12)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

// Implements: REQ-MOODLE-11
export function MoodleImportDialog({ course }: { course: Course }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputId = useId();
  const [prepared, setPrepared] = useState<PreparedCourseImport | null>(null);
  const [includeParticipants, setIncludeParticipants] = useState(true);
  const [progress, setProgress] = useState<MoodleImportProgress | null>(null);
  const [report, setReport] = useState<MoodleImportReport | null>(null);
  const [error, setError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const running = Boolean(progress && progress.phase !== "complete");

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setPrepared(null);
    setReport(null);
    setError("");
    if (!file) return;
    setAnalyzing(true);
    try {
      setPrepared(await prepareCourseImport(file));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No fue posible leer el respaldo.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function startImport() {
    if (!prepared || running) return;
    setError("");
    setReport(null);
    try {
      setReport(await executeMoodleImport(course.id, prepared, includeParticipants, setProgress));
    } catch (reason) {
      setProgress(null);
      setError(reason instanceof Error ? reason.message : "La importación no pudo continuar.");
    }
  }

  function close() {
    if (running) return;
    dialogRef.current?.close();
  }

  const preview = prepared?.preview;
  const totalSteps = Math.max(1, progress?.total ?? 1);
  const currentStep = Math.min(totalSteps, progress?.current ?? 0);

  return (
    <>
      <button
        className="secondary-button moodle-import-trigger"
        onClick={() => dialogRef.current?.showModal()}
        type="button"
      >
        <FileArrowUp size={18} />
        Importar Moodle
      </button>
      <dialog
        aria-labelledby={`${inputId}-title`}
        className="moodle-import-dialog"
        onCancel={(event) => {
          if (running) event.preventDefault();
        }}
        ref={dialogRef}
      >
        <div className="moodle-import-dialog__header">
          <div>
            <span className="eyebrow">Migración de curso</span>
            <h2 id={`${inputId}-title`}>Importar desde Moodle UBB</h2>
            <p>Revisa el respaldo antes de restaurarlo en {course.name}.</p>
          </div>
          <button aria-label="Cerrar" disabled={running} onClick={close} type="button">
            <X size={20} />
          </button>
        </div>

        <div className="moodle-import-dialog__body">
          {!report && (
            <label className="moodle-import-file" htmlFor={inputId}>
              <FileArrowUp size={26} />
              <span>
                <strong>Seleccionar respaldo .mbz o nómina .csv</strong>
                <small>Se analiza en este dispositivo antes de publicar cualquier contenido.</small>
              </span>
              <input
                accept=".mbz,.csv,application/gzip,application/zip,text/csv"
                disabled={running}
                id={inputId}
                onChange={selectFile}
                type="file"
              />
            </label>
          )}

          {analyzing && <p aria-live="polite">Analizando estructura y compatibilidad…</p>}

          {preview && !report && (
            <div className="moodle-import-preview">
              <div className="moodle-import-source">
                <span>Origen detectado</span>
                <strong>{preview.source.courseName || preview.source.fileName}</strong>
                <small>
                  {preview.source.courseShortName || "Nómina de participantes"}
                  {preview.source.moodleVersion ? ` · Moodle ${preview.source.moodleVersion}` : ""}
                </small>
              </div>
              <dl>
                <div>
                  <dt>Publicaciones</dt>
                  <dd>{preview.posts.length}</dd>
                </div>
                <div>
                  <dt>Archivos</dt>
                  <dd>{preview.files.length}</dd>
                </div>
                <div>
                  <dt>Estudiantes</dt>
                  <dd>{preview.participants.length}</dd>
                </div>
                <div>
                  <dt>Revisión manual</dt>
                  <dd>{preview.omissions.length}</dd>
                </div>
              </dl>
              {preview.omissions.length > 0 && (
                <details>
                  <summary>Ver contenido que no se importará</summary>
                  <ul>
                    {preview.omissions.slice(0, 50).map((item) => (
                      <li key={`${item.category}-${item.title}-${item.reason}`}>
                        <strong>{item.title}</strong> — {item.reason}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {preview.participants.length > 0 && (
                <div className="moodle-import-participants">
                  <input
                    aria-labelledby={`${inputId}-participants-label`}
                    checked={includeParticipants}
                    disabled={running}
                    id={`${inputId}-participants`}
                    onChange={(event) => setIncludeParticipants(event.target.checked)}
                    type="checkbox"
                  />
                  <span>
                    <strong id={`${inputId}-participants-label`}>Importar participantes</strong>
                    <small>
                      Sólo estudiantes UBB. Las cuentas aún inexistentes esperan hasta 90 días.
                    </small>
                  </span>
                </div>
              )}
            </div>
          )}

          {progress && (
            <div className="moodle-import-progress" aria-live="polite">
              <div>
                <strong>{progress.message}</strong>
                <span>{Math.round((currentStep / totalSteps) * 100)}%</span>
              </div>
              <progress max={totalSteps} value={currentStep} />
            </div>
          )}

          {report && (
            <div className="moodle-import-result" aria-live="polite">
              <strong>
                {report.status === "completed"
                  ? "Importación completada"
                  : "Importación completada con observaciones"}
              </strong>
              <p>
                {report.contentImported} contenidos y {report.filesImported} archivos restaurados.
                {includeParticipants &&
                  ` ${report.participantsMatched} estudiantes vinculados y ${report.participantsPending} pendientes.`}
              </p>
              <button
                className="secondary-button"
                onClick={() => downloadReport(report)}
                type="button"
              >
                <DownloadSimple size={18} />
                Descargar reporte JSON
              </button>
            </div>
          )}

          {error && (
            <p className="tool-status error" aria-live="polite" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="moodle-import-dialog__footer">
          <button className="secondary-button" disabled={running} onClick={close} type="button">
            {report ? "Cerrar" : "Cancelar"}
          </button>
          {!report && (
            <button
              className="primary-button"
              disabled={!prepared || running || analyzing}
              onClick={startImport}
              type="button"
            >
              {running ? "Importando…" : "Restaurar en esta sección"}
            </button>
          )}
        </div>
      </dialog>
    </>
  );
}
