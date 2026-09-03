"use client";

import {
  ArrowLeft,
  CheckCircle,
  ClockCountdown,
  DownloadSimple,
  Exam,
  FileCsv,
  FileText,
  SealCheck,
  Trash,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react";
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { Course } from "../../../lib/courses.ts";
import {
  loadOwnQuizResult,
  publishQuiz,
  saveQuizAnswer,
  startQuizAttempt,
  submitQuizAttempt,
  watchQuizzes,
  type ClassroomState,
} from "../../../lib/firebase-classroom-client.ts";
import { formatGrade } from "../../../lib/grades.ts";
import {
  MAX_QUIZ_DURATION_MINUTES,
  MAX_QUIZ_FILE_BYTES,
  MAX_QUIZ_QUESTIONS,
  parseQuestionBank,
  type ImportedQuizQuestion,
  type QuizAttempt,
  type QuizDefinition,
  type QuizImportWarning,
  type QuizQuestion,
  type QuizResult,
} from "../../../lib/quizzes.ts";
import { formatBytes, formatDay } from "../../../lib/portal-utils.ts";
import type { Note } from "./classroom-utils.ts";
import { downloadInteropBytes, downloadInteropFile } from "../../../lib/interop/client.ts";

type SaveState = "idle" | "saving" | "saved" | "error";
type QuizAnswer = string | number;

export function QuizzesSection({
  course,
  classroom,
  canTeach,
  readOnly,
  note,
}: {
  course: Course;
  classroom: ClassroomState;
  canTeach: boolean;
  readOnly: boolean;
  note: (text: string, tone?: Note["tone"]) => void;
}) {
  const [quizzes, setQuizzes] = useState<QuizDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const noteRef = useRef(note);

  useEffect(() => {
    noteRef.current = note;
  }, [note]);

  useEffect(
    () =>
      watchQuizzes(
        course.id,
        canTeach,
        (next) => {
          setQuizzes(next);
          setLoading(false);
        },
        (message) => {
          noteRef.current(message, "bad");
          setLoading(false);
        }
      ),
    [canTeach, course.id]
  );

  if (canTeach) {
    return (
      <TeacherQuizzes
        classroom={classroom}
        course={course}
        loading={loading}
        note={note}
        quizzes={quizzes}
        readOnly={readOnly}
      />
    );
  }
  return (
    <StudentQuizzes
      course={course}
      loading={loading}
      note={note}
      quizzes={quizzes}
      readOnly={readOnly}
    />
  );
}

function TeacherQuizzes({
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
  const [questions, setQuestions] = useState<ImportedQuizQuestion[]>([]);
  const [warnings, setWarnings] = useState<QuizImportWarning[]>([]);
  const [fileName, setFileName] = useState("");
  const [publishing, setPublishing] = useState(false);
  const gradeItemsById = useMemo(
    () => new Map(classroom.gradebook.map((item) => [item.id, item])),
    [classroom.gradebook]
  );

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
    <section className="quiz-workspace">
      <div className="quiz-teacher-grid">
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
              <small>
                .txt, .gift, .csv, .xml o .zip · hasta {formatBytes(MAX_QUIZ_FILE_BYTES)}
              </small>
            </span>
            <input
              accept=".txt,.gift,.csv,.xml,.zip,text/plain,text/csv,application/xml,application/zip"
              onChange={importFile}
              type="file"
            />
          </label>
          <p className="quiz-format-note">
            CSV: columnas <code>tipo</code>, <code>pregunta</code>, <code>respuesta_correcta</code>{" "}
            y <code>opcion_1…10</code>. GIFT admite alternativa única, V/F, respuesta corta y
            numérica. QTI 2.1 admite ítems de alternativa única, texto sin distinción de mayúsculas
            y respuesta numérica; las funciones no compatibles aparecen como advertencias.
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
                type="button"
                onClick={async () => {
                  try {
                    const { exportQtiBank } = await import("../../../lib/interop/qti.ts");
                    downloadInteropBytes(exportQtiBank(questions), "banco-qti.zip");
                  } catch (cause) {
                    note(
                      cause instanceof Error ? cause.message : "No se pudo exportar QTI.",
                      "bad"
                    );
                  }
                }}
              >
                <DownloadSimple size={18} aria-hidden="true" />
                Exportar banco QTI
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
                        setQuestions((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index)
                        )
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
      </div>
    </section>
  );
}

function StudentQuizzes({
  course,
  quizzes,
  loading,
  readOnly,
  note,
}: {
  course: Course;
  quizzes: QuizDefinition[];
  loading: boolean;
  readOnly: boolean;
  note: (text: string, tone?: Note["tone"]) => void;
}) {
  const [activeQuiz, setActiveQuiz] = useState<QuizDefinition | null>(null);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  const open = async (quiz: QuizDefinition) => {
    setOpening(quiz.id);
    setActiveQuiz(quiz);
    setAttempt(null);
    setResult(null);
    try {
      const existing = await loadOwnQuizResult(course.id, quiz.id);
      if (existing) {
        setResult(existing);
        return;
      }
      if (readOnly) {
        note(
          "La sección está archivada y este cuestionario no tiene una entrega registrada.",
          "bad"
        );
        setActiveQuiz(null);
        return;
      }
      const outcome = await startQuizAttempt(course.id, quiz.id);
      if (outcome.status === "submitted") setResult(outcome.result);
      else setAttempt(outcome.attempt);
    } catch (cause) {
      note(cause instanceof Error ? cause.message : "No se pudo abrir el cuestionario.", "bad");
      setActiveQuiz(null);
    } finally {
      setOpening(null);
    }
  };

  if (activeQuiz && result) {
    return (
      <QuizCorrectionView quiz={activeQuiz} result={result} onBack={() => setActiveQuiz(null)} />
    );
  }
  if (activeQuiz && attempt) {
    return (
      <QuizRunner
        attempt={attempt}
        courseId={course.id}
        key={`${activeQuiz.id}:${attempt.userId}:${attempt.startedAt}`}
        onBack={() => setActiveQuiz(null)}
        onResult={setResult}
        quiz={activeQuiz}
      />
    );
  }
  return (
    <section className="quiz-student-view">
      <div className="quiz-student-hero">
        <div>
          <span className="eyebrow">Controles en línea</span>
          <h2>Cuestionarios de la sección</h2>
          <p>
            Tu avance se guarda pregunta por pregunta. Al entregar verás la corrección y tu nota
            oficial.
          </p>
        </div>
        <div className="quiz-hero-mark" aria-hidden="true">
          <Exam size={34} weight="duotone" />
        </div>
      </div>
      {loading ? (
        <QuizLoading />
      ) : quizzes.length === 0 ? (
        <QuizEmpty />
      ) : (
        <div className="quiz-student-list">
          {quizzes.map((quiz, index) => (
            <article className="quiz-student-card" key={quiz.id}>
              <span className="quiz-sequence">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <span className="quiz-card-state">Disponible</span>
                <h3>{quiz.title}</h3>
                <p>{quiz.description || "Control breve con corrección inmediata."}</p>
                <div className="quiz-card-facts">
                  <span>
                    <Exam size={16} aria-hidden="true" /> {quiz.questions.length} preguntas
                  </span>
                  <span>
                    <ClockCountdown size={16} aria-hidden="true" /> {quiz.durationMinutes} minutos
                  </span>
                </div>
              </div>
              <button
                className="secondary-button"
                disabled={opening !== null}
                onClick={() => open(quiz)}
                type="button"
              >
                {opening === quiz.id ? "Abriendo…" : readOnly ? "Ver entrega" : "Rendir ahora"}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function QuizRunner({
  courseId,
  quiz,
  attempt,
  onResult,
  onBack,
}: {
  courseId: string;
  quiz: QuizDefinition;
  attempt: QuizAttempt;
  onResult: (result: QuizResult) => void;
  onBack: () => void;
}) {
  const [answers, setAnswer] = useReducer(
    (current: Record<string, QuizAnswer>, update: { questionId: string; value: QuizAnswer }) => ({
      ...current,
      [update.questionId]: update.value,
    }),
    attempt.answers
  );
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [remaining, setRemaining] = useState(() => remainingSeconds(attempt.expiresAt));
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pendingValues = useRef(new Map<string, QuizAnswer>());
  const chains = useRef(new Map<string, Promise<void>>());
  const expiredSubmission = useRef(false);

  const persist = useCallback(
    (questionId: string, value: QuizAnswer) => {
      const previous = chains.current.get(questionId) ?? Promise.resolve();
      const next = previous
        .catch(() => undefined)
        .then(async () => {
          setSaveStates((current) => ({ ...current, [questionId]: "saving" }));
          await saveQuizAnswer(courseId, quiz.id, questionId, value);
          setSaveStates((current) => ({ ...current, [questionId]: "saved" }));
        })
        .catch(() => {
          setSaveStates((current) => ({ ...current, [questionId]: "error" }));
          throw new Error("No se pudo guardar una respuesta.");
        });
      chains.current.set(questionId, next);
      return next;
    },
    [courseId, quiz.id]
  );

  const queueSave = (questionId: string, value: QuizAnswer) => {
    setAnswer({ questionId, value });
    setSaveStates((current) => ({ ...current, [questionId]: "saving" }));
    pendingValues.current.set(questionId, value);
    const currentTimer = timers.current.get(questionId);
    if (currentTimer) clearTimeout(currentTimer);
    timers.current.set(
      questionId,
      setTimeout(() => {
        timers.current.delete(questionId);
        const pending = pendingValues.current.get(questionId);
        pendingValues.current.delete(questionId);
        if (pending !== undefined) void persist(questionId, pending);
      }, 450)
    );
  };

  const flush = useCallback(async () => {
    const queued = [...pendingValues.current.entries()];
    for (const [questionId] of queued) {
      const timer = timers.current.get(questionId);
      if (timer) clearTimeout(timer);
      timers.current.delete(questionId);
      pendingValues.current.delete(questionId);
    }
    await Promise.allSettled(queued.map(([questionId, value]) => persist(questionId, value)));
    await Promise.allSettled([...chains.current.values()]);
  }, [persist]);

  const submit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError("");
    await flush();
    try {
      onResult(await submitQuizAttempt(courseId, quiz.id));
    } catch (cause) {
      setSubmitError(
        cause instanceof Error ? cause.message : "No se pudo entregar el cuestionario."
      );
      setSubmitting(false);
    }
  }, [courseId, flush, onResult, quiz.id, submitting]);

  useEffect(() => {
    const interval = window.setInterval(
      () => setRemaining(remainingSeconds(attempt.expiresAt)),
      1000
    );
    return () => window.clearInterval(interval);
  }, [attempt.expiresAt]);

  useEffect(() => {
    if (remaining > 0 || expiredSubmission.current) return;
    expiredSubmission.current = true;
    void submit();
  }, [remaining, submit]);

  useEffect(
    () => () => {
      for (const timer of timers.current.values()) clearTimeout(timer);
    },
    []
  );

  const answered = quiz.questions.filter((question) => hasAnswer(answers[question.id])).length;
  const percentage = quiz.questions.length > 0 ? (100 * answered) / quiz.questions.length : 0;

  return (
    <section className="quiz-runner">
      <header className="quiz-runner-header">
        <button
          className="quiz-back-button"
          onClick={() => void flush().finally(onBack)}
          type="button"
        >
          <ArrowLeft size={18} aria-hidden="true" /> Salir
        </button>
        <div>
          <span className="eyebrow">Rendición en curso</span>
          <h2>{quiz.title}</h2>
        </div>
        <div
          className={remaining <= 60 ? "quiz-timer urgent" : "quiz-timer"}
          role="timer"
          aria-live="polite"
        >
          <ClockCountdown size={20} weight="fill" aria-hidden="true" />
          <span>{formatTimer(remaining)}</span>
        </div>
      </header>
      <div
        className="quiz-runner-progress"
        role="progressbar"
        aria-valuenow={answered}
        aria-valuemin={0}
        aria-valuemax={quiz.questions.length}
        aria-label={`${answered} de ${quiz.questions.length} preguntas respondidas`}
      >
        <span style={{ width: `${percentage}%` }} />
      </div>
      <div className="quiz-question-list">
        {quiz.questions.map((question, index) => (
          <QuestionField
            answer={answers[question.id]}
            disabled={submitting || remaining === 0}
            index={index}
            key={question.id}
            onChange={(value) => queueSave(question.id, value)}
            question={question}
            saveState={saveStates[question.id] ?? "idle"}
          />
        ))}
      </div>
      <footer className="quiz-submit-bar">
        <div>
          <strong>
            {answered} de {quiz.questions.length} respondidas
          </strong>
          <span>Las preguntas sin respuesta obtienen 0 puntos.</span>
        </div>
        <button
          className="primary-button"
          disabled={submitting}
          onClick={() => void submit()}
          type="button"
        >
          <SealCheck size={18} weight="bold" aria-hidden="true" />
          {submitting ? "Corrigiendo…" : "Entregar y corregir"}
        </button>
      </footer>
      {submitError && (
        <p className="quiz-submit-error" role="alert">
          {submitError}
        </p>
      )}
    </section>
  );
}

function QuestionField({
  question,
  index,
  answer,
  saveState,
  disabled,
  onChange,
}: {
  question: QuizQuestion;
  index: number;
  answer: QuizAnswer | undefined;
  saveState: SaveState;
  disabled: boolean;
  onChange: (answer: QuizAnswer) => void;
}) {
  const status =
    saveState === "saving"
      ? "Guardando…"
      : saveState === "saved"
        ? "Guardado"
        : saveState === "error"
          ? "Sin guardar"
          : "";
  return (
    <fieldset className="quiz-question" disabled={disabled}>
      <legend>
        <span>{String(index + 1).padStart(2, "0")}</span>
        <span>
          <strong>{question.title}</strong>
          <small>
            {question.points} punto{question.points === 1 ? "" : "s"}
          </small>
        </span>
        <span className={`quiz-save-state ${saveState}`} role="status">
          {saveState === "saved" && <CheckCircle size={15} weight="fill" aria-hidden="true" />}
          {saveState === "error" && <WarningCircle size={15} weight="fill" aria-hidden="true" />}
          {status}
        </span>
      </legend>
      <p>{question.prompt}</p>
      {(question.kind === "single_choice" || question.kind === "true_false") && (
        <div className="quiz-options">
          {question.options.map((option) => (
            <label className={answer === option.id ? "selected" : ""} key={option.id}>
              <input
                checked={answer === option.id}
                name={`answer-${question.id}`}
                onChange={() => onChange(option.id)}
                type="radio"
                value={option.id}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      )}
      {question.kind === "short_answer" && (
        <label className="quiz-text-answer">
          Tu respuesta
          <input
            maxLength={500}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Escribe una respuesta breve"
            type="text"
            value={typeof answer === "string" ? answer : ""}
          />
        </label>
      )}
      {question.kind === "numerical" && (
        <label className="quiz-text-answer">
          Tu resultado
          <input
            inputMode="decimal"
            onChange={(event) => onChange(event.target.value)}
            placeholder="Ej. 3,14"
            type="text"
            value={typeof answer === "string" || typeof answer === "number" ? answer : ""}
          />
        </label>
      )}
    </fieldset>
  );
}

function QuizCorrectionView({
  quiz,
  result,
  onBack,
}: {
  quiz: QuizDefinition;
  result: QuizResult;
  onBack: () => void;
}) {
  const byQuestion = new Map(quiz.questions.map((question) => [question.id, question]));
  const correct = result.corrections.filter((item) => item.correct).length;
  return (
    <section className="quiz-results">
      <button className="quiz-back-button" onClick={onBack} type="button">
        <ArrowLeft size={18} aria-hidden="true" /> Volver a cuestionarios
      </button>
      <div className="quiz-result-hero">
        <div>
          <span className="eyebrow">Corrección inmediata</span>
          <h2>{quiz.title}</h2>
          <p>
            Entregado el {formatDay(result.submittedAt)} · {correct} de {quiz.questions.length}{" "}
            respuestas correctas
          </p>
        </div>
        <div className="quiz-grade-seal">
          <span>Nota oficial</span>
          <strong>{formatGrade(result.grade)}</strong>
          <small>
            {result.earnedPoints}/{result.totalPoints} pts
          </small>
        </div>
      </div>
      <div className="quiz-corrections">
        {result.corrections.map((correction, index) => {
          const question = byQuestion.get(correction.questionId);
          return (
            <article
              className={correction.correct ? "correct" : "incorrect"}
              key={correction.questionId}
            >
              <div className="quiz-correction-mark">
                {correction.correct ? (
                  <CheckCircle size={24} weight="fill" aria-label="Correcta" role="img" />
                ) : (
                  <XCircle size={24} weight="fill" aria-label="Incorrecta" role="img" />
                )}
              </div>
              <div>
                <span>Pregunta {index + 1}</span>
                <h3>{question?.title ?? "Pregunta"}</h3>
                <p>{question?.prompt}</p>
                <dl>
                  <div>
                    <dt>Respuesta correcta</dt>
                    <dd>{correction.correctAnswer}</dd>
                  </div>
                  {correction.feedback && (
                    <div>
                      <dt>Retroalimentación</dt>
                      <dd>{correction.feedback}</dd>
                    </div>
                  )}
                </dl>
              </div>
              <strong className="quiz-correction-points">
                {correction.earnedPoints}/{question?.points ?? 1}
              </strong>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function QuizLoading() {
  return (
    <div className="quiz-loading" role="status">
      Cargando cuestionarios…
    </div>
  );
}

function QuizEmpty({ teacher = false }: { teacher?: boolean }) {
  return (
    <div className="quiz-empty">
      <Exam size={32} weight="duotone" aria-hidden="true" />
      <strong>
        {teacher ? "Aún no publicas cuestionarios" : "No hay cuestionarios disponibles"}
      </strong>
      <p>
        {teacher
          ? "Importa un banco para preparar el primer control."
          : "Los nuevos controles aparecerán aquí cuando el docente los publique."}
      </p>
    </div>
  );
}

function questionKindLabel(kind: QuizQuestion["kind"]) {
  if (kind === "true_false") return "Verdadero o falso";
  if (kind === "short_answer") return "Respuesta corta";
  if (kind === "numerical") return "Numérica";
  return "Alternativa única";
}

function remainingSeconds(expiresAt: string) {
  const expires = Date.parse(expiresAt);
  if (!Number.isFinite(expires)) return 0;
  return Math.max(0, Math.ceil((expires - Date.now()) / 1000));
}

function formatTimer(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function hasAnswer(value: QuizAnswer | undefined) {
  return typeof value === "number" || (typeof value === "string" && value.trim() !== "");
}
