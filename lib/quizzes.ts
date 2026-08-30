export const QUIZ_REQUIREMENTS = [
  "REQ-QUIZ-01",
  "REQ-QUIZ-02",
  "REQ-QUIZ-03",
  "REQ-QUIZ-04",
  "REQ-QUIZ-05",
  "REQ-QUIZ-06",
  "REQ-QUIZ-07",
  "REQ-QUIZ-08",
  "REQ-QUIZ-09",
  "REQ-QUIZ-10",
] as const;

export const MAX_QUIZ_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_IMPORTED_QUESTIONS = 500;
export const MAX_QUIZ_QUESTIONS = 50;
export const MAX_QUIZ_OPTIONS = 10;
export const MAX_QUIZ_DURATION_MINUTES = 180;

export type QuizQuestionKind = "single_choice" | "true_false" | "short_answer" | "numerical";

export type QuizOption = {
  id: string;
  label: string;
};

export type QuizQuestion = {
  id: string;
  title: string;
  prompt: string;
  kind: QuizQuestionKind;
  options: QuizOption[];
  points: number;
};

export type QuizAnswerKey = {
  questionId: string;
  kind: QuizQuestionKind;
  acceptedAnswers: string[];
  correctOptionId: string | null;
  numericalAnswer: number | null;
  tolerance: number;
  feedback: string;
};

export type ImportedQuizQuestion = {
  sourceLine: number;
  question: QuizQuestion;
  answer: QuizAnswerKey;
};

export type QuizImportWarning = {
  sourceLine: number;
  message: string;
};

export type QuizImportResult = {
  questions: ImportedQuizQuestion[];
  warnings: QuizImportWarning[];
};

export type QuizDefinition = {
  id: string;
  courseId: string;
  title: string;
  description: string;
  durationMinutes: number;
  gradeItemId: string;
  status: "published";
  questions: QuizQuestion[];
  totalPoints: number;
  createdBy: string;
  createdAt: string;
};

export type QuizCorrection = {
  questionId: string;
  correct: boolean;
  earnedPoints: number;
  correctAnswer: string;
  feedback: string;
};

export type QuizResult = {
  quizId: string;
  userId: string;
  earnedPoints: number;
  totalPoints: number;
  grade: number;
  corrections: QuizCorrection[];
  submittedAt: string;
};

export type QuizAttempt = {
  quizId: string;
  userId: string;
  answers: Record<string, string | number>;
  startedAt: string;
  expiresAt: string;
  submittedAt: string | null;
};

type GiftToken = { marker: "=" | "~"; value: string; feedback: string };

export function parseQuestionBank(source: string, format: "gift" | "csv"): QuizImportResult {
  if (typeof source !== "string" || source.trim().length === 0) {
    return { questions: [], warnings: [{ sourceLine: 1, message: "El archivo está vacío." }] };
  }
  return format === "gift" ? parseGift(source) : parseQuizCsv(source);
}

export function parseGift(source: string): QuizImportResult {
  const questions: ImportedQuizQuestion[] = [];
  const warnings: QuizImportWarning[] = [];
  const blocks = giftBlocks(source.replace(/^\uFEFF/, ""));
  for (const block of blocks) {
    if (questions.length >= MAX_IMPORTED_QUESTIONS) {
      warnings.push({
        sourceLine: block.line,
        message: `La importación se detuvo en ${MAX_IMPORTED_QUESTIONS} preguntas.`,
      });
      break;
    }
    try {
      const imported = parseGiftBlock(block.text, questions.length, block.line);
      if (imported) questions.push(imported);
    } catch (cause) {
      warnings.push({
        sourceLine: block.line,
        message: cause instanceof Error ? cause.message : "La pregunta GIFT no es válida.",
      });
    }
  }
  return { questions, warnings };
}

