"use strict";

const MIN_GRADE = 1;
const MAX_GRADE = 7;
const MAX_ROWS_PER_REQUEST = 100;
const MAX_SCORE_KEYS = 100;
const MAX_FEEDBACK_LENGTH = 2000;
const MAX_CONCURRENT_TRANSACTIONS = 10;
const COURSE_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,60}$/;
const ENTITY_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const STORAGE_PATH_PATTERN = /^[A-Za-z0-9][A-Za-z0-9/._-]{0,511}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

// Espejo de `SUBMISSION_MODES` y sus techos en lib/grades.ts.
const SUBMISSION_MODES = ["individual", "team_free", "team_fixed"];
const MAX_TEAM_MEMBERS = 8;
const MAX_TEAMS_PER_ITEM = 120;
const MAX_SUBMISSION_BYTES = 25 * 1024 * 1024;

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

function feedbackValue(value) {
  if (typeof value !== "string" || value.length > MAX_FEEDBACK_LENGTH) {
    throw new GradeAuditInputError(
      `La retroalimentación debe tener como máximo ${MAX_FEEDBACK_LENGTH.toLocaleString("es-CL")} caracteres.`
    );
  }
  return value.trim() || null;
}

function storedFeedbackMap(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const feedback = {};
  for (const [rawId, rawText] of Object.entries(value).slice(0, MAX_SCORE_KEYS)) {
    if (!ENTITY_ID_PATTERN.test(rawId) || typeof rawText !== "string") continue;
    const text = rawText.trim().slice(0, MAX_FEEDBACK_LENGTH);
    if (text) feedback[rawId] = text;
  }
  return feedback;
}

