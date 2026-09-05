"use client";

import { ChangeEvent, useEffect, useId, useRef, useState } from "react";
import { ArrowCounterClockwise, DownloadSimple, FileArrowUp, X } from "@phosphor-icons/react";
import type { Course } from "../../../lib/courses";
import {
  executeAdeccaImport,
  type AdeccaImportProgress,
} from "../../../lib/firebase/adecca-import";
import { prepareAdeccaCourseImport } from "../../../lib/adecca/parser";
import type { AdeccaImportReport, PreparedAdeccaCourseImport } from "../../../lib/adecca/types";

const POST_KIND_LABEL: Record<string, string> = {
  notice: "Aviso",
  guide: "Guía",
  assessment: "Evaluación descriptiva",
  resource: "Recurso",
};

function downloadReport(report: AdeccaImportReport) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(report, null, 2)], { type: "application/json" })
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `importacion-adecca-${report.source.fingerprint.slice(0, 12)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KiB", "MiB", "GiB"];
  const unitIndex = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const amount = value / 1024 ** unitIndex;
  return `${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 }).format(amount)} ${units[unitIndex]}`;
}

export function AdeccaImportDialog({ course }: { course: Course }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultActionRef = useRef<HTMLButtonElement>(null);
  const operationRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const inputId = useId();
  const [prepared, setPrepared] = useState<PreparedAdeccaCourseImport | null>(null);
  const [includeParticipants, setIncludeParticipants] = useState(false);
  const [progress, setProgress] = useState<AdeccaImportProgress | null>(null);
  const [report, setReport] = useState<AdeccaImportReport | null>(null);
  const [error, setError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const running = Boolean(progress && progress.phase !== "complete");

  useEffect(() => {
    if (report) resultActionRef.current?.focus();
  }, [report]);

  function reset() {
    operationRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    setPrepared(null);
    setIncludeParticipants(false);
    setProgress(null);
    setReport(null);
    setError("");
    setAnalyzing(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const operation = operationRef.current + 1;
    operationRef.current = operation;
    setPrepared(null);
    setIncludeParticipants(false);
    setProgress(null);
    setReport(null);
    setError("");
    if (!file) return;
    setAnalyzing(true);
    try {
      const next = await prepareAdeccaCourseImport(file);
      if (operation === operationRef.current) setPrepared(next);
    } catch (reason) {
      if (operation === operationRef.current) {
        setError(
          reason instanceof Error ? reason.message : "No fue posible leer el paquete local."
        );
      }
    } finally {
      if (operation === operationRef.current) setAnalyzing(false);
    }
  }

  async function startImport() {
    if (!prepared || running) return;
    const operation = operationRef.current + 1;
    const controller = new AbortController();
    operationRef.current = operation;
    controllerRef.current = controller;
    setError("");
    setReport(null);
    try {
      const next = await executeAdeccaImport(
        course.id,
        prepared,
        includeParticipants,
        (value) => {
          if (operation === operationRef.current) setProgress(value);
        },
        controller.signal
      );
      if (operation === operationRef.current) setReport(next);
    } catch (reason) {
      if (operation === operationRef.current) {
        setProgress(null);
        setError(reason instanceof Error ? reason.message : "La importación no pudo continuar.");
      }
    } finally {
      if (operation === operationRef.current) controllerRef.current = null;
    }
  }

  function cancelImport() {
    if (!running) return;
    operationRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    setProgress(null);
    setError(
      "Importación cancelada. El contenido ya confirmado se conserva y puedes reintentar sin duplicarlo."
    );
  }

  function close() {
    if (running) {
      cancelImport();
      return;
    }
    dialogRef.current?.close();
  }

  function restart() {
    reset();
    requestAnimationFrame(() => fileInputRef.current?.focus());
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
        Importar ADECCA
      </button>
      <dialog
        aria-describedby={`${inputId}-description ${inputId}-disclaimer`}
        aria-labelledby={`${inputId}-title`}
        className="moodle-import-dialog"
        onCancel={(event) => {
          if (running) {
            event.preventDefault();
            cancelImport();
          }
        }}
        onClose={reset}
        ref={dialogRef}
      >
        <div className="moodle-import-dialog__header">
          <div>
            <span className="eyebrow">Migración de curso</span>
            <h2 id={`${inputId}-title`}>Importar desde ADECCA UBB</h2>
            <p id={`${inputId}-description`}>
              Revisa un paquete local antes de incorporarlo en {course.name}.
            </p>
            <p className="moodle-import-disclaimer" id={`${inputId}-disclaimer`}>
              CEOUBB es una plataforma independiente. Esta herramienta no es una integración oficial
              con ADECCA ni se conecta a sus servidores.
            </p>
          </div>
          <button
            aria-label={running ? "Cancelar importación" : "Cerrar"}
            onClick={close}
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <div className="moodle-import-dialog__body">
          {!report && (
            <label className="moodle-import-file" htmlFor={inputId}>
              <FileArrowUp size={26} />
              <span>
                <strong>Seleccionar paquete .zip, manifiesto .json o nómina .csv</strong>
                <small>
                  Se analiza en este dispositivo. CEOUBB nunca solicita credenciales ni una URL de
                  ADECCA.
                </small>
              </span>
              <input
                accept=".zip,.json,.csv,application/zip,application/json,text/csv"
                disabled={running || analyzing}
                id={inputId}
                onChange={selectFile}
                ref={fileInputRef}
                type="file"
              />
            </label>
          )}

          {analyzing && <p aria-live="polite">Analizando estructura y compatibilidad…</p>}

          {preview && !report && (
            <div className="moodle-import-preview">
              <div className="moodle-import-source">
                <span>Origen local detectado</span>
                <strong>{preview.source.courseName || preview.source.fileName}</strong>
                <small>
                  {preview.source.courseShortName || preview.source.fileName}
                  {preview.source.adeccaVersion ? ` · ADECCA ${preview.source.adeccaVersion}` : ""}
                </small>
              </div>
              <dl>
                <div>
                  <dt>Unidades</dt>
                  <dd className="num">{preview.folders.length}</dd>
                </div>
                <div>
                  <dt>Publicaciones</dt>
                  <dd className="num">{preview.posts.length}</dd>
                </div>
                <div>
                  <dt>Archivos</dt>
                  <dd className="num">{preview.files.length}</dd>
                </div>
                <div>
                  <dt>Datos por subir</dt>
                  <dd className="num">{formatBytes(preview.uploadBytes)}</dd>
                </div>
                <div>
                  <dt>Estudiantes</dt>
                  <dd className="num">{preview.participants.length}</dd>
                </div>
                <div>
                  <dt>Advertencias</dt>
                  <dd className="num">{preview.omissions.length}</dd>
                </div>
              </dl>
              {(preview.folders.length > 0 ||
                preview.posts.length > 0 ||
                preview.files.length > 0) && (
                <section
                  aria-labelledby={`${inputId}-compatible-title`}
                  className="moodle-import-compatible"
                >
                  <h3 id={`${inputId}-compatible-title`}>Contenido compatible detectado</h3>
                  <div>
                    {preview.folders.length > 0 && (
                      <section>
                        <h4>Unidades</h4>
                        <ul>
                          {preview.folders.slice(0, 5).map((folder) => (
                            <li key={folder}>{folder}</li>
                          ))}
                        </ul>
                        {preview.folders.length > 5 && (
                          <small>Y {preview.folders.length - 5} unidades más.</small>
                        )}
                      </section>
                    )}
                    {preview.posts.length > 0 && (
                      <section>
                        <h4>Publicaciones</h4>
                        <ul>
                          {preview.posts.slice(0, 5).map((post) => (
                            <li key={post.sourceId}>
                              <span>{POST_KIND_LABEL[post.kind] ?? "Contenido"}</span>
                              {post.title}
                            </li>
                          ))}
                        </ul>
                        {preview.posts.length > 5 && (
                          <small>Y {preview.posts.length - 5} publicaciones más.</small>
                        )}
                      </section>
                    )}
                    {preview.files.length > 0 && (
                      <section>
                        <h4>Archivos</h4>
                        <ul>
                          {preview.files.slice(0, 5).map((file) => (
                            <li key={file.sourceId}>{file.fileName}</li>
                          ))}
                        </ul>
                        {preview.files.length > 5 && (
                          <small>Y {preview.files.length - 5} archivos más.</small>
                        )}
                      </section>
                    )}
                  </div>
                </section>
              )}
              {preview.omissions.length > 0 && (
                <details>
                  <summary>Ver contenido que no se importará</summary>
                  <ul>
                    {preview.omissions.slice(0, 50).map((item) => (
                      <li key={`${item.category}-${item.title}-${item.reason}`}>
                        <strong>{item.title}</strong>: {item.reason}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {preview.participants.length > 0 && (
                <label
                  aria-label="Importar estudiantes"
                  className="moodle-import-participants"
                  htmlFor={`${inputId}-participants`}
                >
                  <input
                    aria-describedby={`${inputId}-participants-help`}
                    aria-labelledby={`${inputId}-participants-label`}
                    checked={includeParticipants}
                    disabled={running}
                    id={`${inputId}-participants`}
                    onChange={(event) => setIncludeParticipants(event.target.checked)}
                    type="checkbox"
                  />
                  <span>
                    <strong id={`${inputId}-participants-label`}>Importar estudiantes</strong>
                    <small id={`${inputId}-participants-help`}>
                      Opción desactivada por defecto. Sólo acepta correos estudiantiles UBB; las
                      cuentas aún inexistentes esperan hasta 90 días.
                    </small>
                  </span>
                </label>
              )}
            </div>
          )}

          {progress && (
            <div className="moodle-import-progress" aria-live="polite">
              <div>
                <strong>{progress.message}</strong>
                <span className="num">{Math.round((currentStep / totalSteps) * 100)}%</span>
              </div>
              <progress
                aria-label="Progreso de la importación ADECCA"
                max={totalSteps}
                value={currentStep}
              />
            </div>
          )}

          {report && (
            <div className="moodle-import-result" aria-live="polite">
              <strong>
                {report.status === "completed"
                  ? "Importación completada"
                  : "Importación completada con advertencias"}
              </strong>
              <p>
                <span className="num">{report.contentImported}</span> contenidos y{" "}
                <span className="num">{report.filesImported}</span> archivos restaurados.
                {includeParticipants && (
                  <>
                    {" "}
                    <span className="num">{report.participantsMatched}</span> estudiantes vinculados
                    y <span className="num">{report.participantsPending}</span> pendientes.
                  </>
                )}
              </p>
              <button
                className="secondary-button"
                onClick={() => downloadReport(report)}
                ref={resultActionRef}
                type="button"
              >
                <DownloadSimple size={18} />
                Descargar reporte JSON
              </button>
            </div>
          )}

          {error && (
            <p className="tool-status error" aria-live="assertive" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="moodle-import-dialog__footer">
          <button
            className="secondary-button"
            onClick={running ? cancelImport : close}
            type="button"
          >
            {running ? "Cancelar importación" : report ? "Cerrar" : "Cancelar"}
          </button>
          {report ? (
            <button className="primary-button" onClick={restart} type="button">
              <ArrowCounterClockwise size={18} />
              Importar otro paquete
            </button>
          ) : (
            <button
              className="primary-button"
              disabled={!prepared || running || analyzing}
              onClick={startImport}
              type="button"
            >
              {running ? "Importando…" : "Importar en esta sección"}
            </button>
          )}
        </div>
      </dialog>
    </>
  );
}