export function parseQuizCsv(source: string): QuizImportResult {
  const rows = csvRows(source.replace(/^\uFEFF/, ""));
  if (rows.length === 0) return { questions: [], warnings: [] };
  const headers = rows[0].values.map(normalizeHeader);
  const questions: ImportedQuizQuestion[] = [];
  const warnings: QuizImportWarning[] = [];
  for (const row of rows.slice(1)) {
    if (row.values.every((value) => value.trim() === "")) continue;
    if (questions.length >= MAX_IMPORTED_QUESTIONS) {
      warnings.push({
        sourceLine: row.line,
        message: `La importación se detuvo en ${MAX_IMPORTED_QUESTIONS} preguntas.`,
      });
      break;
    }
    const record = Object.fromEntries(
      headers.map((header, index) => [header, row.values[index] ?? ""])
    );
    try {
      questions.push(parseCsvRecord(record, questions.length, row.line));
    } catch (cause) {
      warnings.push({
        sourceLine: row.line,
        message: cause instanceof Error ? cause.message : "La fila CSV no es válida.",
      });
    }
  }
  return { questions, warnings };
}

function giftBlocks(source: string): { text: string; line: number }[] {
  const blocks: { text: string; line: number }[] = [];
  let text = "";
  let startLine = 1;
  let depth = 0;
  let escaped = false;
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const flush = () => {
    const normalized = text.trim();
    if (normalized && !normalized.startsWith("$CATEGORY:")) {
      blocks.push({ text: normalized, line: startLine });
    }
    text = "";
  };
  lines.forEach((line, index) => {
    if (!text && (!line.trim() || line.trim().startsWith("//"))) return;
    if (line.trim().startsWith("//") && depth === 0) {
      flush();
      return;
    }
    if (!text) startLine = index + 1;
    if (!line.trim() && depth === 0) {
      flush();
      return;
    }
    text += `${text ? "\n" : ""}${line}`;
    for (const character of line) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === "\\") {
        escaped = true;
        continue;
      }
      if (character === "{") depth += 1;
      if (character === "}") depth = Math.max(0, depth - 1);
    }
  });
  flush();
  return blocks;
}

