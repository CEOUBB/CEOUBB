import { createHash } from "node:crypto";
import Papa from "papaparse";
import { normalizeAccessEmail, roleForEmail } from "./access-policy.ts";

export const MAX_ENROLLMENT_CSV_BYTES = 5 * 1024 * 1024;
export const MAX_ENROLLMENT_ROWS = 12_000;
export const ENROLLMENT_PREVIEW_PAGE_SIZE = 50;
export const MAX_IMPORT_QUERY_SIZE = 100;

const MAX_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 254;
const EMAIL_HEADERS = new Set(["correo", "email", "correo_institucional"]);
const NAME_HEADERS = new Set(["nombre", "name", "nombre_completo"]);

export type EnrollmentImportErrorCode =
  | "invalid_request"
  | "unauthenticated"
  | "forbidden"
  | "section_not_found"
  | "period_closed"
  | "preview_changed"
  | "file_too_large"
  | "invalid_csv"
  | "projection_pending"
  | "internal_error";

export class EnrollmentImportError extends Error {
  readonly code: EnrollmentImportErrorCode;
  readonly status: number;

  constructor(code: EnrollmentImportErrorCode, message: string, status: number) {
    super(message);
    this.name = "EnrollmentImportError";
    this.code = code;
    this.status = status;
  }
}

export type ParsedEnrollmentRow = {
  row: number;
  name: string;
  email: string;
  error: string | null;
};

export type EnrollmentImportStatus =
  "activate" | "reactivate" | "pending" | "unchanged" | "invalid";

export type ClassifiedEnrollmentRow = {
  row: number;
  name: string;
  email: string;
  status: EnrollmentImportStatus;
  message: string;
  userId: string | null;
};

export type EnrollmentPreviewRow = Omit<ClassifiedEnrollmentRow, "userId">;

export type EnrollmentImportTotals = Record<EnrollmentImportStatus, number>;

export type EnrollmentImportPreview = {
  fingerprint: string;
  rows: EnrollmentPreviewRow[];
  totals: EnrollmentImportTotals;
  totalRows: number;
  page: number;
  pageSize: number;
  totalPages: number;
  canApply: boolean;
};

export type RegisteredImportUser = {
  id: string;
  email: string;
};

export type CurrentEnrollment = {
  userId: string;
  role: "teacher" | "student" | "assistant" | "coordinator";
  status: "activa" | "retirada" | "congelada";
};

export type EnrollmentImportState = {
  registeredUsers: RegisteredImportUser[];
  currentEnrollments: CurrentEnrollment[];
  pendingEmails: string[];
};

type CsvRecord = {
  line: number;
  values: string[];
};

