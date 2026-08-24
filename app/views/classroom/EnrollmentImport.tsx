"use client";

import { useId, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  DownloadSimple,
  Eye,
  FileCsv,
  UploadSimple,
  WarningCircle,
} from "@phosphor-icons/react";
import type { EnrollmentImportPreview, EnrollmentImportStatus } from "../../../lib/bulk-enrollment";

const CLIENT_FILE_LIMIT = 5 * 1024 * 1024;

type ImportResult = {
  applied: true;
  activated: number;
  reactivated: number;
  pending: number;
  unchanged: number;
  projected: number;
  projectionPending: boolean;
  error?: string;
};

type Notice = {
  text: string;
  tone: "info" | "ok" | "bad" | "warning";
};

const EMPTY_NOTICE: Notice = { text: "", tone: "info" };

export function EnrollmentImport({
  sectionId,
  sectionLabel,
}: {
  sectionId: string;
  sectionLabel: string;
}) {
  const inputId = useId();
  const helpId = useId();
  const csvRef = useRef("");
  const applyingRef = useRef(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<EnrollmentImportPreview | null>(null);
  const [busy, setBusy] = useState<"preview" | "apply" | null>(null);
  const [notice, setNotice] = useState<Notice>(EMPTY_NOTICE);

  const readCsv = async () => {
    if (!file) throw new Error("Selecciona un archivo CSV.");
    if (file.size > CLIENT_FILE_LIMIT) throw new Error("El archivo supera el máximo de 5 MiB.");
    if (!csvRef.current) csvRef.current = await file.text();
    return csvRef.current;
  };

  const loadPreview = async (page = 1, announce = true) => {
    setBusy("preview");
    try {
      const csv = await readCsv();
      const response = await fetch("/api/enrollments/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId, csv, page }),
      });
      if (!response.ok) {
        throw new Error(await responseError(response, "No fue posible previsualizar el archivo."));
      }
      const data = (await response.json()) as EnrollmentImportPreview;
      setPreview(data);
      if (announce) {
        setNotice({
          text: data.canApply
            ? `Previsualización lista: ${data.totalRows.toLocaleString("es-CL")} estudiantes.`
            : "La previsualización contiene filas que debes corregir.",
          tone: data.canApply ? "ok" : "bad",
        });
      }
      return data;
    } catch (cause) {
      setNotice({
        text: cause instanceof Error ? cause.message : "No fue posible previsualizar el archivo.",
        tone: "bad",
      });
      return null;
    } finally {
      setBusy(null);
    }
  };

  const applyImport = async () => {
    if (!preview?.canApply || applyingRef.current) return;
    applyingRef.current = true;
    setBusy("apply");
    try {
      const csv = await readCsv();
      const response = await fetch("/api/enrollments/import/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId, csv, fingerprint: preview.fingerprint }),
      });
      let data: ImportResult;
      if (response.status === 502) {
        data = (await response.json()) as ImportResult;
      } else {
        if (!response.ok) {
          throw new Error(await responseError(response, "No fue posible aplicar las matrículas."));
        }
        data = (await response.json()) as ImportResult;
      }
      if (data.applied !== true) {
        throw new Error(data.error || "No fue posible aplicar las matrículas.");
      }
      await loadPreview(1, false);
      const changed = data.activated + data.reactivated;
      setNotice({
        text: data.projectionPending
          ? data.error || "Las matrículas se guardaron, pero su acceso al aula sigue pendiente."
          : `${changed.toLocaleString("es-CL")} matrículas activadas y ${data.pending.toLocaleString("es-CL")} pendientes de primer ingreso.`,
        tone: data.projectionPending ? "warning" : "ok",
      });
    } catch (cause) {
      setNotice({
        text: cause instanceof Error ? cause.message : "No fue posible aplicar las matrículas.",
        tone: "bad",
      });
    } finally {
      applyingRef.current = false;
      setBusy(null);
    }
  };

  const selectFile = (next: File | null) => {
    csvRef.current = "";
    setFile(next);
    setPreview(null);
    setNotice(EMPTY_NOTICE);
  };

  const downloadTemplate = () => {
    const blob = new Blob(["\uFEFFnombre;correo\r\nAna Pérez;ana.perez@alumnos.ubiobio.cl\r\n"], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `plantilla-matriculas-${sectionId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <article className="enrollment-import" aria-labelledby={`${inputId}-title`}>
      <div className="enrollment-import-head">
        <div className="enrollment-import-title">
          <span className="enrollment-import-icon" aria-hidden="true">
            <FileCsv size={25} weight="duotone" />
          </span>
          <div>
            <h2 id={`${inputId}-title`}>Carga masiva de matrículas</h2>
            <p>{sectionLabel} · Previsualiza cada cambio antes de aplicarlo.</p>
          </div>
        </div>
        <button className="enrollment-template" onClick={downloadTemplate} type="button">
          <DownloadSimple size={17} aria-hidden="true" />
          Descargar plantilla
        </button>
      </div>

      <div className="enrollment-file-field">
        <label htmlFor={inputId}>Archivo de estudiantes</label>
        <p id={helpId}>CSV UTF-8 con columnas nombre y correo; acepta coma o punto y coma.</p>
        <input
          accept=".csv,text/csv"
          aria-describedby={helpId}
          id={inputId}
          onChange={(event) => selectFile(event.currentTarget.files?.[0] ?? null)}
          type="file"
        />
        <span className="enrollment-file-name">
          {file ? `${file.name} · ${formatBytes(file.size)}` : "Ningún archivo seleccionado"}
        </span>
      </div>

      <div className="enrollment-import-actions">
        <button
          className="secondary-button"
          disabled={!file || busy !== null}
          onClick={() => loadPreview(1)}
          type="button"
        >
          <Eye size={18} aria-hidden="true" />
          {busy === "preview" ? "Previsualizando…" : "Previsualizar"}
        </button>
        <button
          className="primary-button"
          disabled={!preview?.canApply || busy !== null}
          onClick={applyImport}
          type="button"
        >
          <UploadSimple size={18} aria-hidden="true" />
          {busy === "apply" ? "Aplicando…" : "Aplicar matrículas"}
        </button>
      </div>

      {notice.text && (
        <p
          aria-live="polite"
          className={`enrollment-notice ${notice.tone}`}
          role={notice.tone === "bad" ? "alert" : "status"}
        >
          {notice.tone === "bad" || notice.tone === "warning" ? (
            <WarningCircle size={19} weight="fill" aria-hidden="true" />
          ) : (
            <CheckCircle size={19} weight="fill" aria-hidden="true" />
          )}
          {notice.text}
        </p>
      )}

      {preview && (
        <div className="enrollment-preview">
          <dl className="enrollment-summary">
            <SummaryItem
              label="Se activarán"
              value={preview.totals.activate + preview.totals.reactivate}
            />
            <SummaryItem label="Primer ingreso" value={preview.totals.pending} />
            <SummaryItem label="Sin cambios" value={preview.totals.unchanged} />
            <SummaryItem label="Observadas" value={preview.totals.invalid} />
          </dl>

          <div className="enrollment-table-wrap">
            <table className="enrollment-table">
              <thead>
                <tr>
                  <th scope="col">Fila</th>
                  <th scope="col">Estudiante</th>
                  <th scope="col">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr key={`${row.row}-${row.email}`}>
                    <td className="num">{row.row}</td>
                    <td>
                      <strong>{row.name || "Sin nombre"}</strong>
                      <small>{row.email || "Sin correo"}</small>
                    </td>
                    <td>
                      <span className={`enrollment-status ${row.status}`}>
                        {statusLabel(row.status)}
                      </span>
                      <small>{row.message}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="enrollment-pagination" aria-label="Páginas de la previsualización">
            <button
              className="secondary-button"
              disabled={preview.page <= 1 || busy !== null}
              onClick={() => loadPreview(preview.page - 1, false)}
              type="button"
            >
              <ArrowLeft size={17} aria-hidden="true" />
              Anterior
            </button>
            <span className="num">
              Página {preview.page} de {preview.totalPages}
            </span>
            <button
              className="secondary-button"
              disabled={preview.page >= preview.totalPages || busy !== null}
              onClick={() => loadPreview(preview.page + 1, false)}
              type="button"
            >
              Siguiente
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className="num">{value.toLocaleString("es-CL")}</dd>
    </div>
  );
}

function statusLabel(status: EnrollmentImportStatus) {
  const labels: Record<EnrollmentImportStatus, string> = {
    activate: "Se matriculará",
    reactivate: "Se reactivará",
    pending: "Pendiente",
    unchanged: "Sin cambios",
    invalid: "Corregir",
  };
  return labels[status];
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024).toLocaleString("es-CL")} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("es-CL", { maximumFractionDigits: 1 })} MB`;
}

async function responseError(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error || fallback;
  } catch {
    return fallback;
  }
}