function parseGiftBlock(
  text: string,
  index: number,
  sourceLine: number
): ImportedQuizQuestion | null {
  const bounds = answerBounds(text);
  if (!bounds) throw new Error("No se encontró una pauta entre llaves.");
  const trailing = text.slice(bounds.close + 1).trim();
  if (trailing) throw new Error("Hay contenido inesperado después de la pauta.");
  let prompt = text.slice(0, bounds.open).trim();
  let title = `Pregunta ${index + 1}`;
  const titleMatch = prompt.match(/^::((?:\\[\s\S]|[^:\\])+)::/);
  if (titleMatch) {
    title = unescapeGift(titleMatch[1]).trim() || title;
    prompt = prompt.slice(titleMatch[0].length).trim();
  }
  prompt = prompt.replace(/^\[(?:html|markdown|moodle|plain)\]\s*/i, "");
  if (!prompt) throw new Error("La pregunta no tiene enunciado.");
  if (bounds.body.trim() === "") throw new Error("Las preguntas de ensayo no son compatibles.");
  const id = `q-${index + 1}`;
  const base = { id, title: cleanText(title, 160), prompt: cleanText(prompt, 3_000), points: 1 };
  const truth = bounds.body.trim().match(/^(TRUE|T|FALSE|F)(?:#([\s\S]*))?$/i);
  if (truth) {
    const correct = /^(TRUE|T)$/i.test(truth[1]) ? "true" : "false";
    return importedQuestion(
      sourceLine,
      { ...base, kind: "true_false", options: truthOptions(id) },
      {
        questionId: id,
        kind: "true_false",
        acceptedAnswers: [],
        correctOptionId: correct,
        numericalAnswer: null,
        tolerance: 0,
        feedback: cleanText(unescapeGift(truth[2] ?? ""), 1_000),
      }
    );
  }
  if (bounds.body.trim().startsWith("#")) {
    const [numericPart, feedback = ""] = splitUnescaped(bounds.body.trim().slice(1), "#");
    const [answerValue, toleranceValue = "0"] = numericPart.split(":", 2);
    const numericalAnswer = Number(answerValue.trim().replace(",", "."));
    const tolerance = Number(toleranceValue.trim().replace(",", "."));
    if (!Number.isFinite(numericalAnswer) || !Number.isFinite(tolerance) || tolerance < 0) {
      throw new Error("La respuesta numérica o su tolerancia no es válida.");
    }
    return importedQuestion(
      sourceLine,
      { ...base, kind: "numerical", options: [] },
      {
        questionId: id,
        kind: "numerical",
        acceptedAnswers: [],
        correctOptionId: null,
        numericalAnswer,
        tolerance,
        feedback: cleanText(unescapeGift(feedback), 1_000),
      }
    );
  }
  const tokens = giftTokens(bounds.body);
  if (tokens.length === 0) throw new Error("La pauta no contiene respuestas compatibles.");
  if (tokens.some((token) => token.value.includes("->"))) {
    throw new Error("Las preguntas de asociación no son compatibles.");
  }
  const incorrect = tokens.filter((token) => token.marker === "~");
  const correct = tokens.filter((token) => token.marker === "=");
  if (correct.length === 0) throw new Error("La pauta no incluye una respuesta correcta.");
  if (incorrect.length === 0) {
    return importedQuestion(
      sourceLine,
      { ...base, kind: "short_answer", options: [] },
      {
        questionId: id,
        kind: "short_answer",
        acceptedAnswers: correct.map((token) => cleanText(unescapeGift(token.value), 500)),
        correctOptionId: null,
        numericalAnswer: null,
        tolerance: 0,
        feedback: cleanText(unescapeGift(correct[0].feedback), 1_000),
      }
    );
  }
  if (correct.length !== 1)
    throw new Error("La alternativa múltiple con más de una correcta no es compatible.");
  if (tokens.length > MAX_QUIZ_OPTIONS) {
    throw new Error(`Una pregunta admite hasta ${MAX_QUIZ_OPTIONS} alternativas.`);
  }
  const options = tokens.map((token, optionIndex) => ({
    id: `${id}-o-${optionIndex + 1}`,
    label: cleanText(unescapeGift(token.value), 1_000),
  }));
  const correctIndex = tokens.indexOf(correct[0]);
  return importedQuestion(
    sourceLine,
    { ...base, kind: "single_choice", options },
    {
      questionId: id,
      kind: "single_choice",
      acceptedAnswers: [],
      correctOptionId: options[correctIndex].id,
      numericalAnswer: null,
      tolerance: 0,
      feedback: cleanText(unescapeGift(correct[0].feedback), 1_000),
    }
  );
}

function answerBounds(text: string): { open: number; close: number; body: string } | null {
  let open = -1;
  let escaped = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      continue;
    }
    if (character === "{" && open === -1) open = index;
    else if (character === "}" && open !== -1) {
      return { open, close: index, body: text.slice(open + 1, index) };
    }
  }
  return null;
}

function giftTokens(body: string): GiftToken[] {
  const tokens: { marker: "=" | "~"; raw: string }[] = [];
  let marker: "=" | "~" | null = null;
  let raw = "";
  let escaped = false;
  const flush = () => {
    if (marker && raw.trim()) tokens.push({ marker, raw: raw.trim() });
    raw = "";
  };
  for (const character of body) {
    if (escaped) {
      raw += `\\${character}`;
      escaped = false;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      continue;
    }
    if (character === "=" || character === "~") {
      flush();
      marker = character;
      continue;
    }
    raw += character;
  }
  flush();
  return tokens.map((token) => {
    if (/^%[^%]+%/.test(token.raw)) {
      const weight = token.raw.match(/^%([^%]+)%/)?.[1];
      if (weight !== "100" && weight !== "0") {
        throw new Error("Las ponderaciones parciales de GIFT no son compatibles.");
      }
      token.raw = token.raw.replace(/^%[^%]+%/, "");
    }
    const [value, feedback = ""] = splitUnescaped(token.raw, "#");
    return { marker: token.marker, value: value.trim(), feedback: feedback.trim() };
  });
}