export function parseEnrollmentCsv(csv: string): ParsedEnrollmentRow[] {
  if (typeof csv !== "string" || csv.trim().length === 0) {
    throw new EnrollmentImportError("invalid_csv", "El archivo CSV está vacío.", 422);
  }
  // Implements: REQ-PERF-03
  const byteLength =
    typeof Buffer !== "undefined" ? Buffer.byteLength(csv, "utf8") : new Blob([csv]).size;

  if (byteLength > MAX_ENROLLMENT_CSV_BYTES) {
    throw new EnrollmentImportError("file_too_large", "El archivo supera el máximo de 5 MiB.", 413);
  }

  const source = csv.replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(source);
  const parsed = Papa.parse<string[]>(source, { delimiter });

  const quoteErr = parsed.errors.find((err) => err.type === "Quotes");
  if (quoteErr) {
    const line =
      quoteErr.index !== undefined
        ? source.slice(0, quoteErr.index).split(/\r\n|\r|\n/).length
        : quoteErr.row !== undefined
          ? quoteErr.row + 1
          : 1;
    throw new EnrollmentImportError(
      "invalid_csv",
      `La fila ${line} tiene comillas mal formadas o texto fuera de lugar.`,
      422
    );
  }

  const rawData = parsed.data;
  if (rawData.length === 0) {
    throw new EnrollmentImportError("invalid_csv", "El archivo CSV no tiene cabecera.", 422);
  }

  const headerRow = rawData[0];
  if (!headerRow || !headerRow.some(validText)) {
    throw new EnrollmentImportError("invalid_csv", "El archivo CSV no tiene cabecera.", 422);
  }

  const newlinesInRow = (row: string[]) =>
    row.reduce((count, field) => count + (field.match(/\r\n|\r|\n/g)?.length ?? 0), 0);

  let currentLine = 1 + 1 + newlinesInRow(headerRow);
  const records: CsvRecord[] = [];

  for (const row of rawData.slice(1)) {
    const rowLine = currentLine;
    const hasText = row.some(validText);
    currentLine += 1 + newlinesInRow(row);
    if (hasText) {
      records.push({ line: rowLine, values: row });
    }
  }

  if (records.length > MAX_ENROLLMENT_ROWS) {
    throw new EnrollmentImportError(
      "file_too_large",
      `El archivo supera el máximo de ${MAX_ENROLLMENT_ROWS.toLocaleString("es-CL")} estudiantes.`,
      413
    );
  }

  const headers = headerRow.map(normalizeHeader);
  const emailIndex = headers.findIndex((value) => EMAIL_HEADERS.has(value));
  const nameIndex = headers.findIndex((value) => NAME_HEADERS.has(value));
  if (emailIndex < 0 || nameIndex < 0) {
    throw new EnrollmentImportError(
      "invalid_csv",
      "La cabecera debe incluir las columnas nombre y correo.",
      422
    );
  }

  const seenEmails = new Set<string>();
  return records.map((record) => {
    const name = normalizeName(record.values[nameIndex] ?? "");
    const email = normalizeAccessEmail(record.values[emailIndex] ?? "");
    let error: string | null = null;

    if (
      record.values.length > headers.length &&
      record.values.slice(headers.length).some(validText)
    ) {
      error = "La fila contiene más columnas que la cabecera.";
    } else if (!name) {
      error = "Falta el nombre del estudiante.";
    } else if (name.length > MAX_NAME_LENGTH) {
      error = `El nombre supera ${MAX_NAME_LENGTH} caracteres.`;
    } else if (!email) {
      error = "Falta el correo institucional.";
    } else if (email.length > MAX_EMAIL_LENGTH) {
      error = `El correo supera ${MAX_EMAIL_LENGTH} caracteres.`;
    } else if (roleForEmail(email) !== "student") {
      error = "El correo debe pertenecer a @alumnos.ubiobio.cl.";
    } else if (seenEmails.has(email)) {
      error = "El correo está repetido dentro del archivo.";
    }

    if (email) seenEmails.add(email);
    return { row: record.line, name, email, error };
  });
}

export function classifyEnrollmentRows(
  rows: ParsedEnrollmentRow[],
  state: EnrollmentImportState
): ClassifiedEnrollmentRow[] {
  const usersByEmail = new Map(
    state.registeredUsers.map((user) => [normalizeAccessEmail(user.email), user])
  );
  const enrollmentsByUserId = new Map(
    state.currentEnrollments.map((enrollment) => [enrollment.userId, enrollment])
  );
  const pendingEmails = new Set(state.pendingEmails.map(normalizeAccessEmail));

  return rows.map((row) => {
    if (row.error) return classified(row, "invalid", row.error, null);
    const user = usersByEmail.get(row.email);
    if (!user) {
      return pendingEmails.has(row.email)
        ? classified(row, "unchanged", "Ya espera el primer ingreso del estudiante.", null)
        : classified(row, "pending", "Quedará pendiente hasta el primer ingreso.", null);
    }

    const enrollment = enrollmentsByUserId.get(user.id);
    if (!enrollment) {
      return classified(row, "activate", "Se matriculará al aplicar el archivo.", user.id);
    }
    if (enrollment.status === "activa" && enrollment.role === "student") {
      return classified(row, "unchanged", "Ya tiene una matrícula activa.", user.id);
    }
    return classified(row, "reactivate", "Su matrícula se activará como estudiante.", user.id);
  });
}

export function enrollmentImportFingerprint(
  sectionId: string,
  rows: ParsedEnrollmentRow[]
): string {
  const normalized = rows.map(({ name, email }) => [name, email]);
  return createHash("sha256")
    .update(JSON.stringify([sectionId, normalized]))
    .digest("hex");
}

