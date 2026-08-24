"use strict";

const MIN_GRADE = 1;
const MAX_GRADE = 7;
const MAX_ROWS_PER_REQUEST = 100;
const MAX_SCORE_KEYS = 100;
const MAX_CONCURRENT_TRANSACTIONS = 10;
const COURSE_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,60}$/;
const ENTITY_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

class GradeAuditInputError extends Error {}

function inputRecord(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new GradeAuditInputError(`${label} no tiene un formato válido.`);
  }
  return value;
}

function identifier(value, label, pattern = ENTITY_ID_PATTERN) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!pattern.test(normalized)) {
    throw new GradeAuditInputError(`${label} no es válido.`);
  }
  return normalized;
}

function grade(value, nullable = false) {
  if (nullable && value === null) return null;
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < MIN_GRADE ||
    value > MAX_GRADE
  ) {
    throw new GradeAuditInputError("Cada nota debe ser un número entre 1,0 y 7,0.");
  }
  return value;
}

function scoreMap(value) {
  const record = inputRecord(value, "La lista de notas");
  const entries = Object.entries(record);
  if (entries.length > MAX_SCORE_KEYS) {
    throw new GradeAuditInputError(`Una fila admite como máximo ${MAX_SCORE_KEYS} evaluaciones.`);
  }
  const scores = {};
  for (const [rawId, rawScore] of entries) {
    const gradeItemId = identifier(rawId, "El identificador de evaluación");
    scores[gradeItemId] = grade(rawScore);
  }
  return scores;
}

function storedScoreMap(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const scores = {};
  for (const [rawId, rawScore] of Object.entries(value)) {
    if (
      ENTITY_ID_PATTERN.test(rawId) &&
      typeof rawScore === "number" &&
      Number.isFinite(rawScore) &&
      rawScore >= MIN_GRADE &&
      rawScore <= MAX_GRADE
    ) {
      scores[rawId] = rawScore;
    }
  }
  return scores;
}

// Implements: REQ-AUDIT-01, REQ-AUDIT-06
function diffScores(previous, next) {
  const changes = [];
  const keys = [...new Set([...Object.keys(previous), ...Object.keys(next)])].sort();
  for (const gradeItemId of keys) {
    const previousValue = Object.hasOwn(previous, gradeItemId) ? previous[gradeItemId] : null;
    const newValue = Object.hasOwn(next, gradeItemId) ? next[gradeItemId] : null;
    if (previousValue !== newValue) changes.push({ gradeItemId, previousValue, newValue });
  }
  return changes;
}

// Implements: REQ-AUDIT-02
function actorFromAuth(auth) {
  const record = inputRecord(auth, "La sesión autenticada");
  const actorUid = identifier(record.uid, "La sesión autenticada");
  const token = record.token && typeof record.token === "object" ? record.token : {};
  const actorEmail =
    typeof token.email === "string" ? token.email.trim().toLowerCase().slice(0, 254) : "";
  const actorName = typeof token.name === "string" ? token.name.trim().slice(0, 160) : "";
  return { actorUid, actorEmail, actorName };
}

// Implements: REQ-AUDIT-04
function canEditSection(role, enrolled) {
  return role === "owner" || (role === "teacher" && enrolled === true);
}

// Implements: REQ-AUDIT-01, REQ-AUDIT-06
function normalizeScoreRequest(value) {
  const record = inputRecord(value, "La solicitud");
  const courseId = identifier(record.courseId, "La sección", COURSE_ID_PATTERN);
  if (!Array.isArray(record.rows) || record.rows.length === 0) {
    throw new GradeAuditInputError("La solicitud debe incluir al menos un estudiante.");
  }
  if (record.rows.length > MAX_ROWS_PER_REQUEST) {
    throw new GradeAuditInputError(
      `Una solicitud admite como máximo ${MAX_ROWS_PER_REQUEST} estudiantes.`
    );
  }
  const seen = new Set();
  const rows = record.rows.map((rawRow) => {
    const row = inputRecord(rawRow, "La fila de notas");
    const userId = identifier(row.userId, "El identificador de estudiante");
    if (seen.has(userId)) throw new GradeAuditInputError("La solicitud repite un estudiante.");
    seen.add(userId);
    return { userId, scores: scoreMap(row.scores) };
  });
  return { courseId, rows };
}

function gradebookItems(value) {
  if (!Array.isArray(value) || value.length > MAX_SCORE_KEYS) {
    throw new GradeAuditInputError(`El libro admite entre 0 y ${MAX_SCORE_KEYS} evaluaciones.`);
  }
  const seen = new Set();
  return value.map((rawItem) => {
    const item = inputRecord(rawItem, "La evaluación");
    const id = identifier(item.id, "El identificador de evaluación");
    if (seen.has(id)) throw new GradeAuditInputError("El libro repite una evaluación.");
    seen.add(id);
    const name = typeof item.name === "string" ? item.name.trim().slice(0, 160) : "";
    if (!name) throw new GradeAuditInputError("Cada evaluación debe tener nombre.");
    const weight = item.weight;
    if (typeof weight !== "number" || !Number.isFinite(weight) || weight <= 0 || weight > 100) {
      throw new GradeAuditInputError(
        "Cada ponderación debe ser mayor que 0 y menor o igual a 100."
      );
    }
    const date = typeof item.date === "string" ? item.date.trim() : "";
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new GradeAuditInputError("La fecha de evaluación no es válida.");
    }
    return { id, name, weight, date };
  });
}

// Implements: REQ-AUDIT-07
function normalizeGradebookRequest(value) {
  const record = inputRecord(value, "La solicitud");
  return {
    courseId: identifier(record.courseId, "La sección", COURSE_ID_PATTERN),
    items: gradebookItems(record.items),
    exemption: grade(record.exemption, true),
  };
}

function storedGradebook(value) {
  if (!value || typeof value !== "object") return null;
  try {
    const normalized = normalizeGradebookRequest({
      courseId: "legacy-gradebook",
      items: value.items,
      exemption: value.exemption === undefined ? null : value.exemption,
    });
    return { items: normalized.items, exemption: normalized.exemption };
  } catch {
    return { items: [], exemption: null };
  }
}

module.exports = {
  MAX_CONCURRENT_TRANSACTIONS,
  MAX_ROWS_PER_REQUEST,
  GradeAuditInputError,
  actorFromAuth,
  canEditSection,
  diffScores,
  normalizeGradebookRequest,
  normalizeScoreRequest,
  storedGradebook,
  storedScoreMap,
};
