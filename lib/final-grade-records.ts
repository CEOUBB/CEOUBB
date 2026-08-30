import type { ParticipantDirectoryEntry } from "./participants.ts";
import {
  PASSING_GRADE,
  isValidGrade,
  round1,
  summarize,
  type GradeItem,
  type GradeScores,
} from "./grades.ts";

export const INTEGRATIVE_GRADE_ITEM_ID = "evaluacion-integradora";

export type IntegrativeEligibility = "blocked" | "required" | "optional";
export type FinalGradeOutcome = "incomplete" | "integrative-pending" | "passed" | "failed";

export type FinalGradeCalculation = {
  partialAverage: number | null;
  integrativeGrade: number | null;
  finalGrade: number | null;
  eligibility: IntegrativeEligibility;
  outcome: FinalGradeOutcome;
};

export type FinalGradeRecord = FinalGradeCalculation & {
  userId: string;
  institutionalId: string;
  name: string;
  email: string;
};

export type FinalGradeStatistics = {
  total: number;
  passed: number;
  failed: number;
  pending: number;
  integrativeRequired: number;
  integrativePending: number;
  sectionAverage: number | null;
};

export type FinalGradeMetadata = {
  courseId: string;
  courseCode: string;
  courseName: string;
  section: string;
  period: string;
  teacher: string;
  generatedAt: string;
};

// Implements: REQ-ACTA-01, REQ-ACTA-02, REQ-ACTA-03
export function calculateFinalGrade(
  items: readonly GradeItem[],
  scores: GradeScores
): FinalGradeCalculation {
  const partial = summarize([...items], scores);
  if (!partial.complete || partial.average === null) {
    return {
      partialAverage: null,
      integrativeGrade: null,
      finalGrade: null,
      eligibility: "blocked",
      outcome: "incomplete",
    };
  }

  const partialAverage = partial.average;
  if (partialAverage < 2) {
    return {
      partialAverage,
      integrativeGrade: null,
      finalGrade: partialAverage,
      eligibility: "blocked",
      outcome: "failed",
    };
  }

  const eligibility = partialAverage < PASSING_GRADE ? "required" : "optional";
  const storedIntegrative = scores[INTEGRATIVE_GRADE_ITEM_ID];
  const integrativeGrade = isValidGrade(storedIntegrative) ? storedIntegrative : null;
  if (eligibility === "required" && integrativeGrade === null) {
    return {
      partialAverage,
      integrativeGrade,
      finalGrade: null,
      eligibility,
      outcome: "integrative-pending",
    };
  }

  const finalGrade =
    integrativeGrade === null
      ? partialAverage
      : round1(partialAverage * 0.6 + integrativeGrade * 0.4);
  return {
    partialAverage,
    integrativeGrade,
    finalGrade,
    eligibility,
    outcome: finalGrade >= PASSING_GRADE ? "passed" : "failed",
  };
}

// Implements: REQ-ACTA-05
export function buildFinalGradeRecords(
  students: readonly ParticipantDirectoryEntry[],
  items: readonly GradeItem[],
  classScores: Readonly<Record<string, GradeScores>>
): FinalGradeRecord[] {
  const records: FinalGradeRecord[] = [];
  for (const student of students) {
    if (student.role !== "student") continue;
    records.push({
      userId: student.id,
      institutionalId: student.email,
      name: student.name,
      email: student.email,
      ...calculateFinalGrade(items, classScores[student.id] ?? {}),
    });
  }
  return records;
}

// Implements: REQ-ACTA-04
export function finalGradeStatistics(records: readonly FinalGradeRecord[]): FinalGradeStatistics {
  let passed = 0;
  let failed = 0;
  let pending = 0;
  let integrativeRequired = 0;
  let integrativePending = 0;
  let finalTotal = 0;
  let finalCount = 0;

  for (const record of records) {
    if (record.outcome === "passed") passed += 1;
    else if (record.outcome === "failed") failed += 1;
    else pending += 1;
    if (record.eligibility === "required") integrativeRequired += 1;
    if (record.outcome === "integrative-pending") integrativePending += 1;
    if (record.finalGrade !== null) {
      finalTotal += record.finalGrade;
      finalCount += 1;
    }
  }

  return {
    total: records.length,
    passed,
    failed,
    pending,
    integrativeRequired,
    integrativePending,
    sectionAverage: finalCount > 0 ? round1(finalTotal / finalCount) : null,
  };
}

export function finalGradeOutcomeLabel(outcome: FinalGradeOutcome): string {
  if (outcome === "passed") return "Aprobado";
  if (outcome === "failed") return "Reprobado";
  if (outcome === "integrative-pending") return "Integradora pendiente";
  return "Notas pendientes";
}

function canonicalFinalGradeRecords(
  metadata: FinalGradeMetadata,
  records: readonly FinalGradeRecord[]
): string {
  const normalizedRecords = [...records]
    .sort((left, right) => left.userId.localeCompare(right.userId))
    .map((record) => ({
      userId: record.userId,
      institutionalId: record.institutionalId,
      name: record.name,
      email: record.email,
      partialAverage: record.partialAverage,
      integrativeGrade: record.integrativeGrade,
      finalGrade: record.finalGrade,
      eligibility: record.eligibility,
      outcome: record.outcome,
    }));
  return JSON.stringify({ metadata, records: normalizedRecords });
}

// Implements: REQ-ACTA-07
export async function fingerprintFinalGradeRecords(
  metadata: FinalGradeMetadata,
  records: readonly FinalGradeRecord[]
): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalFinalGradeRecords(metadata, records));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}