function parseCsvRecord(
  record: Record<string, string>,
  index: number,
  sourceLine: number
): ImportedQuizQuestion {
  const id = `q-${index + 1}`;
  const kind = csvKind(field(record, "type", "tipo"));
  const prompt = cleanText(field(record, "prompt", "question", "pregunta", "enunciado"), 3_000);
  const title = cleanText(field(record, "title", "titulo") || `Pregunta ${index + 1}`, 160);
  const correct = field(record, "correct_answer", "respuesta_correcta", "answer", "respuesta");
  const feedback = cleanText(field(record, "feedback", "retroalimentacion"), 1_000);
  if (!prompt) throw new Error("La fila no tiene enunciado.");
  if (!correct) throw new Error("La fila no tiene respuesta correcta.");
  const base = { id, title, prompt, points: 1 };
  if (kind === "true_false") {
    const truth = parseTruth(correct);
    return importedQuestion(
      sourceLine,
      { ...base, kind, options: truthOptions(id) },
      emptyAnswer(id, kind, feedback, { correctOptionId: truth ? "true" : "false" })
    );
  }
  if (kind === "short_answer") {
    const acceptedAnswers = correct
      .split("|")
      .map((value) => cleanText(value, 500))
      .filter(Boolean);
    if (acceptedAnswers.length === 0) throw new Error("La respuesta corta está vacía.");
    return importedQuestion(
      sourceLine,
      { ...base, kind, options: [] },
      emptyAnswer(id, kind, feedback, { acceptedAnswers })
    );
  }
  if (kind === "numerical") {
    const [answerText, toleranceText = "0"] = correct.split(":", 2);
    const numericalAnswer = Number(answerText.trim().replace(",", "."));
    const tolerance = Number(toleranceText.trim().replace(",", "."));
    if (!Number.isFinite(numericalAnswer) || !Number.isFinite(tolerance) || tolerance < 0) {
      throw new Error("La respuesta numérica o su tolerancia no es válida.");
    }
    return importedQuestion(
      sourceLine,
      { ...base, kind, options: [] },
      emptyAnswer(id, kind, feedback, { numericalAnswer, tolerance })
    );
  }
  const optionValues = csvOptions(record);
  if (optionValues.length < 2)
    throw new Error("La alternativa única necesita al menos dos opciones.");
  if (optionValues.length > MAX_QUIZ_OPTIONS) {
    throw new Error(`Una pregunta admite hasta ${MAX_QUIZ_OPTIONS} alternativas.`);
  }
  const options = optionValues.map((label, optionIndex) => ({
    id: `${id}-o-${optionIndex + 1}`,
    label: cleanText(label, 1_000),
  }));
  const correctIndex = csvCorrectIndex(correct, optionValues);
  if (correctIndex < 0) throw new Error("La respuesta correcta no coincide con las alternativas.");
  return importedQuestion(
    sourceLine,
    { ...base, kind, options },
    emptyAnswer(id, kind, feedback, { correctOptionId: options[correctIndex].id })
  );
}

function csvRows(source: string): { values: string[]; line: number }[] {
  const firstLine = source.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = delimiterCount(firstLine, ";") > delimiterCount(firstLine, ",") ? ";" : ",";
  const rows: { values: string[]; line: number }[] = [];
  let values: string[] = [];
  let value = "";
  let quoted = false;
  let line = 1;
  let rowLine = 1;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted && character === '"' && source[index + 1] === '"') {
      value += '"';
      index += 1;
      continue;
    }
    if (character === '"') {
      quoted = !quoted;
      continue;
    }
    if (!quoted && character === delimiter) {
      values.push(value);
      value = "";
      continue;
    }
    if (!quoted && (character === "\n" || character === "\r")) {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      values.push(value);
      rows.push({ values, line: rowLine });
      values = [];
      value = "";
      line += 1;
      rowLine = line;
      continue;
    }
    if (character === "\n") line += 1;
    value += character;
  }
  if (quoted) throw new Error("El CSV termina dentro de un campo entre comillas.");
  if (value || values.length > 0) {
    values.push(value);
    rows.push({ values, line: rowLine });
  }
  return rows;
}

