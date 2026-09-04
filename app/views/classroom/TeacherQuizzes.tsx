"use client";

// Implements: REQ-QUIZ-01, REQ-QUIZ-02
import {
  DownloadSimple,
  Exam,
  FileCsv,
  FileText,
  SealCheck,
  Trash,
  WarningCircle,
} from "@phosphor-icons/react";
import { type ChangeEvent, type FormEvent, useMemo, useState } from "react";
import type { Course } from "../../../lib/courses.ts";
import { publishQuiz, type ClassroomState } from "../../../lib/firebase-classroom-client.ts";
import {
  MAX_QUIZ_DURATION_MINUTES,
  MAX_QUIZ_FILE_BYTES,
  MAX_QUIZ_QUESTIONS,
  parseQuestionBank,
  type ImportedQuizQuestion,
  type QuizDefinition,
  type QuizImportWarning,
} from "../../../lib/quizzes.ts";
import { formatBytes } from "../../../lib/portal-utils.ts";
import type { Note } from "./classroom-utils.ts";
import { downloadInteropBytes, downloadInteropFile } from "../../../lib/interop/client.ts";
import { questionKindLabel } from "./quiz-shared.ts";
import { QuizEmpty, QuizLoading } from "./QuizViews.tsx";

function QuizBuilderForm({
  course,
  classroom,
  quizzes,
  readOnly,
  note,
}: {
  course: Course;
  classroom: ClassroomState;
  quizzes: QuizDefinition[];
  readOnly: boolean;
  note: (text: string, tone?: Note["tone"]) => void;
}) {
  const [questions, setQuestions] = useState<ImportedQuizQuestion[]>([]);
  const [warnings, setWarnings] = useState<QuizImportWarning[]>([]);
  const [fileName, setFileName] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [exportingQti, setExportingQti] = useState(false);

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_QUIZ_FILE_BYTES) {
      setQuestions([]);
      setWarnings([]);
      note(`El banco supera el máximo de ${formatBytes(MAX_QUIZ_FILE_BYTES)}.`, "bad");
      return;
    }
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !["txt", "gift", "csv", "xml", "zip"].includes(extension)) {
      note("Selecciona un banco GIFT, CSV o QTI (.xml o .zip).", "bad");
      return;
    }
    try {
      const parsed =
        extension === "xml" || extension === "zip"
          ? await (
              await import("../../../lib/interop/qti.ts")
            ).importQtiBank(new Uint8Array(await file.arrayBuffer()))
          : parseQuestionBank(await file.text(), extension === "csv" ? "csv" : "gift");
      setFileName(file.name);
      setQuestions(parsed.questions);
      setWarnings(parsed.warnings);
      note(
        parsed.questions.length > 0
          ? `${parsed.questions.length} pregunta${parsed.questions.length === 1 ? "" : "s"} importada${parsed.questions.length === 1 ? "" : "s"}.`
          : "El banco no contiene preguntas compatibles.",
        parsed.questions.length > 0 ? "ok" : "bad"
      );
    } catch (cause) {
      setQuestions([]);
      setWarnings([]);
      note(
        cause instanceof Error ? cause.message : "No se pudo leer el banco de preguntas.",
        "bad"
      );
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (readOnly) return note("La sección archivada no admite nuevos cuestionarios.", "bad");
    if (questions.length === 0) return note("Importa al menos una pregunta compatible.", "bad");
    if (questions.length > MAX_QUIZ_QUESTIONS) {
      return note(`Reduce el cuestionario a ${MAX_QUIZ_QUESTIONS} preguntas o menos.`, "bad");
    }
    const form = event.currentTarget;
    const values = new FormData(form);
    setPublishing(true);
    note("Publicando cuestionario…");
    try {
      await publishQuiz({
        courseId: course.id,
        title: String(values.get("quizTitle") ?? ""),
        description: String(values.get("quizDescription") ?? ""),
        durationMinutes: Number(values.get("quizDuration")),
        gradeItemId: String(values.get("quizGradeItem") ?? ""),
        questions,
      });
      form.reset();
      setQuestions([]);
      setWarnings([]);
      setFileName("");
      note("Cuestionario publicado con su pauta protegida.", "ok");
    } catch (cause) {
      note(cause instanceof Error ? cause.message : "No se pudo publicar el cuestionario.", "bad");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <form className="quiz-builder" onSubmit={submit}>
      <div className="section-title compact-title">
        <div>
          <span className="eyebrow">Nuevo control</span>
          <h2>Importar y publicar</h2>
        </div>
        <span className="quiz-limit">máx. {MAX_QUIZ_QUESTIONS}</span>
      </div>
      <div className="quiz-builder-fields">
        <label>
          Nombre del cuestionario
          <input maxLength={160} name="quizTitle" placeholder="Control rápido 1" required />
        </label>
        <label>
          Descripción para estudiantes
          <textarea
            maxLength={1000}
            name="quizDescription"
            placeholder="Contenidos, instrucciones y alcance del control."
            rows={3}
          />
        </label>
        <div className="quiz-field-row">
          <label>
            Duración
            <span className="quiz-input-suffix">
              <input
                defaultValue={15}
                max={MAX_QUIZ_DURATION_MINUTES}
                min={1}
                name="quizDuration"
                required
                type="number"
              />
              <span>min</span>
            </span>
          </label>
          <label>
            Ítem del libro de notas
            <select disabled={classroom.gradebook.length === 0} name="quizGradeItem" required>
              <option value="">Seleccionar…</option>
              {classroom.gradebook.map((item) => (
                <option
                  disabled={quizzes.some((quiz) => quiz.gradeItemId === item.id)}
                  key={item.id}
                  value={item.id}
                >
                  {item.name} · {item.weight}%
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      {classroom.gradebook.length === 0 && (
        <p className="quiz-inline-alert" role="status">
          <WarningCircle size={18} weight="fill" aria-hidden="true" />
          Configura primero una evaluación en la pestaña Notas.
        </p>
      )}
      <label className="quiz-dropzone">
        {fileName.toLowerCase().endsWith(".csv") ? (
          <FileCsv size={28} weight="duotone" aria-hidden="true" />
        ) : (
          <FileText size={28} weight="duotone" aria-hidden="true" />
        )}
        <span>
          <strong>{fileName || "Seleccionar banco GIFT, CSV o QTI"}</strong>
          <small>.txt, .gift, .csv, .xml o .zip · hasta {formatBytes(MAX_QUIZ_FILE_BYTES)}</small>
        </span>
        <input
          accept=".txt,.gift,.csv,.xml,.zip,text/plain,text/csv,application/xml,application/zip"
          onChange={importFile}
          type="file"
        />
      </label>
      <p className="quiz-format-note">
        CSV: columnas <code>tipo</code>, <code>pregunta</code>, <code>respuesta_correcta</code> y{" "}
        <code>opcion_1…10</code>. GIFT admite alternativa única, V/F, respuesta corta y numérica.
        QTI 2.1 admite ítems de alternativa única, texto sin distinción de mayúsculas y respuesta
        numérica; las funciones no compatibles aparecen como advertencias.
      </p>
      {warnings.length > 0 && (
        <details className="quiz-import-warnings">
          <summary>
            {warnings.length} advertencia{warnings.length === 1 ? "" : "s"} de importación
          </summary>
          <ul>
            {warnings.slice(0, 20).map((warning) => (
              <li key={`${warning.sourceLine}-${warning.message}`}>
                Entrada {warning.sourceLine}: {warning.message}
              </li>
            ))}
          </ul>
        </details>
      )}
      {questions.length > 0 && (
        <div className="quiz-import-preview">
          <button
            className="secondary-button"
            disabled={exportingQti}
            type="button"
            onClick={async () => {
              if (exportingQti) return;
              setExportingQti(true);
              try {
                const { exportQtiBank } = await import("../../../lib/interop/qti.ts");
                downloadInteropBytes(exportQtiBank(questions), "banco-qti.zip");
                note("Banco QTI descargado exitosamente.", "ok");
              } catch (cause) {
                note(cause instanceof Error ? cause.message : "No se pudo exportar QTI.", "bad");
              } finally {
                setExportingQti(false);
              }
            }}
          >
            <DownloadSimple size={18} aria-hidden="true" />
            {exportingQti ? "Exportando banco…" : "Exportar banco QTI"}
          </button>
          <div>
            <strong>
              {questions.length} pregunta{questions.length === 1 ? "" : "s"} lista
              {questions.length === 1 ? "" : "s"}
            </strong>
            <span className={questions.length > MAX_QUIZ_QUESTIONS ? "over-limit" : ""}>
              {questions.length}/{MAX_QUIZ_QUESTIONS}
            </span>
          </div>
          <ol>
            {questions.map((item, index) => (
              <li key={item.question.id}>
                <span>
                  <strong>{item.question.title}</strong>
                  <small>{questionKindLabel(item.question.kind)}</small>
                </span>
                <button
                  aria-label={`Quitar ${item.question.title}`}
                  onClick={() =>
                    setQuestions((current) => current.filter((_, itemIndex) => itemIndex !== index))
                  }
                  type="button"
                >
                  <Trash size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
      <button
        className="primary-button quiz-publish-button"
        disabled={
          publishing ||
          readOnly ||
          questions.length === 0 ||
          questions.length > MAX_QUIZ_QUESTIONS ||
          classroom.gradebook.length === 0
        }
        type="submit"
      >
        <Exam size={18} weight="bold" aria-hidden="true" />
        {publishing ? "Publicando…" : "Publicar cuestionario"}
      </button>
    </form>
  );
}

function QuizCatalogList({
  course,
  gradebook,
  quizzes,
  loading,
  note,
}: {
  course: Course;
  gradebook: ClassroomState["gradebook"];
  quizzes: QuizDefinition[];
  loading: boolean;
  note: (text: string, tone?: Note["tone"]) => void;
}) {
  const gradeItemsById = useMemo(
    () => new Map(gradebook.map((item) => [item.id, item])),
    [gradebook]
  );

  return (
    <div className="quiz-catalog">
      <div className="section-title compact-title">
        <div>
          <span className="eyebrow">Sección</span>
          <h2>Cuestionarios publicados</h2>
        </div>
        <span className="quiz-count">{quizzes.length}</span>
      </div>
      {loading ? (
        <QuizLoading />
      ) : quizzes.length === 0 ? (
        <QuizEmpty teacher />
      ) : (
        <div className="quiz-card-list">
          {quizzes.map((quiz) => (
            <article className="quiz-card" key={quiz.id}>
              <div className="quiz-card-icon">
                <Exam size={22} weight="duotone" aria-hidden="true" />
              </div>
              <div>
                <span className="quiz-card-state">
                  <SealCheck size={15} weight="fill" aria-hidden="true" /> Publicado
                </span>
                <h3>{quiz.title}</h3>
                <p>{quiz.description || "Sin instrucciones adicionales."}</p>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={async () => {
                    try {
                      await downloadInteropFile(
                        "/api/courses/" +
                          encodeURIComponent(course.id) +
                          "/quizzes/" +
                          encodeURIComponent(quiz.id) +
                          "/qti",
                        "banco-qti-" + quiz.id + ".zip"
                      );
                    } catch (cause) {
                      note(
                        cause instanceof Error ? cause.message : "No se pudo exportar QTI.",
                        "bad"
                      );
                    }
                  }}
                >
                  <DownloadSimple size={18} aria-hidden="true" />
                  Exportar QTI
                </button>
                <dl>
                  <div>
                    <dt>Preguntas</dt>
                    <dd>{quiz.questions.length}</dd>
                  </div>
                  <div>
                    <dt>Tiempo</dt>
                    <dd>{quiz.durationMinutes} min</dd>
                  </div>
                  <div>
                    <dt>Nota</dt>
                    <dd>{gradeItemsById.get(quiz.gradeItemId)?.name ?? quiz.gradeItemId}</dd>
                  </div>
                </dl>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export function TeacherQuizzes({
  course,
  classroom,
  quizzes,
  loading,
  readOnly,
  note,
}: {
  course: Course;
  classroom: ClassroomState;
  quizzes: QuizDefinition[];
  loading: boolean;
  readOnly: boolean;
  note: (text: string, tone?: Note["tone"]) => void;
}) {
  return (
    <section className="quiz-workspace">
      <div className="quiz-teacher-grid">
        <QuizBuilderForm
          classroom={classroom}
          course={course}
          note={note}
          quizzes={quizzes}
          readOnly={readOnly}
        />
        <QuizCatalogList
          course={course}
          gradebook={classroom.gradebook}
          loading={loading}
          note={note}
          quizzes={quizzes}
        />
      </div>
    </section>
  );
}
