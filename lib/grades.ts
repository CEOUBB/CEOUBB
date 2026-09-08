export const MIN_GRADE = 1;
export const MAX_GRADE = 7;
export const PASSING_GRADE = 4;
export const DEFAULT_EXEMPTION_GRADE = 5;
export const MAX_GRADE_FEEDBACK_LENGTH = 2_000;
export const GRADE_FEEDBACK_REQUIREMENTS = [
  "REQ-FEEDBACK-01",
  "REQ-FEEDBACK-02",
  "REQ-FEEDBACK-03",
  "REQ-FEEDBACK-04",
  "REQ-FEEDBACK-05",
  "REQ-FEEDBACK-06",
] as const;

export type GradeItem = {
  id: string;
  name: string;
  weight: number;
  date: string;
};

export type GradeScores = Record<string, number>;
export type GradeFeedback = Record<string, string>;

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
  return (
    typeof value === "number" && Number.isFinite(value) && value >= MIN_GRADE && value <= MAX_GRADE
  );
}

export function normalizeScores(value: unknown): GradeScores {
  if (!value || typeof value !== "object") return {};
  const scores: GradeScores = {};
  for (const [key, score] of Object.entries(value as Record<string, unknown>)) {
    if (isValidGrade(score)) {
      scores[key] = score;
    }
  }
  return scores;
}

export function normalizeGradeFeedback(value: unknown): GradeFeedback {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const feedback: GradeFeedback = {};
  for (const [key, rawText] of Object.entries(value as Record<string, unknown>)) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(key) || typeof rawText !== "string") continue;
    const text = rawText.trim().slice(0, MAX_GRADE_FEEDBACK_LENGTH);
    if (text) feedback[key] = text;
  }
  return feedback;
}

export function normalizeItems(value: unknown): GradeItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const rawWeight = Number(record.weight ?? 0);
    if (!Number.isFinite(rawWeight) || rawWeight <= 0) return [];
    const weight = Math.round(rawWeight * 100) / 100;
    return [
      {
        id: String(record.id ?? `item-${index}`),
        name: String(record.name ?? "Evaluación"),
        weight,
        date: String(record.date ?? ""),
      },
    ];
  });
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

export function requiredGrade(
  items: GradeItem[],
  scores: GradeScores,
  target: number
): GradeTarget {
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
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

export function gradeFromPoints(
  earnedPoints: number,
  totalPoints: number,
  passingRatio = 0.6
): number | null {
  if (
    !Number.isFinite(earnedPoints) ||
    !Number.isFinite(totalPoints) ||
    !Number.isFinite(passingRatio) ||
    totalPoints <= 0 ||
    earnedPoints < 0 ||
    earnedPoints > totalPoints ||
    passingRatio <= 0 ||
    passingRatio >= 1
  ) {
    return null;
  }
  const achievement = earnedPoints / totalPoints;
  const value =
    achievement <= passingRatio
      ? MIN_GRADE + ((PASSING_GRADE - MIN_GRADE) * achievement) / passingRatio
      : PASSING_GRADE +
        ((MAX_GRADE - PASSING_GRADE) * (achievement - passingRatio)) / (1 - passingRatio);
  return round1(Math.min(MAX_GRADE, Math.max(MIN_GRADE, value)));
}

function ceil1(value: number) {
  return Math.ceil(value * 10 - 1e-9) / 10;
}
