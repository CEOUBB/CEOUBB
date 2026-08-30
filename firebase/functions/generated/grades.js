"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GRADE_FEEDBACK_REQUIREMENTS =
  exports.MAX_GRADE_FEEDBACK_LENGTH =
  exports.DEFAULT_EXEMPTION_GRADE =
  exports.PASSING_GRADE =
  exports.MAX_GRADE =
  exports.MIN_GRADE =
    void 0;
exports.isValidGrade = isValidGrade;
exports.normalizeScores = normalizeScores;
exports.normalizeGradeFeedback = normalizeGradeFeedback;
exports.normalizeItems = normalizeItems;
exports.summarize = summarize;
exports.requiredGrade = requiredGrade;
exports.formatGrade = formatGrade;
exports.round1 = round1;
exports.gradeFromPoints = gradeFromPoints;
exports.MIN_GRADE = 1;
exports.MAX_GRADE = 7;
exports.PASSING_GRADE = 4;
exports.DEFAULT_EXEMPTION_GRADE = 5;
exports.MAX_GRADE_FEEDBACK_LENGTH = 2000;
exports.GRADE_FEEDBACK_REQUIREMENTS = [
  "REQ-FEEDBACK-01",
  "REQ-FEEDBACK-02",
  "REQ-FEEDBACK-03",
  "REQ-FEEDBACK-04",
  "REQ-FEEDBACK-05",
  "REQ-FEEDBACK-06",
];
function isValidGrade(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= exports.MIN_GRADE &&
    value <= exports.MAX_GRADE
  );
}
function normalizeScores(value) {
  if (!value || typeof value !== "object") return {};
  const scores = {};
  for (const [key, score] of Object.entries(value)) {
    if (isValidGrade(score)) {
      scores[key] = score;
    }
  }
  return scores;
}
function normalizeGradeFeedback(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const feedback = {};
  for (const [key, rawText] of Object.entries(value)) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(key) || typeof rawText !== "string") continue;
    const text = rawText.trim().slice(0, exports.MAX_GRADE_FEEDBACK_LENGTH);
    if (text) feedback[key] = text;
  }
  return feedback;
}
function normalizeItems(value) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const record = item;
    const weight = Math.max(0, Number(record.weight ?? 0));
    if (weight <= 0) return [];
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
function summarize(items, scores) {
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
function requiredGrade(items, scores, target) {
  const { totalWeight, pendingWeight, earned } = summarize(items, scores);
  if (totalWeight === 0 || pendingWeight === 0) return { state: "closed", grade: null };
  const needed = ceil1((target * totalWeight - earned) / pendingWeight);
  if (needed <= exports.MIN_GRADE) return { state: "secured", grade: null };
  if (needed > exports.MAX_GRADE) return { state: "impossible", grade: needed };
  return { state: "needed", grade: needed };
}
function formatGrade(value) {
  return value.toFixed(1).replace(".", ",");
}
function round1(value) {
  return Math.round(value * 10) / 10;
}
function gradeFromPoints(earnedPoints, totalPoints, passingRatio = 0.6) {
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
      ? exports.MIN_GRADE +
        ((exports.PASSING_GRADE - exports.MIN_GRADE) * achievement) / passingRatio
      : exports.PASSING_GRADE +
        ((exports.MAX_GRADE - exports.PASSING_GRADE) * (achievement - passingRatio)) /
          (1 - passingRatio);
  return round1(Math.min(exports.MAX_GRADE, Math.max(exports.MIN_GRADE, value)));
}
function ceil1(value) {
  return Math.ceil(value * 10 - 1e-9) / 10;
}
