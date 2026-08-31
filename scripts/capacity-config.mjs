export const CAPACITY_REQUIREMENTS = Object.freeze([
  "Implements: REQ-OPS-LOAD-01",
  "Implements: REQ-OPS-LOAD-02",
  "Implements: REQ-OPS-LOAD-03",
  "Implements: REQ-OPS-LOAD-04",
  "Implements: REQ-OPS-LOAD-05",
  "Implements: REQ-OPS-LOAD-06",
  "Implements: REQ-STG-07",
]);

export const CAPACITY_ENVELOPE = Object.freeze({
  targetUrl: "https://ceoubb-staging.vercel.app/",
  firebaseProjectId: "centro-de-estudio-ubb-staging",
  shards: 6,
  studentsPerShard: 2_000,
  identitiesPerShard: 2_500,
  sectionsPerShard: 500,
  enrollmentsPerStudent: 6,
  activeStudentsPerShard: 500,
  rampDuration: "10m",
  steadyDuration: "31m",
  steadyStateSeconds: 1_800,
});

export const CAPACITY_PRICING = Object.freeze({
  priceDate: "2026-08-30",
  clpPerUsd: 1_000,
  firestoreReadUsdPer100k: 0.03,
  firestoreWriteUsdPer100k: 0.09,
  fixedAndNonMeasuredAnnualUsd: 4_017,
  contingencyRate: 0.25,
  academicPeakWindowsPerYear: 20,
  activeStudents: 12_000,
  ceilingClpPerStudent: 1_000,
});

export function assertCapacityTargets(configuration) {
  if (configuration.confirmation !== "STAGING_ONLY") {
    throw new Error(
      "CAPACITY_CONFIG_INCOMPLETE: confirm_staging debe ser exactamente STAGING_ONLY."
    );
  }
  let targetUrl;
  let tursoDatabaseUrl;
  try {
    targetUrl = new URL(configuration.targetUrl);
    tursoDatabaseUrl = new URL(configuration.tursoDatabaseUrl);
  } catch {
    throw new Error("CAPACITY_CONFIG_INCOMPLETE: las URL de staging no son válidas.");
  }
  if (
    targetUrl.protocol !== "https:" ||
    targetUrl.hostname !== "ceoubb-staging.vercel.app" ||
    targetUrl.pathname !== "/" ||
    targetUrl.search ||
    targetUrl.hash
  ) {
    throw new Error("CAPACITY_TARGET_REJECTED: TARGET_URL no identifica el alias staging.");
  }
  if (configuration.firebaseProjectId !== CAPACITY_ENVELOPE.firebaseProjectId) {
    throw new Error(
      "CAPACITY_TARGET_REJECTED: FIREBASE_PROJECT_ID no identifica el proyecto staging."
    );
  }
  if (
    !["libsql:", "https:"].includes(tursoDatabaseUrl.protocol) ||
    !tursoDatabaseUrl.hostname.toLowerCase().includes("ceoubb-staging")
  ) {
    throw new Error("CAPACITY_TARGET_REJECTED: TURSO_DATABASE_URL no identifica staging.");
  }
  const profile = configuration.profile === "smoke" ? "smoke" : configuration.profile;
  const shardCount = integer(configuration.shardCount);
  const shardIndex = integer(configuration.shardIndex);
  if (profile !== "full" && profile !== "smoke") {
    throw new Error("CAPACITY_CONFIG_INCOMPLETE: profile debe ser full o smoke.");
  }
  if (shardCount !== CAPACITY_ENVELOPE.shards) {
    throw new Error("CAPACITY_CONFIG_INCOMPLETE: la topología completa exige seis shards.");
  }
  if (shardIndex < 0 || shardIndex >= shardCount) {
    throw new Error("CAPACITY_CONFIG_INCOMPLETE: shardIndex está fuera de rango.");
  }
  return {
    targetUrl: targetUrl.toString(),
    firebaseProjectId: configuration.firebaseProjectId,
    tursoDatabaseUrl: tursoDatabaseUrl.toString(),
    shardIndex,
    shardCount,
    profile,
  };
}