function diffFeedback(previous, gradeItemId, nextValue) {
  const previousValue = Object.hasOwn(previous, gradeItemId) ? previous[gradeItemId] : null;
  return previousValue === nextValue ? null : { previousValue, newValue: nextValue };
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

/*
  Comprobante de una entrega en equipo. El archivo ya está en Cloud Storage
  cuando llega esta solicitud: lo que se valida aquí es el recibo que se
  replicará a cada integrante.
*/
// Implements: REQ-TEAM-02, REQ-TEAM-03
function normalizeTeamSubmissionRequest(value) {
  const record = inputRecord(value, "La solicitud");
  const memberIds = Array.isArray(record.memberIds)
    ? [...new Set(record.memberIds.map((member) => identifier(member, "El integrante")))]
    : [];
  if (memberIds.length < 2 || memberIds.length > MAX_TEAM_MEMBERS) {
    throw new GradeAuditInputError(
      `Una entrega en equipo debe tener entre 2 y ${MAX_TEAM_MEMBERS} integrantes.`
    );
  }
  const storagePath = typeof record.storagePath === "string" ? record.storagePath.trim() : "";
  if (!STORAGE_PATH_PATTERN.test(storagePath)) {
    throw new GradeAuditInputError("La ruta del archivo entregado no es válida.");
  }
  const size = record.size;
  if (
    typeof size !== "number" ||
    !Number.isInteger(size) ||
    size <= 0 ||
    size > MAX_SUBMISSION_BYTES
  ) {
    throw new GradeAuditInputError("El tamaño de la entrega no es válido.");
  }
  const sha256 = typeof record.sha256 === "string" ? record.sha256.trim().toLowerCase() : "";
  /* La huella puede faltar en un navegador sin `crypto.subtle`; lo que no se
     acepta es una cadena que finja ser una huella sin serlo. */
  if (sha256 && !SHA256_PATTERN.test(sha256)) {
    throw new GradeAuditInputError("La huella del archivo entregado no es válida.");
  }
  const fileName = typeof record.fileName === "string" ? record.fileName.trim().slice(0, 200) : "";
  if (!fileName) throw new GradeAuditInputError("La entrega debe tener nombre de archivo.");
  return {
    courseId: identifier(record.courseId, "La sección", COURSE_ID_PATTERN),
    evalId: identifier(record.evalId, "El identificador de evaluación"),
    teamId: identifier(record.teamId, "El identificador de equipo"),
    memberIds,
    fileName,
    storagePath,
    contentType:
      typeof record.contentType === "string" && record.contentType.trim()
        ? record.contentType.trim().slice(0, 160)
        : "application/octet-stream",
    size,
    sha256,
  };
}

/*
  Reparte las filas de notas en grupos que deben confirmarse juntos.

  Una evaluación grupal exige que la nota llegue a todo el equipo o a nadie: si
  la escritura se corta a la mitad, dos integrantes del mismo trabajo quedan con
  notas distintas y el libro deja de ser auditable. Esta función expande cada
  fila hacia los compañeros de equipo de cada evaluación y luego une en un mismo
  grupo a todo estudiante enlazado por algún equipo, de modo que cada expediente
  se escriba exactamente una vez y cada grupo quepa en una sola transacción.

  Sólo se replican las evaluaciones que `teamsByItem` declara grupales. Las
  individuales viajan en la misma fila y no salen de ella.
*/
// Implements: REQ-TEAM-02, REQ-AUDIT-01
function groupRowsByTeam(rows, teamsByItem) {
  const parent = new Map();
  const find = (userId) => {
    if (!parent.has(userId)) parent.set(userId, userId);
    let root = userId;
    while (parent.get(root) !== root) root = parent.get(root);
    let cursor = userId;
    while (parent.get(cursor) !== cursor) {
      const next = parent.get(cursor);
      parent.set(cursor, root);
      cursor = next;
    }
    return root;
  };
  const union = (left, right) => {
    const a = find(left);
    const b = find(right);
    if (a !== b) parent.set(b, a);
  };

  const explicit = new Set(rows.map((row) => row.userId));
  const scoresByUser = new Map(rows.map((row) => [row.userId, { ...row.scores }]));
  const clearByUser = new Map();
  for (const userId of scoresByUser.keys()) find(userId);

  const teamFor = (gradeItemId, userId) => {
    const teams = teamsByItem.get(gradeItemId);
    if (!teams) return null;
    return teams.find((members) => members.includes(userId)) ?? null;
  };

  for (const row of rows) {
    /*
      Se recorren las evaluaciones grupales y no las notas enviadas: una nota
      grupal retirada llega como la ausencia de esa clave en la fila del
      estudiante abierto, y si sólo se miraran las presentes el equipo
      conservaría una nota que el docente ya borró.
    */
    for (const gradeItemId of teamsByItem.keys()) {
      const members = teamFor(gradeItemId, row.userId);
      if (!members) continue;
      const scored = Object.hasOwn(row.scores, gradeItemId);
      for (const memberId of members) {
        union(row.userId, memberId);
        if (memberId === row.userId) continue;
        /* La fila que el docente envió para un integrante manda sobre el eco de
           su compañero: ya trae el estado completo que quiso dejar escrito. */
        if (explicit.has(memberId)) continue;
        const current = scoresByUser.get(memberId) ?? {};
        if (scored) {
          current[gradeItemId] = row.scores[gradeItemId];
          if (clearByUser.has(memberId)) clearByUser.get(memberId).delete(gradeItemId);
        } else {
          delete current[gradeItemId];
          if (!clearByUser.has(memberId)) clearByUser.set(memberId, new Set());
          clearByUser.get(memberId).add(gradeItemId);
        }
        scoresByUser.set(memberId, current);
      }
    }
  }

  const groups = new Map();
  for (const [userId, scores] of scoresByUser) {
    const root = find(userId);
    if (!groups.has(root)) groups.set(root, []);
    /*
      `partial` distingue las dos naturalezas de una fila. La que envió el
      cliente describe el expediente completo del estudiante y se escribe tal
      cual, como siempre. La que nació de una réplica sólo habla de las
      evaluaciones del equipo, así que la transacción debe fundirla con las
      notas que ese estudiante ya tenía: escribirla entera borraría el resto de
      su libro.
    */
    groups.get(root).push({
      userId,
      scores,
      clear: [...(clearByUser.get(userId) ?? [])],
      partial: !explicit.has(userId),
    });
  }
  return [...groups.values()];
}

/*
  Expediente resultante de una réplica: las notas previas del estudiante, con
  las evaluaciones del equipo puestas al día y las que el equipo perdió
  retiradas. Nunca toca una evaluación ajena al equipo.
*/
// Implements: REQ-TEAM-02
function mergeReplicatedScores(previousScores, row) {
  if (!row.partial) return row.scores;
  const merged = { ...previousScores, ...row.scores };
  for (const gradeItemId of row.clear ?? []) delete merged[gradeItemId];
  return merged;
}

function normalizeFeedbackRequest(value) {
  const record = inputRecord(value, "La solicitud");
  return {
    courseId: identifier(record.courseId, "La sección", COURSE_ID_PATTERN),
    userId: identifier(record.userId, "El identificador de estudiante"),
    gradeItemId: identifier(record.gradeItemId, "El identificador de evaluación"),
    feedback: feedbackValue(record.feedback),
  };
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
    const submissionMode = SUBMISSION_MODES.includes(item.submissionMode)
      ? item.submissionMode
      : "individual";
    return {
      id,
      name,
      weight,
      date,
      submissionMode,
      teams: submissionMode === "team_fixed" ? evaluationTeams(item.teams) : [],
    };
  });
}