function delimiterCount(value: string, delimiter: string) {
  let count = 0;
  let quoted = false;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === '"') quoted = !quoted;
    else if (!quoted && value[index] === delimiter) count += 1;
  }
  return count;
}

function normalizeHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function csvKind(value: string): QuizQuestionKind {
  const normalized = normalizeHeader(value);
  if (
    ["single_choice", "choice", "multiple_choice", "alternativa", "seleccion"].includes(normalized)
  ) {
    return "single_choice";
  }
  if (["true_false", "boolean", "verdadero_falso", "vf"].includes(normalized)) {
    return "true_false";
  }
  if (["short_answer", "short", "respuesta_corta", "texto"].includes(normalized)) {
    return "short_answer";
  }
  if (["numerical", "numeric", "numero", "numerica"].includes(normalized)) return "numerical";
  throw new Error(`El tipo “${value || "vacío"}” no es compatible.`);
}

function csvOptions(record: Record<string, string>) {
  const packed = field(record, "options", "opciones");
  if (packed)
    return packed
      .split("|")
      .map((value) => value.trim())
      .filter(Boolean);
  const values: string[] = [];
  for (let index = 1; index <= MAX_QUIZ_OPTIONS; index += 1) {
    const value = field(record, `option_${index}`, `opcion_${index}`);
    if (value) values.push(value);
  }
  return values;
}

function csvCorrectIndex(correct: string, options: string[]) {
  const normalized = correct.trim();
  if (/^\d+$/.test(normalized)) {
    const index = Number(normalized) - 1;
    if (index >= 0 && index < options.length) return index;
  }
  if (/^[A-Za-z]$/.test(normalized)) {
    const index = normalized.toUpperCase().charCodeAt(0) - 65;
    if (index >= 0 && index < options.length) return index;
  }
  return options.findIndex(
    (option) => option.trim().toLocaleLowerCase("es-CL") === normalized.toLocaleLowerCase("es-CL")
  );
}

function field(record: Record<string, string>, ...names: string[]) {
  for (const name of names) {
    const value = record[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function parseTruth(value: string) {
  const normalized = normalizeHeader(value);
  if (["true", "t", "verdadero", "v", "1"].includes(normalized)) return true;
  if (["false", "f", "falso", "0"].includes(normalized)) return false;
  throw new Error("La respuesta verdadero/falso no es válida.");
}

function truthOptions(questionId: string): QuizOption[] {
  return [
    { id: "true", label: "Verdadero" },
    { id: "false", label: "Falso" },
  ].map((option) => ({ ...option, id: option.id || `${questionId}-${option.label}` }));
}

function emptyAnswer(
  questionId: string,
  kind: QuizQuestionKind,
  feedback: string,
  overrides: Partial<QuizAnswerKey>
): QuizAnswerKey {
  return {
    questionId,
    kind,
    acceptedAnswers: [],
    correctOptionId: null,
    numericalAnswer: null,
    tolerance: 0,
    feedback,
    ...overrides,
  };
}

function importedQuestion(
  sourceLine: number,
  question: QuizQuestion,
  answer: QuizAnswerKey
): ImportedQuizQuestion {
  return { sourceLine, question, answer };
}

function splitUnescaped(value: string, separator: string): [string, string?] {
  let escaped = false;
  for (let index = 0; index < value.length; index += 1) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (value[index] === "\\") {
      escaped = true;
      continue;
    }
    if (value[index] === separator) return [value.slice(0, index), value.slice(index + 1)];
  }
  return [value];
}

function unescapeGift(value: string) {
  return value.replace(/\\([~=#{}:\\])/g, "$1").replace(/\\n/g, "\n");
}

function cleanText(value: string, limit: number) {
  return value.replace(/\r\n?/g, "\n").trim().slice(0, limit);
}
