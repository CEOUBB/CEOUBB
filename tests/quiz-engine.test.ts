import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { gradeFromPoints } from "../lib/grades.ts";

const require = createRequire(import.meta.url);
const engine = require("../firebase/functions/quiz-engine.js") as {
  QUIZ_REQUIREMENTS: string[];
  normalizePublishRequest(value: unknown): {
    questions: unknown[];
    answers: unknown[];
    totalPoints: number;
  };
  scoreQuizAnswers(
    questions: unknown[],
    answers: unknown[],
    submitted: Record<string, string | number>
  ): {
    earnedPoints: number;
    totalPoints: number;
    grade: number;
    corrections: { correct: boolean; correctAnswer: string }[];
  };
};
const generatedGrades = require("../firebase/functions/generated/grades.js") as {
  gradeFromPoints(earned: number, total: number, passingRatio?: number): number | null;
};

const REQUEST = {
  courseId: "fisica-2026-2-1",
  title: "Control de vectores",
  description: "Cuatro preguntas rápidas",
  durationMinutes: 15,
  gradeItemId: "control-1",
  questions: [
    {
      question: {
        id: "q-1",
        title: "Vector",
        prompt: "Selecciona una magnitud vectorial",
        kind: "single_choice",
        options: [
          { id: "q-1-o-1", label: "Masa" },
          { id: "q-1-o-2", label: "Fuerza" },
        ],
        points: 1,
      },
      answer: {
        questionId: "q-1",
        kind: "single_choice",
        acceptedAnswers: [],
        correctOptionId: "q-1-o-2",
        numericalAnswer: null,
        tolerance: 0,
        feedback: "La fuerza tiene dirección y sentido.",
      },
    },
    {
      question: {
        id: "q-2",
        title: "Unidad",
        prompt: "Unidad SI de fuerza",
        kind: "short_answer",
        options: [],
        points: 1,
      },
      answer: {
        questionId: "q-2",
        kind: "short_answer",
        acceptedAnswers: ["Newton", "N"],
        correctOptionId: null,
        numericalAnswer: null,
        tolerance: 0,
        feedback: "",
      },
    },
  ],
};

test("REQ-QUIZ-03 separa preguntas normalizadas y pauta", () => {
  const normalized = engine.normalizePublishRequest(REQUEST);
  assert.equal(normalized.questions.length, 2);
  assert.equal(normalized.answers.length, 2);
  assert.equal(normalized.totalPoints, 2);
  assert.ok(engine.QUIZ_REQUIREMENTS.includes("REQ-QUIZ-10"));
});

test("REQ-QUIZ-06 corrige el borrador almacenado y devuelve detalle inmediato", () => {
  const normalized = engine.normalizePublishRequest(REQUEST);
  const result = engine.scoreQuizAnswers(normalized.questions, normalized.answers, {
    "q-1": "q-1-o-2",
    "q-2": "newton",
  });
  assert.equal(result.earnedPoints, 2);
  assert.equal(result.grade, 7);
  assert.equal(
    result.corrections.every((item) => item.correct),
    true
  );
  assert.equal(result.corrections[0].correctAnswer, "Fuerza");
});

test("REQ-QUIZ-07 mantiene sincronizada la escala TypeScript y Functions", () => {
  for (const earned of [0, 1, 3, 6, 8, 10]) {
    assert.equal(generatedGrades.gradeFromPoints(earned, 10), gradeFromPoints(earned, 10));
  }
});

test("REQ-QUIZ-08 rechaza duración, ids y pautas manipuladas", () => {
  assert.throws(() => engine.normalizePublishRequest({ ...REQUEST, durationMinutes: 0 }));
  assert.throws(() => engine.normalizePublishRequest({ ...REQUEST, courseId: "../otra" }));
  const invalid = structuredClone(REQUEST);
  invalid.questions[0].answer.correctOptionId = "inexistente";
  assert.throws(() => engine.normalizePublishRequest(invalid));
});
