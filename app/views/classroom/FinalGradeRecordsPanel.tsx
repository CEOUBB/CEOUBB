"use client";

import { ArrowClockwise, FilePdf, FileXls, SealCheck, WarningCircle } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import type { Course } from "../../../lib/courses";
import {
  buildFinalGradeRecords,
  finalGradeOutcomeLabel,
  finalGradeStatistics,
  fingerprintFinalGradeRecords,
  INTEGRATIVE_GRADE_ITEM_ID,
  type FinalGradeMetadata,
  type FinalGradeRecord,
  type FinalGradeStatistics,
} from "../../../lib/final-grade-records";
import type { FinalGradeExport } from "../../../lib/grade-record-exports";
import { saveStudentScores } from "../../../lib/firebase-classroom-client";
import {
  formatGrade,
  isValidGrade,
  MAX_GRADE,
  MIN_GRADE,
  type GradeItem,
  type GradeScores,
} from "../../../lib/grades";
import {
  loadCompleteStudentDirectory,
  type ParticipantDirectoryEntry,
} from "../../../lib/participants";
import { paginateList, type Note } from "./classroom-utils";

function safeFileName(value: string): string {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "seccion";
}

function downloadBytes(bytes: Uint8Array, fileName: string, contentType: string) {
  const blob = new Blob([Uint8Array.from(bytes).buffer], { type: contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function conditionLabel(record: FinalGradeRecord): string {
  if (record.eligibility === "required") return "Requerida";
  if (record.eligibility === "optional") return "Voluntaria";
  return "No aplica";
}

function createMetadata(course: Course): FinalGradeMetadata {
  return {
    courseId: course.id,
    courseCode: course.code,
    courseName: course.name,
    section: course.section,
    period: course.period,
    teacher: course.teacher,
    generatedAt: new Date().toISOString(),
  };
}

function FinalGradeRecordTable({
  records,
  statistics,
  readOnly,
  savingStudentId,
  onSaveIntegrative,
}: {
  records: FinalGradeRecord[];
  statistics: FinalGradeStatistics;
  readOnly: boolean;
  savingStudentId: string;
  onSaveIntegrative: (record: FinalGradeRecord, value: string) => Promise<void>;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const paginated = useMemo(() => paginateList(records, currentPage, 25), [records, currentPage]);

  return (
    <>
      <dl className="final-grade-statistics">
        <div>
          <dt>Aprobados</dt>
          <dd className="num">{statistics.passed}</dd>
        </div>
        <div>
          <dt>Reprobados</dt>
          <dd className="num">{statistics.failed}</dd>
        </div>
        <div>
          <dt>Promedio sección</dt>
          <dd className="num">
            {statistics.sectionAverage === null ? "—" : formatGrade(statistics.sectionAverage)}
          </dd>
        </div>
        <div>
          <dt>En integradora</dt>
          <dd className="num">{statistics.integrativeRequired}</dd>
        </div>
        <div>
          <dt>Pendientes</dt>
          <dd className="num">{statistics.pending}</dd>
        </div>
      </dl>

      <div className="final-grade-table-wrap">
        <table className="final-grade-table">
          <thead>
            <tr>
              <th scope="col">Estudiante</th>
              <th scope="col">Promedio parciales</th>
              <th scope="col">Condición</th>
              <th scope="col">Integradora</th>
              <th scope="col">Nota final</th>
              <th scope="col">Situación</th>
            </tr>
          </thead>
          <tbody>
            {paginated.items.map((record) => (
              <tr key={record.userId}>
                <th scope="row">
                  <strong>{record.name}</strong>
                  <small>{record.email}</small>
                </th>
                <td className="num">
                  {record.partialAverage === null ? "—" : formatGrade(record.partialAverage)}
                </td>
                <td>{conditionLabel(record)}</td>
                <td>
                  {record.eligibility === "blocked" ? (
                    <span className="final-grade-not-applicable">No aplica</span>
                  ) : (
                    <input
                      aria-label={`Evaluación integradora de ${record.name}`}
                      defaultValue={record.integrativeGrade === null ? "" : record.integrativeGrade}
                      disabled={readOnly || savingStudentId === record.userId}
                      key={`${record.userId}-${record.integrativeGrade ?? ""}`}
                      max={MAX_GRADE}
                      min={MIN_GRADE}
                      onBlur={(event) => void onSaveIntegrative(record, event.currentTarget.value)}
                      placeholder={record.eligibility === "required" ? "Pendiente" : "Opcional"}
                      step="0.1"
                      type="number"
                    />
                  )}
                </td>
                <td className="num">
                  {record.finalGrade === null ? "—" : formatGrade(record.finalGrade)}
                </td>
                <td>{finalGradeOutcomeLabel(record.outcome)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {records.length === 0 && (
        <p className="empty-row">La sección no tiene estudiantes con matrícula activa.</p>
      )}

      {paginated.totalPages > 1 && (
        <nav aria-label="Paginación de cierre de actas" className="classroom-pagination">
          <span className="pagination-summary num">
            Mostrando {paginated.startIndex}–{paginated.endIndex} de {paginated.totalItems}
          </span>
          <div className="pagination-actions">
            <button
              className="pagination-btn"
              disabled={paginated.page <= 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              type="button"
            >
              Anterior
            </button>
            <span className="pagination-indicator num">
              Página {paginated.page} de {paginated.totalPages}
            </span>
            <button
              className="pagination-btn"
              disabled={paginated.page >= paginated.totalPages}
              onClick={() => setCurrentPage((page) => Math.min(paginated.totalPages, page + 1))}
              type="button"
            >
              Siguiente
            </button>
          </div>
        </nav>
      )}
    </>
  );
}

// Implements: REQ-ACTA-02, REQ-ACTA-04, REQ-ACTA-05, REQ-ACTA-08
export function FinalGradeRecordsPanel({
  course,
  gradebook,
  classScores,
  readOnly,
  note,
}: {
  course: Course;
  gradebook: GradeItem[];
  classScores: Record<string, GradeScores>;
  readOnly: boolean;
  note: (text: string, tone?: Note["tone"]) => void;
}) {
  const [retry, setRetry] = useState(0);
  const [roster, setRoster] = useState<{
    key: string;
    students: ParticipantDirectoryEntry[];
    error: string;
  }>({ key: "", students: [], error: "" });
  const [savingStudentId, setSavingStudentId] = useState("");
  const [exporting, setExporting] = useState<"xlsx" | "pdf" | "">("");
  const rosterKey = `${course.id}:${retry}`;
  const rosterReady = roster.key === rosterKey;

  useEffect(() => {
    const controller = new AbortController();
    loadCompleteStudentDirectory(course.id, controller.signal)
      .then((students) => setRoster({ key: rosterKey, students, error: "" }))
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setRoster({
          key: rosterKey,
          students: [],
          error:
            cause instanceof Error
              ? cause.message
              : "No se pudo cargar la nómina activa de la sección.",
        });
      });
    return () => controller.abort();
  }, [course.id, rosterKey]);

  const records = useMemo(
    () => buildFinalGradeRecords(roster.students, gradebook, classScores),
    [roster.students, gradebook, classScores]
  );
  const statistics = useMemo(() => finalGradeStatistics(records), [records]);
  const canExport = rosterReady && !roster.error && records.length > 0 && !exporting;

  const prepareExport = async (): Promise<FinalGradeExport> => {
    const metadata = createMetadata(course);
    return {
      metadata,
      records,
      statistics,
      fingerprint: await fingerprintFinalGradeRecords(metadata, records),
      gradebook,
      classScores,
    };
  };

  const exportFile = async (format: "xlsx" | "pdf") => {
    if (!canExport) return;
    setExporting(format);
    try {
      const input = await prepareExport();
      const { createFinalGradePdf, createFinalGradeWorkbook } =
        await import("../../../lib/grade-record-exports");
      const baseName = `acta-${safeFileName(course.code)}-seccion-${safeFileName(course.section)}`;
      if (format === "xlsx") {
        downloadBytes(
          createFinalGradeWorkbook(input),
          `${baseName}.xlsx`,
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
      } else {
        downloadBytes(createFinalGradePdf(input), `${baseName}.pdf`, "application/pdf");
      }
      note(
        `${statistics.pending > 0 ? "Pre-acta" : "Acta"} ${format === "xlsx" ? "Excel" : "PDF"} generada con ${records.length.toLocaleString("es-CL")} estudiantes.`,
        "ok"
      );
    } catch (cause) {
      note(cause instanceof Error ? cause.message : "No fue posible generar el archivo.", "bad");
    } finally {
      setExporting("");
    }
  };

  const saveIntegrative = async (record: FinalGradeRecord, value: string) => {
    if (readOnly) return note("Este ramo está archivado y no admite cambios.", "bad");
    if (record.eligibility === "blocked") return;
    const normalized = value.trim();
    const score = normalized ? Number(normalized) : null;
    if (score !== null && !isValidGrade(score)) {
      note("La evaluación integradora debe estar entre 1,0 y 7,0.", "bad");
      return;
    }
    const currentScores = classScores[record.userId] ?? {};
    const nextScores = { ...currentScores };
    if (score === null) delete nextScores[INTEGRATIVE_GRADE_ITEM_ID];
    else nextScores[INTEGRATIVE_GRADE_ITEM_ID] = score;
    setSavingStudentId(record.userId);
    try {
      await saveStudentScores(course.id, record.userId, nextScores);
      note(
        score === null
          ? `Evaluación integradora de ${record.name} retirada.`
          : `Evaluación integradora de ${record.name} guardada.`,
        "ok"
      );
    } catch (cause) {
      note(
        cause instanceof Error ? cause.message : "No fue posible guardar la integradora.",
        "bad"
      );
    } finally {
      setSavingStudentId("");
    }
  };

  return (
    <section aria-labelledby="final-grade-records-title" className="final-grade-records">
      <header className="final-grade-records-head">
        <div>
          <span className="final-grade-records-icon" aria-hidden="true">
            <SealCheck size={22} weight="duotone" />
          </span>
          <div>
            <p className="eyebrow">DUE 5420/2023</p>
            <h2 id="final-grade-records-title">Cierre de actas</h2>
          </div>
        </div>
        <div className="final-grade-record-actions">
          <button
            className="secondary-button"
            disabled={!canExport}
            onClick={() => void exportFile("xlsx")}
            type="button"
          >
            <FileXls aria-hidden="true" size={17} />
            {exporting === "xlsx" ? "Generando…" : "Descargar Excel"}
          </button>
          <button
            className="primary-button"
            disabled={!canExport}
            onClick={() => void exportFile("pdf")}
            type="button"
          >
            <FilePdf aria-hidden="true" size={17} />
            {exporting === "pdf" ? "Certificando…" : "Descargar PDF"}
          </button>
        </div>
      </header>

      <p className="final-grade-records-copy">
        Calcula la regla 60/40, prepara la carga para Intranet y deja una huella SHA-256 de la
        instantánea. CEOUBB sigue siendo independiente: estos archivos no sustituyen el acta oficial
        custodiada por Registro Académico UBB.
      </p>

      {!rosterReady && (
        <p aria-live="polite" className="final-grade-roster-status">
          Cargando la nómina activa completa antes de habilitar las exportaciones…
        </p>
      )}

      {rosterReady && roster.error && (
        <div className="final-grade-roster-error" role="alert">
          <WarningCircle aria-hidden="true" size={20} />
          <div>
            <strong>No se generará una acta parcial.</strong>
            <p>{roster.error}</p>
          </div>
          <button
            className="secondary-button"
            onClick={() => setRetry((value) => value + 1)}
            type="button"
          >
            <ArrowClockwise aria-hidden="true" size={16} />
            Reintentar
          </button>
        </div>
      )}

      {rosterReady && !roster.error && (
        <FinalGradeRecordTable
          onSaveIntegrative={saveIntegrative}
          readOnly={readOnly}
          records={records}
          savingStudentId={savingStudentId}
          statistics={statistics}
        />
      )}
    </section>
  );
}
