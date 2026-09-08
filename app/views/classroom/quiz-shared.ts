// Implements: REQ-QUIZ-01, REQ-QUIZ-02
import type { QuizQuestion } from "../../../lib/quizzes.ts";

export type SaveState = "idle" | "saving" | "saved" | "error";
export type QuizAnswer = string | number;

export function questionKindLabel(kind: QuizQuestion["kind"]) {
  if (kind === "true_false") return "Verdadero o falso";
  if (kind === "short_answer") return "Respuesta corta";
  if (kind === "numerical") return "Numérica";
  return "Alternativa única";
}

export function remainingSeconds(expiresAt: string) {
  const expires = Date.parse(expiresAt);
  if (!Number.isFinite(expires)) return 0;
  return Math.max(0, Math.ceil((expires - Date.now()) / 1000));
}

export function formatTimer(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function hasAnswer(value: QuizAnswer | undefined) {
  return typeof value === "number" || (typeof value === "string" && value.trim() !== "");
}
