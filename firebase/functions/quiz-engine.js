"use strict";

const { gradeFromPoints } = require("./generated/grades");

const MAX_QUIZ_QUESTIONS = 50;
const MAX_QUIZ_OPTIONS = 10;
const MAX_QUIZ_DURATION_MINUTES = 180;
const COURSE_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,60}$/;
const ENTITY_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const QUESTION_KINDS = new Set(["single_choice", "true_false", "short_answer", "numerical"]);
const QUIZ_REQUIREMENTS = [
  "REQ-QUIZ-03",
  "REQ-QUIZ-04",
  "REQ-QUIZ-06",
  "REQ-QUIZ-07",
  "REQ-QUIZ-08",
  "REQ-QUIZ-10",
];

class QuizInputError extends Error {}

function inputRecord(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new QuizInputError(`${label} no tiene un formato válido.`);
  }
  return value;
}

function identifier(value, label, pattern = ENTITY_ID_PATTERN) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!pattern.test(normalized)) throw new QuizInputError(`${label} no es válido.`);
  return normalized;
}

function boundedText(value, label, limit, required = true) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (required && !normalized) throw new QuizInputError(`${label} es obligatorio.`);
  if (normalized.length > limit) {
    throw new QuizInputError(`${label} supera el máximo de ${limit} caracteres.`);
  }
  return normalized;
}

function questionKind(value) {
  if (typeof value !== "string" || !QUESTION_KINDS.has(value)) {
    throw new QuizInputError("El tipo de pregunta no es compatible.");
  }
  return value;
}

function normalizeOptions(value, kind) {
  if (!Array.isArray(value)) throw new QuizInputError("Las alternativas no son válidas.");
  if (kind === "short_answer" || kind === "numerical") {
    if (value.length !== 0)
      throw new QuizInputError("Este tipo de pregunta no admite alternativas.");
    return [];
  }
  if (value.length < 2 || value.length > MAX_QUIZ_OPTIONS) {
    throw new QuizInputError(`La pregunta admite entre 2 y ${MAX_QUIZ_OPTIONS} alternativas.`);
  }
  const ids = new Set();
  return value.map((rawOption) => {
    const option = inputRecord(rawOption, "La alternativa");
    const id = identifier(option.id, "El identificador de alternativa");
    if (ids.has(id)) throw new QuizInputError("La pregunta repite una alternativa.");
    ids.add(id);
    return { id, label: boundedText(option.label, "El texto de alternativa", 1000) };
  });
}

function normalizeQuestion(value) {
  const question = inputRecord(value, "La pregunta");
  const kind = questionKind(question.kind);
  const points = Number(question.points);
  if (!Number.isFinite(points) || points <= 0 || points > 100) {
    throw new QuizInputError("El puntaje de la pregunta debe estar entre 0 y 100.");
  }
  return {
    id: identifier(question.id, "El identificador de pregunta"),
    title: boundedText(question.title, "El título de pregunta", 160),
    prompt: boundedText(question.prompt, "El enunciado", 3000),
    kind,
    options: normalizeOptions(question.options, kind),
    points,
  };
}

function normalizeAnswer(value, question) {
  const answer = inputRecord(value, "La pauta");
  const questionId = identifier(answer.questionId, "La pregunta de la pauta");
  const kind = questionKind(answer.kind);
  if (questionId !== question.id || kind !== question.kind) {
    throw new QuizInputError("La pauta no coincide con su pregunta.");
  }
  const feedback = boundedText(answer.feedback, "La retroalimentación", 1000, false);
  const normalized = {
    questionId,
    kind,
    acceptedAnswers: [],
    correctOptionId: null,
    numericalAnswer: null,
    tolerance: 0,
    feedback,
  };
  if (kind === "single_choice" || kind === "true_false") {
    const correctOptionId = identifier(answer.correctOptionId, "La alternativa correcta");
    if (!question.options.some((option) => option.id === correctOptionId)) {
      throw new QuizInputError("La alternativa correcta no existe en la pregunta.");
    }
    normalized.correctOptionId = correctOptionId;
    return normalized;
  }
  if (kind === "short_answer") {
    if (!Array.isArray(answer.acceptedAnswers) || answer.acceptedAnswers.length === 0) {
      throw new QuizInputError("La respuesta corta necesita al menos una respuesta aceptada.");
    }
    normalized.acceptedAnswers = [
      ...new Set(
        answer.acceptedAnswers.map((item) =>
          boundedText(item, "La respuesta aceptada", 500).toLocaleLowerCase("es-CL")
        )
      ),
    ];
    return normalized;
  }
  const numericalAnswer = Number(answer.numericalAnswer);
  const tolerance = Number(answer.tolerance);
  if (!Number.isFinite(numericalAnswer) || !Number.isFinite(tolerance) || tolerance < 0) {
    throw new QuizInputError("La respuesta numérica o su tolerancia no es válida.");
  }
  normalized.numericalAnswer = numericalAnswer;
  normalized.tolerance = tolerance;
  return normalized;
}

