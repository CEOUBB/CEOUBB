"use client";

// Implements: REQ-QUIZ-01, REQ-QUIZ-02
import {
  ArrowLeft,
  CheckCircle,
  ClockCountdown,
  Exam,
  SealCheck,
  XCircle,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { Course } from "../../../lib/courses.ts";
import {
  loadOwnQuizResult,
  saveQuizAnswer,
  startQuizAttempt,
  submitQuizAttempt,
} from "../../../lib/firebase-classroom-client.ts";
import { formatGrade } from "../../../lib/grades.ts";
import type { QuizAttempt, QuizDefinition, QuizResult } from "../../../lib/quizzes.ts";
import { formatDay } from "../../../lib/portal-utils.ts";
import type { Note } from "./classroom-utils.ts";
import { QuestionField } from "./QuizQuestionField.tsx";
import { QuizEmpty, QuizLoading } from "./QuizViews.tsx";
import {
  formatTimer,
  hasAnswer,
  remainingSeconds,
  type QuizAnswer,
  type SaveState,
} from "./quiz-shared.ts";

export function StudentQuizzes({
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