export function enrollmentImportTotals(rows: ClassifiedEnrollmentRow[]): EnrollmentImportTotals {
  const totals: EnrollmentImportTotals = {
    activate: 0,
    reactivate: 0,
    pending: 0,
    unchanged: 0,
    invalid: 0,
  };
  for (const row of rows) totals[row.status] += 1;
  return totals;
}

export function enrollmentPreviewPage(
  fingerprint: string,
  rows: ClassifiedEnrollmentRow[],
  requestedPage = 1,
  pageSize = ENROLLMENT_PREVIEW_PAGE_SIZE
): EnrollmentImportPreview {
  const safePageSize = Math.max(1, Math.min(MAX_IMPORT_QUERY_SIZE, Math.trunc(pageSize)));
  const totalPages = Math.max(1, Math.ceil(rows.length / safePageSize));
  const page = Math.max(1, Math.min(totalPages, Math.trunc(requestedPage) || 1));
  const start = (page - 1) * safePageSize;
  const totals = enrollmentImportTotals(rows);
  return {
    fingerprint,
    rows: rows.slice(start, start + safePageSize).map(publicPreviewRow),
    totals,
    totalRows: rows.length,
    page,
    pageSize: safePageSize,
    totalPages,
    canApply: rows.length > 0 && totals.invalid === 0,
  };
}

export function buildEnrollmentMutationPlan(rows: ClassifiedEnrollmentRow[]) {
  if (rows.some((row) => row.status === "invalid")) {
    throw new EnrollmentImportError(
      "invalid_csv",
      "Corrige las filas observadas antes de aplicar la carga.",
      422
    );
  }
  return {
    enrollments: rows.flatMap((row) =>
      row.userId && (row.status === "activate" || row.status === "reactivate")
        ? [{ userId: row.userId, email: row.email, name: row.name }]
        : []
    ),
    pending: rows.flatMap((row) =>
      row.status === "pending" ? [{ email: row.email, name: row.name }] : []
    ),
    registeredForProjection: rows.flatMap((row) =>
      row.userId ? [{ userId: row.userId, email: row.email, name: row.name }] : []
    ),
  };
}

export function importChunks<T>(items: T[], size = MAX_IMPORT_QUERY_SIZE): T[][] {
  const limit = Math.max(1, Math.min(MAX_IMPORT_QUERY_SIZE, Math.trunc(size)));
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += limit) {
    chunks.push(items.slice(index, index + limit));
  }
  return chunks;
}

function classified(
  row: ParsedEnrollmentRow,
  status: EnrollmentImportStatus,
  message: string,
  userId: string | null
): ClassifiedEnrollmentRow {
  return { row: row.row, name: row.name, email: row.email, status, message, userId };
}

function publicPreviewRow(row: ClassifiedEnrollmentRow): EnrollmentPreviewRow {
  return {
    row: row.row,
    name: row.name,
    email: row.email,
    status: row.status,
    message: row.message,
  };
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_");
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function validText(value: string): boolean {
  return value.trim().length > 0;
}

// Implements: REQ-PERF-04
function detectDelimiter(source: string): "," | ";" {
  const pSemi = Papa.parse<string[]>(source, { delimiter: ";", preview: 1 });
  const pComma = Papa.parse<string[]>(source, { delimiter: ",", preview: 1 });

  const qErr =
    pSemi.errors.find((e) => e.type === "Quotes") || pComma.errors.find((e) => e.type === "Quotes");
  if (qErr) {
    const line =
      qErr.index !== undefined
        ? source.slice(0, qErr.index).split(/\r\n|\r|\n/).length
        : qErr.row !== undefined
          ? qErr.row + 1
          : 1;
    throw new EnrollmentImportError(
      "invalid_csv",
      `La fila ${line} tiene comillas mal formadas o texto fuera de lugar.`,
      422
    );
  }

  const semiCols = (pSemi.data[0]?.length ?? 0) - 1;
  const commaCols = (pComma.data[0]?.length ?? 0) - 1;
  if (semiCols <= 0 && commaCols <= 0) {
    throw new EnrollmentImportError(
      "invalid_csv",
      "La cabecera debe estar separada por coma o punto y coma.",
      422
    );
  }
  return semiCols > commaCols ? ";" : ",";
}
