import { z } from "zod";
import type { PublicUser } from "../auth.ts";
import { fail } from "../interop/errors.ts";
import { exportQtiBank } from "../interop/qti.ts";
import { FIREBASE_PROJECT_ID, googleAccessToken } from "./enrollment-projection.ts";
import { authorizeInteropSection } from "./interop.ts";

const kind = z.enum(["single_choice", "true_false", "short_answer", "numerical"]);
const questionSchema = z.object({
  id: z.string(),
  title: z.string().max(160),
  prompt: z.string().max(3000),
  kind,
  options: z.array(z.object({ id: z.string(), label: z.string().max(1000) })).max(10),
  points: z.number().positive().max(100),
});
const answerSchema = z.object({
  questionId: z.string(),
  kind,
  acceptedAnswers: z.array(z.string().max(500)).max(50),
  correctOptionId: z.string().nullable(),
  numericalAnswer: z.number().nullable(),
  tolerance: z.number().nonnegative(),
  feedback: z.string().max(1000),
});

function firestoreValue(value: unknown, depth = 0): unknown {
  if (depth > 12) fail("El cuestionario excede la complejidad permitida.");
  const v = z.record(z.string(), z.unknown()).parse(value);
  if (typeof v.stringValue === "string") return v.stringValue;
  if (typeof v.integerValue === "string") return Number(v.integerValue);
  if (typeof v.doubleValue === "number") return v.doubleValue;
  if ("nullValue" in v) return null;
  if (v.arrayValue) {
    const a = z.object({ values: z.array(z.unknown()).max(500).optional() }).parse(v.arrayValue);
    return (a.values ?? []).map((item) => firestoreValue(item, depth + 1));
  }
  if (v.mapValue) {
    const m = z.object({ fields: z.record(z.string(), z.unknown()) }).parse(v.mapValue);
    return Object.fromEntries(
      Object.entries(m.fields).map(([key, item]) => [key, firestoreValue(item, depth + 1)])
    );
  }
  fail("El cuestionario contiene valores no compatibles.");
}
async function readField(
  sectionId: string,
  collection: string,
  quizId: string,
  field: string,
  token: string
) {
  const url =
    "https://firestore.googleapis.com/v1/projects/" +
    FIREBASE_PROJECT_ID +
    "/databases/(default)/documents/courses/" +
    sectionId +
    "/" +
    collection +
    "/" +
    quizId +
    "?mask.fieldPaths=" +
    field;
  const response = await fetch(url, {
    headers: { Authorization: "Bearer " + token },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  // Implements: REQ-QMD-05
  if (!response.ok) {
    throw fail(
      "El cuestionario o su pauta no están disponibles.",
      response.status === 404 ? 404 : 503
    );
  }
  const doc = z.object({ fields: z.record(z.string(), z.unknown()) }).parse(await response.json());
  return firestoreValue(doc.fields[field]);
}
export async function exportPublishedQuiz(actor: PublicUser, sectionId: string, quizId: string) {
  const { role } = await authorizeInteropSection(actor, sectionId);
  if (!(
    role === "owner" ||
    (actor.role === "teacher" && ["teacher", "coordinator"].includes(role))
  ))
    fail("Sólo el equipo docente puede exportar la pauta.", 403);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(quizId))
    fail("El identificador de cuestionario no es válido.");
  const token = await googleAccessToken();
  const values = await Promise.all([
    readField(sectionId, "quizzes", quizId, "questions", token),
    readField(sectionId, "quizKeys", quizId, "answers", token),
  ]);
  const questions = z.array(questionSchema).min(1).max(50).parse(values[0]);
  const answers = z.array(answerSchema).min(1).max(50).parse(values[1]);
  if (new Set(answers.map((a) => a.questionId)).size !== answers.length)
    fail("La pauta repite preguntas.");
  const byId = new Map(answers.map((a) => [a.questionId, a]));
  return exportQtiBank(
    questions.map((question, i) => {
      const answer = byId.get(question.id);
      if (!answer) fail("La pauta del cuestionario está incompleta.");
      return { sourceLine: i + 1, question, answer };
    })
  );
}