export function buildCapacityShardFixture(shardIndex) {
  const index = integer(shardIndex);
  if (index < 0 || index >= CAPACITY_ENVELOPE.shards) {
    throw new Error("CAPACITY_CONFIG_INCOMPLETE: shardIndex está fuera de rango.");
  }
  const shard = String(index).padStart(2, "0");
  const students = Array.from({ length: CAPACITY_ENVELOPE.studentsPerShard }, (_, offset) => {
    const ordinal = offset + 1;
    const uid = `load-s${shard}-student-${String(ordinal).padStart(4, "0")}`;
    return {
      uid,
      id: `firebase:${uid}`,
      email: `${uid}@alumnos.ubiobio.cl`,
      name: `Estudiante sintético ${shard}-${String(ordinal).padStart(4, "0")}`,
      role: "student",
    };
  });
  const staff = Array.from(
    { length: CAPACITY_ENVELOPE.identitiesPerShard - CAPACITY_ENVELOPE.studentsPerShard },
    (_, offset) => {
      const ordinal = offset + 1;
      const uid = `load-s${shard}-teacher-${String(ordinal).padStart(3, "0")}`;
      return {
        uid,
        id: `firebase:${uid}`,
        email: `${uid}@ubiobio.cl`,
        name: `Docente sintético ${shard}-${String(ordinal).padStart(3, "0")}`,
        role: "teacher",
      };
    }
  );
  const periodId = "load-period-2026-2";
  const sections = Array.from({ length: CAPACITY_ENVELOPE.sectionsPerShard }, (_, offset) => {
    const ordinal = offset + 1;
    return {
      id: `load-s${shard}-sec-${String(ordinal).padStart(3, "0")}`,
      subjectId: `load-s${shard}-subject-${String(ordinal).padStart(3, "0")}`,
      periodId,
      number: 1,
      teacherId: staff[offset % staff.length].id,
    };
  });
  const enrollments = students.flatMap((student, studentOffset) =>
    Array.from({ length: CAPACITY_ENVELOPE.enrollmentsPerStudent }, (_, enrollmentOffset) => ({
      id: `${sections[(studentOffset * 6 + enrollmentOffset) % sections.length].id}-${student.uid}`,
      sectionId: sections[(studentOffset * 6 + enrollmentOffset) % sections.length].id,
      studentUid: student.uid,
      studentId: student.id,
      role: "student",
      status: "activa",
    }))
  );
  const primarySectionByStudent = new Map();
  for (const enrollment of enrollments) {
    if (!primarySectionByStudent.has(enrollment.studentUid)) {
      primarySectionByStudent.set(enrollment.studentUid, enrollment.sectionId);
    }
  }
  const activeStudents = students
    .slice(0, CAPACITY_ENVELOPE.activeStudentsPerShard)
    .map((student) => ({
      ...student,
      primarySectionId: primarySectionByStudent.get(student.uid),
    }));
  return {
    shardIndex: index,
    periodId,
    students,
    staff,
    identities: [...students, ...staff],
    sections,
    enrollments,
    activeStudents,
  };
}

export function projectAnnualCost(input) {
  const reads = nonNegative(input.firestoreReads, "firestoreReads");
  const writes = nonNegative(input.firestoreWrites, "firestoreWrites");
  const activeStudents = positive(input.activeStudents ?? CAPACITY_PRICING.activeStudents);
  const windows = positive(
    input.academicPeakWindowsPerYear ?? CAPACITY_PRICING.academicPeakWindowsPerYear
  );
  const readUsd = (reads / 100_000) * CAPACITY_PRICING.firestoreReadUsdPer100k * windows;
  const writeUsd = (writes / 100_000) * CAPACITY_PRICING.firestoreWriteUsdPer100k * windows;
  const subtotalUsd = CAPACITY_PRICING.fixedAndNonMeasuredAnnualUsd + readUsd + writeUsd;
  const annualBudgetUsd =
    Math.ceil((subtotalUsd * (1 + CAPACITY_PRICING.contingencyRate)) / 100) * 100;
  const annualClpPerStudent = Math.round(
    (annualBudgetUsd * CAPACITY_PRICING.clpPerUsd) / activeStudents
  );
  return {
    priceDate: CAPACITY_PRICING.priceDate,
    activeStudents,
    academicPeakWindowsPerYear: windows,
    measuredFirestoreReadUsd: round(readUsd),
    measuredFirestoreWriteUsd: round(writeUsd),
    fixedAndNonMeasuredAnnualUsd: CAPACITY_PRICING.fixedAndNonMeasuredAnnualUsd,
    annualBudgetUsd,
    annualClpPerStudent,
    ceilingClpPerStudent: CAPACITY_PRICING.ceilingClpPerStudent,
    verdict: annualClpPerStudent <= CAPACITY_PRICING.ceilingClpPerStudent ? "PASS" : "FAIL",
  };
}

