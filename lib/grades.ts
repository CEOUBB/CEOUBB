export const MIN_GRADE = 1;
export const MAX_GRADE = 7;
export const PASSING_GRADE = 4;
export const DEFAULT_EXEMPTION_GRADE = 5;

export type GradeItem = {
  id: string;
  name: string;
  weight: number;
  date: string;
};

export type GradeScores = Record<string, number>;

export type GradeSummary = {
  totalWeight: number;
  gradedWeight: number;
  pendingWeight: number;
  earned: number;
  average: number | null;
  complete: boolean;
};

export type GradeTarget =
  | { state: "closed"; grade: null }
  | { state: "secured"; grade: null }
  | { state: "impossible"; grade: number }
  | { state: "needed"; grade: number };

export function isValidGrade(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= MIN_GRADE && value <= MAX_GRADE;
}

export function normalizeScores(value: unknown): GradeScores {
  if (!value || typeof value !== "object") return {};
  const entries = Object.entries(value as Record<string, unknown>).filter(([, score]) => isValidGrade(score));
  return Object.fromEntries(entries) as GradeScores;
}

export function normalizeItems(value: unknown): GradeItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item, index) => ({
      id: String(item.id ?? `item-${index}`),
      name: String(item.name ?? "Evaluación"),
      weight: Math.max(0, Number(item.weight ?? 0)),
      date: String(item.date ?? ""),
    }))
    .filter((item) => item.weight > 0);
}

export function summarize(items: GradeItem[], scores: GradeScores): GradeSummary {
  let totalWeight = 0;
  let gradedWeight = 0;
  let earned = 0;
  for (const item of items) {
    totalWeight += item.weight;
    const score = scores[item.id];
    if (!isValidGrade(score)) continue;
    gradedWeight += item.weight;
    earned += score * item.weight;
  }
  return {
    totalWeight,
    gradedWeight,
    pendingWeight: totalWeight - gradedWeight,
    earned,
    average: gradedWeight > 0 ? round1(earned / gradedWeight) : null,
    complete: totalWeight > 0 && gradedWeight === totalWeight,
  };
}

export function requiredGrade(items: GradeItem[], scores: GradeScores, target: number): GradeTarget {
  const { totalWeight, pendingWeight, earned } = summarize(items, scores);
  if (totalWeight === 0 || pendingWeight === 0) return { state: "closed", grade: null };
  const needed = ceil1((target * totalWeight - earned) / pendingWeight);
  if (needed <= MIN_GRADE) return { state: "secured", grade: null };
  if (needed > MAX_GRADE) return { state: "impossible", grade: needed };
  return { state: "needed", grade: needed };
}

export function formatGrade(value: number) {
  return value.toFixed(1).replace(".", ",");
}

export function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function ceil1(value: number) {
  return Math.ceil(value * 10 - 1e-9) / 10;
}
