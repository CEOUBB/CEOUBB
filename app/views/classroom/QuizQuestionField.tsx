"use client";

// Implements: REQ-QUIZ-01, REQ-QUIZ-02
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import type { QuizQuestion } from "../../../lib/quizzes.ts";
import type { QuizAnswer, SaveState } from "./quiz-shared.ts";

function ChoiceQuestionInput({
  question,
  answer,
  onChange,
}: {
  question: QuizQuestion;
  answer: QuizAnswer | undefined;
  onChange: (answer: QuizAnswer) => void;
}) {
  return (
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
  );
}

function ShortAnswerInput({
  answer,
  onChange,
}: {
  answer: QuizAnswer | undefined;
  onChange: (answer: QuizAnswer) => void;
}) {
  return (
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
  );
}

function NumericalInput({
  answer,
  onChange,
}: {
  answer: QuizAnswer | undefined;
  onChange: (answer: QuizAnswer) => void;
}) {
  return (
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
  );
}

export function QuestionField({
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
        <ChoiceQuestionInput answer={answer} onChange={onChange} question={question} />
      )}
      {question.kind === "short_answer" && <ShortAnswerInput answer={answer} onChange={onChange} />}
      {question.kind === "numerical" && <NumericalInput answer={answer} onChange={onChange} />}
    </fieldset>
  );
}