/*
  Nómina de equipos de una evaluación. Se valida igual que en el cliente porque
  las reglas de Firestore no pueden mirar dentro de un arreglo: si un estudiante
  quedara en dos equipos de la misma evaluación, la réplica de la nota escribiría
  dos veces sobre su fila del libro y una de las dos ganaría en silencio.
*/
// Implements: REQ-TEAM-01, REQ-TEAM-02
function evaluationTeams(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > MAX_TEAMS_PER_ITEM) {
    throw new GradeAuditInputError(
      `Una evaluación admite entre 0 y ${MAX_TEAMS_PER_ITEM} equipos.`
    );
  }
  const seenIds = new Set();
  const assigned = new Set();
  return value.map((rawTeam, index) => {
    const team = inputRecord(rawTeam, "El equipo");
    const id = identifier(team.id, "El identificador de equipo");
    if (seenIds.has(id)) throw new GradeAuditInputError("La evaluación repite un equipo.");
    seenIds.add(id);
    const name = typeof team.name === "string" ? team.name.trim().slice(0, 120) : "";
    if (!name) throw new GradeAuditInputError("Cada equipo debe tener nombre.");
    if (!Array.isArray(team.memberIds)) {
      throw new GradeAuditInputError(`El equipo «${name}» no tiene una lista de integrantes.`);
    }
    const memberIds = team.memberIds.map((member) =>
      identifier(member, "El identificador de integrante")
    );
    if (memberIds.length < 2 || memberIds.length > MAX_TEAM_MEMBERS) {
      throw new GradeAuditInputError(
        `El equipo «${name}» debe tener entre 2 y ${MAX_TEAM_MEMBERS} integrantes.`
      );
    }
    for (const memberId of memberIds) {
      if (assigned.has(memberId)) {
        throw new GradeAuditInputError(
          "Un estudiante no puede pertenecer a dos equipos de la misma evaluación."
        );
      }
      assigned.add(memberId);
    }
    return { id: id || `team-${index + 1}`, name, memberIds };
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
  MAX_TEAM_MEMBERS,
  GradeAuditInputError,
  actorFromAuth,
  canEditSection,
  diffFeedback,
  diffScores,
  groupRowsByTeam,
  mergeReplicatedScores,
  normalizeFeedbackRequest,
  normalizeGradebookRequest,
  normalizeScoreRequest,
  normalizeTeamSubmissionRequest,
  storedFeedbackMap,
  storedGradebook,
  storedScoreMap,
};