export function aggregateCapacityEvidence({
  runId,
  summaries,
  firestoreReads,
  firestoreWrites,
  startedAt = null,
  finishedAt = null,
}) {
  const completeSummaries = Array.isArray(summaries) ? summaries : [];
  const httpRequests = sum(completeSummaries, "httpRequests");
  const http5xx = sum(completeSummaries, "http5xx");
  const authorizationErrors = sum(completeSummaries, "authorizationErrors");
  const unexpectedResponses = sum(completeSummaries, "unexpectedResponses");
  const peakVirtualUsers = sum(completeSummaries, "peakVus");
  const shardSteadyStateSeconds = minimum(completeSummaries, "steadyStateSeconds");
  const startSkewSeconds = capacityStartSkewSeconds(completeSummaries);
  const steadyStateSeconds =
    startSkewSeconds === null
      ? 0
      : Math.max(0, shardSteadyStateSeconds - Math.ceil(startSkewSeconds));
  const httpP95Ms = maximum(completeSummaries, "httpP95Ms");
  const httpP99Ms = maximum(completeSummaries, "httpP99Ms");
  const tursoP95Ms = maximum(completeSummaries, "tursoP95Ms");
  const vercelP95Ms = maximum(completeSummaries, "vercelP95Ms");
  const firestoreP95Ms = maximum(completeSummaries, "firestoreP95Ms");
  const http5xxRate = httpRequests > 0 ? http5xx / httpRequests : null;
  const unexpectedResponseRate = httpRequests > 0 ? unexpectedResponses / httpRequests : null;
  const portalOpens = sum(completeSummaries, "portalOpens");
  const hasProviderMetrics = Number.isFinite(firestoreReads) && Number.isFinite(firestoreWrites);
  const cost = hasProviderMetrics ? projectAnnualCost({ firestoreReads, firestoreWrites }) : null;
  const firestoreReadsPerPortalOpen =
    hasProviderMetrics && portalOpens > 0 ? Number(firestoreReads) / portalOpens : null;
  const hardFailure =
    completeSummaries.some((summary) => summary.status === "FAIL") ||
    peakVirtualUsers < 3_000 ||
    steadyStateSeconds < CAPACITY_ENVELOPE.steadyStateSeconds ||
    httpP95Ms === null ||
    httpP95Ms > 2_000 ||
    httpP99Ms === null ||
    httpP99Ms > 4_000 ||
    http5xxRate === null ||
    http5xxRate >= 0.001 ||
    authorizationErrors !== 0 ||
    unexpectedResponseRate === null ||
    unexpectedResponseRate >= 0.001 ||
    (firestoreReadsPerPortalOpen !== null && firestoreReadsPerPortalOpen > 200) ||
    cost?.verdict === "FAIL";
  const incomplete =
    completeSummaries.length !== CAPACITY_ENVELOPE.shards ||
    new Set(completeSummaries.map((summary) => summary.shardIndex)).size !==
      CAPACITY_ENVELOPE.shards ||
    completeSummaries.some((summary) => summary.profile !== "full") ||
    !hasProviderMetrics ||
    httpP95Ms === null ||
    httpP99Ms === null ||
    startSkewSeconds === null;
  return {
    runId,
    startedAt,
    finishedAt,
    executedShards: completeSummaries.length,
    peakVirtualUsers,
    steadyStateSeconds,
    startSkewSeconds,
    httpRequests,
    httpP95Ms,
    httpP99Ms,
    http5xx,
    http5xxRate,
    authorizationErrors,
    unexpectedResponses,
    unexpectedResponseRate,
    portalOpens,
    tursoRequests: sum(completeSummaries, "tursoRequests"),
    tursoP95Ms,
    vercelP95Ms,
    firestoreP95Ms,
    firestoreReads: hasProviderMetrics ? Number(firestoreReads) : null,
    firestoreWrites: hasProviderMetrics ? Number(firestoreWrites) : null,
    firestoreReadsPerPortalOpen,
    cost,
    verdict: incomplete ? "INCOMPLETE" : hardFailure ? "FAIL" : "PASS",
  };
}

function integer(value) {
  return Number.isInteger(Number(value)) ? Number(value) : -1;
}

function positive(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error("CAPACITY_CONFIG_INCOMPLETE: se esperaba un número positivo.");
  }
  return number;
}

function nonNegative(value, name) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new Error(`CAPACITY_TELEMETRY_MISSING: ${name} no es un contador válido.`);
  }
  return number;
}

function sum(items, key) {
  return items.reduce((total, item) => total + (Number(item[key]) || 0), 0);
}

function maximum(items, key) {
  const values = items
    .map((item) => item[key])
    .filter((value) => value !== null && value !== undefined)
    .map(Number)
    .filter(Number.isFinite);
  return values.length > 0 ? Math.max(...values) : null;
}

function minimum(items, key) {
  const values = items.map((item) => Number(item[key])).filter(Number.isFinite);
  return values.length > 0 ? Math.min(...values) : 0;
}

function capacityStartSkewSeconds(items) {
  const starts = items.map((item) => new Date(item.startedAt).getTime()).filter(Number.isFinite);
  if (starts.length !== items.length || starts.length === 0) return null;
  return (Math.max(...starts) - Math.min(...starts)) / 1_000;
}

function round(value) {
  return Math.round(value * 100) / 100;
}