function normalizePublishRequest(value) {
  const record = inputRecord(value, "La solicitud");
  const courseId = identifier(record.courseId, "La sección", COURSE_ID_PATTERN);
  const title = boundedText(record.title, "El título", 160);
  const description = boundedText(record.description, "La descripción", 1000, false);
  const gradeItemId = identifier(record.gradeItemId, "El ítem del libro de notas");
  const durationMinutes = Number(record.durationMinutes);
  if (
    !Number.isInteger(durationMinutes) ||
    durationMinutes < 1 ||
    durationMinutes > MAX_QUIZ_DURATION_MINUTES
  ) {
    throw new QuizInputError(
      `La duración debe estar entre 1 y ${MAX_QUIZ_DURATION_MINUTES} minutos.`
    );
  }
  if (
    !Array.isArray(record.questions) ||
    record.questions.length === 0 ||
    record.questions.length > MAX_QUIZ_QUESTIONS
  ) {
    throw new QuizInputError(`El cuestionario admite entre 1 y ${MAX_QUIZ_QUESTIONS} preguntas.`);
  }
  const ids = new Set();
  const questions = [];
  const answers = [];
  for (const rawEntry of record.questions) {
    const entry = inputRecord(rawEntry, "La entrada importada");
    const question = normalizeQuestion(entry.question);
    if (ids.has(question.id)) throw new QuizInputError("El cuestionario repite una pregunta.");
    ids.add(question.id);
    questions.push(question);
    answers.push(normalizeAnswer(entry.answer, question));
  }
  return {
    courseId,
    title,
    description,
    gradeItemId,
    durationMinutes,
    questions,
    answers,
    totalPoints: questions.reduce((total, question) => total + question.points, 0),
  };
}

function normalizeQuizRequest(value) {
  const record = inputRecord(value, "La solicitud");
  return {
    courseId: identifier(record.courseId, "La sección", COURSE_ID_PATTERN),
    quizId: identifier(record.quizId, "El cuestionario"),
  };
}

function normalizedAnswers(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const entries = Object.entries(value);
  if (entries.length > MAX_QUIZ_QUESTIONS) {
    throw new QuizInputError("El intento contiene más respuestas que preguntas permitidas.");
  }
  const answers = {};
  for (const [rawId, rawValue] of entries) {
    const id = identifier(rawId, "El identificador de respuesta");
    if (typeof rawValue === "string") answers[id] = rawValue.trim().slice(0, 1000);
    else if (typeof rawValue === "number" && Number.isFinite(rawValue)) answers[id] = rawValue;
  }
  return answers;
}

function scoreQuizAnswers(rawQuestions, rawKeys, rawAnswers) {
  if (!Array.isArray(rawQuestions) || !Array.isArray(rawKeys)) {
    throw new QuizInputError("El cuestionario almacenado no es válido.");
  }
  if (rawQuestions.length === 0 || rawQuestions.length !== rawKeys.length) {
    throw new QuizInputError("La pauta almacenada no coincide con el cuestionario.");
  }
  const answers = normalizedAnswers(rawAnswers);
  const corrections = [];
  let earnedPoints = 0;
  let totalPoints = 0;
  rawQuestions.forEach((rawQuestion, index) => {
    const question = normalizeQuestion(rawQuestion);
    const key = normalizeAnswer(rawKeys[index], question);
    const submitted = answers[question.id];
    let correct = false;
    let correctAnswer = "";
    if (question.kind === "single_choice" || question.kind === "true_false") {
      correct = typeof submitted === "string" && submitted === key.correctOptionId;
      correctAnswer =
        question.options.find((option) => option.id === key.correctOptionId)?.label ?? "";
    } else if (question.kind === "short_answer") {
      const normalized =
        typeof submitted === "string" ? submitted.trim().toLocaleLowerCase("es-CL") : "";
      correct = normalized !== "" && key.acceptedAnswers.includes(normalized);
      correctAnswer = key.acceptedAnswers.join(" / ");
    } else {
      const numeric =
        typeof submitted === "number"
          ? submitted
          : typeof submitted === "string" && submitted.trim() !== ""
            ? Number(submitted.trim().replace(",", "."))
            : Number.NaN;
      correct =
        Number.isFinite(numeric) &&
        Math.abs(numeric - key.numericalAnswer) <= key.tolerance + Number.EPSILON;
      correctAnswer = String(key.numericalAnswer).replace(".", ",");
      if (key.tolerance > 0) correctAnswer += ` ± ${String(key.tolerance).replace(".", ",")}`;
    }
    totalPoints += question.points;
    if (correct) earnedPoints += question.points;
    corrections.push({
      questionId: question.id,
      correct,
      earnedPoints: correct ? question.points : 0,
      correctAnswer,
      feedback: key.feedback,
    });
  });
  const grade = gradeFromPoints(earnedPoints, totalPoints);
  if (grade === null) throw new QuizInputError("No fue posible convertir el puntaje a nota.");
  return { earnedPoints, totalPoints, grade, corrections };
}

module.exports = {
  MAX_QUIZ_DURATION_MINUTES,
  MAX_QUIZ_OPTIONS,
  MAX_QUIZ_QUESTIONS,
  QUIZ_REQUIREMENTS,
  QuizInputError,
  normalizePublishRequest,
  normalizeQuizRequest,
  scoreQuizAnswers,
};
