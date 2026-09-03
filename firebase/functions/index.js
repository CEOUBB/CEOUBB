const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { FieldValue, Timestamp, getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { getStorage } = require("firebase-admin/storage");
const { setGlobalOptions } = require("firebase-functions/v2");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { HttpsError, onCall } = require("firebase-functions/v2/https");
const {
  MAX_CONCURRENT_TRANSACTIONS,
  GradeAuditInputError,
  actorFromAuth,
  canEditSection,
  diffFeedback,
  diffScores,
  normalizeFeedbackRequest,
  normalizeGradebookRequest,
  normalizeScoreRequest,
  storedFeedbackMap,
  storedGradebook,
  storedScoreMap,
} = require("./grade-audit");
const {
  QuizInputError,
  normalizePublishRequest,
  normalizeQuizRequest,
  scoreQuizAnswers,
} = require("./quiz-engine");

initializeApp();
setGlobalOptions({ region: "southamerica-west1", maxInstances: 4 });
const APP_CHECK_OBSERVATION_OPTIONS = { enforceAppCheck: false };

function text(value, fallback, limit) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return (normalized || fallback).slice(0, limit);
}

function callableError(cause) {
  if (cause instanceof HttpsError) return cause;
  if (cause instanceof GradeAuditInputError || cause instanceof QuizInputError) {
    return new HttpsError("invalid-argument", cause.message);
  }
  console.error("[callable] Error inesperado:", cause);
  return new HttpsError("internal", "No fue posible completar la operación.");
}

async function assertSectionWritable(db, courseId) {
  const section = await db.collection("academicSections").doc(courseId).get();
  const periodId = section.exists ? section.get("periodoId") : "";
  const period = periodId ? await db.collection("academicPeriods").doc(periodId).get() : null;
  if (!period || !period.exists || period.get("status") !== "abierto") {
    throw new HttpsError(
      "failed-precondition",
      "El período de esta sección está cerrado o no está sincronizado."
    );
  }
}

async function authorizedGradeActor(request, db, courseId) {
  if (!request.auth || request.auth.token.email_verified !== true) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión con una cuenta verificada.");
  }
  await assertSectionWritable(db, courseId);
  const actor = actorFromAuth(request.auth);
  const profile = await db.collection("users").doc(actor.actorUid).get();
  const role = profile.exists ? profile.get("role") : "";
  let enrolled = false;
  if (role === "teacher") {
    const enrollment = await db
      .collection("enrollments")
      .doc(actor.actorUid)
      .collection("sections")
      .doc(courseId)
      .get();
    enrolled = enrollment.exists;
  }
  if (!canEditSection(role, enrolled)) {
    throw new HttpsError(
      "permission-denied",
      "No tienes permisos para editar notas en esta sección."
    );
  }
  return actor;
}

async function authorizedQuizStudent(request, db, courseId) {
  if (!request.auth || request.auth.token.email_verified !== true) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión con una cuenta verificada.");
  }
  await assertSectionWritable(db, courseId);
  const [profile, enrollment] = await Promise.all([
    db.collection("users").doc(request.auth.uid).get(),
    db.collection("enrollments").doc(request.auth.uid).collection("sections").doc(courseId).get(),
  ]);
  if (
    !profile.exists ||
    profile.get("role") !== "student" ||
    !enrollment.exists ||
    enrollment.get("role") !== "student"
  ) {
    throw new HttpsError(
      "permission-denied",
      "Debes estar matriculado como estudiante para rendir este cuestionario."
    );
  }
  return actorFromAuth(request.auth);
}

async function authorizedQuizPublisher(request, db, courseId) {
  if (!request.auth || request.auth.token.email_verified !== true) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión con una cuenta verificada.");
  }
  await assertSectionWritable(db, courseId);
  const actor = actorFromAuth(request.auth);
  const profile = await db.collection("users").doc(actor.actorUid).get();
  const role = profile.exists ? profile.get("role") : "";
  if (role === "owner") return actor;
  const enrollment = await db
    .collection("enrollments")
    .doc(actor.actorUid)
    .collection("sections")
    .doc(courseId)
    .get();
  if (
    role !== "teacher" ||
    !enrollment.exists ||
    !["teacher", "coordinator"].includes(enrollment.get("role"))
  ) {
    throw new HttpsError(
      "permission-denied",
      "No tienes permisos docentes para publicar cuestionarios en esta sección."
    );
  }
  return actor;
}

function timestampIso(value) {
  return value && typeof value.toDate === "function" ? value.toDate().toISOString() : "";
}

function quizResultDto(value) {
  return {
    quizId: value.quizId,
    userId: value.userId,
    earnedPoints: value.earnedPoints,
    totalPoints: value.totalPoints,
    grade: value.grade,
    corrections: Array.isArray(value.corrections) ? value.corrections : [],
    submittedAt: timestampIso(value.submittedAt),
  };
}

exports.publishQuiz = onCall(APP_CHECK_OBSERVATION_OPTIONS, async (request) => {
  try {
    const next = normalizePublishRequest(request.data);
    const db = getFirestore();
    const actor = await authorizedQuizPublisher(request, db, next.courseId);
    const gradebookRef = db
      .collection("courses")
      .doc(next.courseId)
      .collection("meta")
      .doc("gradebook");
    const [gradebook, duplicate] = await Promise.all([
      gradebookRef.get(),
      db
        .collection("courses")
        .doc(next.courseId)
        .collection("quizzes")
        .where("gradeItemId", "==", next.gradeItemId)
        .limit(1)
        .get(),
    ]);
    const items =
      gradebook.exists && Array.isArray(gradebook.get("items")) ? gradebook.get("items") : [];
    if (!items.some((item) => item && item.id === next.gradeItemId)) {
      throw new HttpsError(
        "failed-precondition",
        "El ítem seleccionado ya no existe en el libro de notas."
      );
    }
    if (!duplicate.empty) {
      throw new HttpsError(
        "failed-precondition",
        "Ese ítem del libro de notas ya está vinculado a otro cuestionario."
      );
    }
    const quizRef = db.collection("courses").doc(next.courseId).collection("quizzes").doc();
    const keyRef = db
      .collection("courses")
      .doc(next.courseId)
      .collection("quizKeys")
      .doc(quizRef.id);
    const batch = db.batch();
    batch.create(quizRef, {
      courseId: next.courseId,
      title: next.title,
      description: next.description,
      durationMinutes: next.durationMinutes,
      gradeItemId: next.gradeItemId,
      status: "published",
      questions: next.questions,
      totalPoints: next.totalPoints,
      createdBy: actor.actorUid,
      createdAt: FieldValue.serverTimestamp(),
    });
    batch.create(keyRef, {
      courseId: next.courseId,
      quizId: quizRef.id,
      answers: next.answers,
      createdBy: actor.actorUid,
      createdAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();
    return { quizId: quizRef.id };
  } catch (cause) {
    throw callableError(cause);
  }
});

exports.startQuizAttempt = onCall(APP_CHECK_OBSERVATION_OPTIONS, async (request) => {
  try {
    const next = normalizeQuizRequest(request.data);
    const db = getFirestore();
    await authorizedQuizStudent(request, db, next.courseId);
    const quizRef = db
      .collection("courses")
      .doc(next.courseId)
      .collection("quizzes")
      .doc(next.quizId);
    const draftRef = quizRef.collection("drafts").doc(request.auth.uid);
    const resultRef = quizRef.collection("results").doc(request.auth.uid);
    const outcome = await db.runTransaction(async (transaction) => {
      const [quiz, draft, result] = await transaction.getAll(quizRef, draftRef, resultRef);
      if (!quiz.exists || quiz.get("status") !== "published") {
        throw new HttpsError("not-found", "El cuestionario no está disponible.");
      }
      if (result.exists) return { status: "submitted", result: quizResultDto(result.data()) };
      if (draft.exists) {
        return {
          status: "active",
          attempt: {
            quizId: next.quizId,
            userId: request.auth.uid,
            answers: draft.get("answers") || {},
            startedAt: timestampIso(draft.get("startedAt")),
            expiresAt: timestampIso(draft.get("expiresAt")),
            submittedAt: null,
          },
        };
      }
      const startedAt = Timestamp.now();
      const durationMinutes = Number(quiz.get("durationMinutes"));
      const expiresAt = Timestamp.fromMillis(startedAt.toMillis() + durationMinutes * 60 * 1000);
      transaction.create(draftRef, {
        courseId: next.courseId,
        quizId: next.quizId,
        userId: request.auth.uid,
        answers: {},
        startedAt,
        expiresAt,
        submittedAt: null,
        updatedAt: startedAt,
      });
      return {
        status: "active",
        attempt: {
          quizId: next.quizId,
          userId: request.auth.uid,
          answers: {},
          startedAt: startedAt.toDate().toISOString(),
          expiresAt: expiresAt.toDate().toISOString(),
          submittedAt: null,
        },
      };
    });
    return outcome;
  } catch (cause) {
    throw callableError(cause);
  }
});

exports.submitQuizAttempt = onCall(APP_CHECK_OBSERVATION_OPTIONS, async (request) => {
  try {
    const next = normalizeQuizRequest(request.data);
    const db = getFirestore();
    const actor = await authorizedQuizStudent(request, db, next.courseId);
    const quizRef = db
      .collection("courses")
      .doc(next.courseId)
      .collection("quizzes")
      .doc(next.quizId);
    const keyRef = db
      .collection("courses")
      .doc(next.courseId)
      .collection("quizKeys")
      .doc(next.quizId);
    const draftRef = quizRef.collection("drafts").doc(request.auth.uid);
    const resultRef = quizRef.collection("results").doc(request.auth.uid);
    const gradebookRef = db
      .collection("courses")
      .doc(next.courseId)
      .collection("meta")
      .doc("gradebook");
    const gradeRef = db
      .collection("courses")
      .doc(next.courseId)
      .collection("grades")
      .doc(request.auth.uid);
    const result = await db.runTransaction(async (transaction) => {
      const [quiz, key, draft, existingResult, gradebook, grade] = await transaction.getAll(
        quizRef,
        keyRef,
        draftRef,
        resultRef,
        gradebookRef,
        gradeRef
      );
      if (existingResult.exists) return quizResultDto(existingResult.data());
      if (!quiz.exists || quiz.get("status") !== "published") {
        throw new HttpsError("not-found", "El cuestionario no está disponible.");
      }
      if (!key.exists || !draft.exists) {
        throw new HttpsError(
          "failed-precondition",
          "Debes iniciar el cuestionario antes de entregarlo."
        );
      }
      if (draft.get("submittedAt")) {
        throw new HttpsError("failed-precondition", "Este cuestionario ya fue entregado.");
      }
      const gradeItemId = quiz.get("gradeItemId");
      const gradeItems =
        gradebook.exists && Array.isArray(gradebook.get("items")) ? gradebook.get("items") : [];
      if (!gradeItems.some((item) => item && item.id === gradeItemId)) {
        throw new HttpsError(
          "failed-precondition",
          "El cuestionario ya no está vinculado a un ítem válido del libro de notas."
        );
      }
      const scored = scoreQuizAnswers(
        quiz.get("questions"),
        key.get("answers"),
        draft.get("answers") || {}
      );
      const submittedAt = Timestamp.now();
      const resultData = {
        courseId: next.courseId,
        quizId: next.quizId,
        userId: request.auth.uid,
        gradeItemId,
        ...scored,
        submittedAt,
      };
      transaction.create(resultRef, resultData);
      transaction.update(draftRef, { submittedAt, updatedAt: submittedAt });
      const previousScores = storedScoreMap(grade.exists ? grade.get("scores") : {});
      const previousFeedback = storedFeedbackMap(grade.exists ? grade.get("feedback") : {});
      const previousValue = Object.hasOwn(previousScores, gradeItemId)
        ? previousScores[gradeItemId]
        : null;
      transaction.set(gradeRef, {
        uid: request.auth.uid,
        courseId: next.courseId,
        scores: { ...previousScores, [gradeItemId]: scored.grade },
        feedback: previousFeedback,
        updatedBy: actor.actorUid,
        updatedAt: submittedAt,
      });
      if (previousValue !== scored.grade) {
        const auditRef = db.collection("courses").doc(next.courseId).collection("gradeAudit").doc();
        transaction.create(auditRef, {
          targetType: "score",
          source: "quiz",
          courseId: next.courseId,
          quizId: next.quizId,
          studentId: request.auth.uid,
          gradeItemId,
          previousValue,
          newValue: scored.grade,
          ...actor,
          changedAt: submittedAt,
        });
      }
      return quizResultDto(resultData);
    });
    return result;
  } catch (cause) {
    throw callableError(cause);
  }
});

async function assertStudentsEnrolled(db, courseId, rows) {
  const refs = rows.map((row) =>
    db.collection("enrollments").doc(row.userId).collection("sections").doc(courseId)
  );
  const snapshots = await db.getAll(...refs);
  if (snapshots.some((snapshot) => !snapshot.exists || snapshot.get("role") !== "student")) {
    throw new HttpsError(
      "failed-precondition",
      "Todas las filas deben pertenecer a estudiantes matriculados en la sección."
    );
  }
}

async function inConcurrentGroups(items, limit, operation) {
  const results = [];
  for (let index = 0; index < items.length; index += limit) {
    results.push(...(await Promise.all(items.slice(index, index + limit).map(operation))));
  }
  return results;
}

// Implements: REQ-AUDIT-01, REQ-AUDIT-02, REQ-AUDIT-04, REQ-AUDIT-06
exports.saveAuditedStudentScores = onCall(APP_CHECK_OBSERVATION_OPTIONS, async (request) => {
  try {
    const { courseId, rows } = normalizeScoreRequest(request.data);
    const db = getFirestore();
    const actor = await authorizedGradeActor(request, db, courseId);
    await assertStudentsEnrolled(db, courseId, rows);
    const changesByRow = await inConcurrentGroups(rows, MAX_CONCURRENT_TRANSACTIONS, async (row) =>
      db.runTransaction(async (transaction) => {
        const gradeRef = db
          .collection("courses")
          .doc(courseId)
          .collection("grades")
          .doc(row.userId);
        const current = await transaction.get(gradeRef);
        const previousScores = storedScoreMap(current.exists ? current.get("scores") : {});
        const previousFeedback = storedFeedbackMap(current.exists ? current.get("feedback") : {});
        const changes = diffScores(previousScores, row.scores);
        if (changes.length === 0) return 0;
        const nextFeedback = { ...previousFeedback };
        const feedbackChanges = changes.flatMap((change) => {
          if (change.newValue !== null) return [];
          const feedbackChange = diffFeedback(previousFeedback, change.gradeItemId, null);
          if (!feedbackChange) return [];
          delete nextFeedback[change.gradeItemId];
          return [{ gradeItemId: change.gradeItemId, ...feedbackChange }];
        });
        transaction.set(gradeRef, {
          uid: row.userId,
          courseId,
          scores: row.scores,
          feedback: nextFeedback,
          updatedBy: actor.actorUid,
          updatedAt: FieldValue.serverTimestamp(),
        });
        for (const change of changes) {
          const auditRef = db.collection("courses").doc(courseId).collection("gradeAudit").doc();
          transaction.create(auditRef, {
            targetType: "score",
            courseId,
            studentId: row.userId,
            ...change,
            ...actor,
            changedAt: FieldValue.serverTimestamp(),
          });
        }
        for (const change of feedbackChanges) {
          const auditRef = db.collection("courses").doc(courseId).collection("gradeAudit").doc();
          transaction.create(auditRef, {
            targetType: "feedback",
            courseId,
            studentId: row.userId,
            ...change,
            ...actor,
            changedAt: FieldValue.serverTimestamp(),
          });
        }
        return changes.length + feedbackChanges.length;
      })
    );
    return { changedCount: changesByRow.reduce((total, count) => total + count, 0) };
  } catch (cause) {
    throw callableError(cause);
  }
});

exports.saveAuditedGradeFeedback = onCall(async (request) => {
  try {
    const next = normalizeFeedbackRequest(request.data);
    const db = getFirestore();
    const actor = await authorizedGradeActor(request, db, next.courseId);
    await assertStudentsEnrolled(db, next.courseId, [next]);
    const changedCount = await db.runTransaction(async (transaction) => {
      const gradeRef = db
        .collection("courses")
        .doc(next.courseId)
        .collection("grades")
        .doc(next.userId);
      const current = await transaction.get(gradeRef);
      const scores = storedScoreMap(current.exists ? current.get("scores") : {});
      if (!Object.hasOwn(scores, next.gradeItemId)) {
        throw new HttpsError(
          "failed-precondition",
          "La evaluación debe tener una nota oficial antes de recibir retroalimentación."
        );
      }
      const previousFeedback = storedFeedbackMap(current.get("feedback"));
      const change = diffFeedback(previousFeedback, next.gradeItemId, next.feedback);
      if (!change) return 0;
      const nextFeedback = { ...previousFeedback };
      if (next.feedback === null) delete nextFeedback[next.gradeItemId];
      else {
        if (
          !Object.hasOwn(nextFeedback, next.gradeItemId) &&
          Object.keys(nextFeedback).length >= 100
        ) {
          throw new GradeAuditInputError("Una fila admite como máximo 100 retroalimentaciones.");
        }
        nextFeedback[next.gradeItemId] = next.feedback;
      }
      transaction.set(
        gradeRef,
        {
          feedback: nextFeedback,
          updatedBy: actor.actorUid,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      const auditRef = db.collection("courses").doc(next.courseId).collection("gradeAudit").doc();
      transaction.create(auditRef, {
        targetType: "feedback",
        courseId: next.courseId,
        studentId: next.userId,
        gradeItemId: next.gradeItemId,
        ...change,
        ...actor,
        changedAt: FieldValue.serverTimestamp(),
      });
      return 1;
    });
    return { changedCount };
  } catch (cause) {
    throw callableError(cause);
  }
});

// Implements: REQ-AUDIT-02, REQ-AUDIT-04, REQ-AUDIT-07
exports.saveAuditedGradebook = onCall(APP_CHECK_OBSERVATION_OPTIONS, async (request) => {
  try {
    const next = normalizeGradebookRequest(request.data);
    const db = getFirestore();
    const actor = await authorizedGradeActor(request, db, next.courseId);
    const changedCount = await db.runTransaction(async (transaction) => {
      const gradebookRef = db
        .collection("courses")
        .doc(next.courseId)
        .collection("meta")
        .doc("gradebook");
      const current = await transaction.get(gradebookRef);
      const previousValue = current.exists ? storedGradebook(current.data()) : null;
      const newValue = { items: next.items, exemption: next.exemption };
      if (JSON.stringify(previousValue) === JSON.stringify(newValue)) return 0;
      transaction.set(gradebookRef, {
        courseId: next.courseId,
        ...newValue,
        updatedBy: actor.actorUid,
        updatedAt: FieldValue.serverTimestamp(),
      });
      const auditRef = db.collection("courses").doc(next.courseId).collection("gradeAudit").doc();
      transaction.create(auditRef, {
        targetType: "gradebook",
        courseId: next.courseId,
        studentId: null,
        previousValue,
        newValue,
        ...actor,
        changedAt: FieldValue.serverTimestamp(),
      });
      return 1;
    });
    return { changedCount };
  } catch (cause) {
    throw callableError(cause);
  }
});

/*
  Envío dirigido por token. El envío anterior iba a un topic
  `course_{id}_students`, y un topic no deja consultar la preferencia de cada
  destinatario: quien apagara los avisos de sección en Configuración los seguiría
  recibiendo. Ahora se resuelve la matrícula activa de la sección, se leen token y
  preferencia en un solo viaje por lote y se envía sólo a los dispositivos que
  quedan autorizados.

  El costo se acota en cada paso: la consulta de matrículas viaja con `select()`
  y no trae campos, los perfiles se piden con `getAll` y máscara de dos campos en
  lugar de un documento por viaje, los lotes van en paralelo, y un token que FCM
  declara muerto se borra en el acto para que la próxima publicación no vuelva a
  pagarlo.
*/
// Implements: REQ-CFG-04
const PROFILE_BATCH = 300;
const MULTICAST_BATCH = 500;
const DEAD_TOKEN_ERRORS = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

function chunk(items, size) {
  const batches = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

/**
 * Devuelve los uid con matrícula activa de estudiante en la sección. Las
 * matrículas retiradas no dejan documento: la proyección las borra en vez de
 * marcarlas, así que basta filtrar por sección y rango.
 */
async function enrolledStudentIds(db, courseId) {
  const snapshot = await db
    .collectionGroup("sections")
    .where("seccionId", "==", courseId)
    .where("role", "==", "student")
    .select()
    .get();
  const ids = [];
  for (const document of snapshot.docs) {
    const uid = document.ref.parent.parent && document.ref.parent.parent.id;
    if (uid) ids.push(uid);
  }
  return ids;
}

/**
 * Token de cada estudiante que no haya apagado el canal de publicaciones de
 * sección. La ausencia de preferencia significa canal activo: una cuenta que
 * nunca abrió Configuración recibe sus avisos igual.
 */
async function authorizedTokens(db, uids, channel) {
  const batches = chunk(uids, PROFILE_BATCH);
  const results = await Promise.all(
    batches.map((batch) =>
      db.getAll(...batch.map((uid) => db.collection("users").doc(uid)), {
        fieldMask: ["fcmToken", "pushChannels"],
      })
    )
  );
  const tokens = new Map();
  for (const snapshot of results.flat()) {
    if (!snapshot.exists) continue;
    const token = snapshot.get("fcmToken");
    if (typeof token !== "string" || !token) continue;
    const channels = snapshot.get("pushChannels");
    if (channels && channels[channel] === false) continue;
    tokens.set(token, snapshot.ref);
  }
  return tokens;
}

/** Borra los tokens que FCM declaró muertos para no reenviarles nunca más. */
async function pruneDeadTokens(db, refsByToken, tokens, responses) {
  const dead = [];
  responses.forEach((response, index) => {
    if (response.success) return;
    const code = response.error && response.error.code;
    if (DEAD_TOKEN_ERRORS.has(code)) dead.push(tokens[index]);
  });
  if (dead.length === 0) return 0;
  const writer = db.bulkWriter();
  for (const token of dead) {
    const ref = refsByToken.get(token);
    if (ref) writer.update(ref, { fcmToken: FieldValue.delete() });
  }
  await writer.close();
  return dead.length;
}

exports.notifyStudentsOnCoursePost = onDocumentCreated(
  "courses/{courseId}/posts/{postId}",
  async (event) => {
    if (!event.data) return;
    const post = event.data.data();
    if (post.notifyStudents === false) return;
    const courseId = event.params.courseId;
    const postId = event.params.postId;
    const db = getFirestore();

    const uids = await enrolledStudentIds(db, courseId);
    if (uids.length === 0) return;

    const refsByToken = await authorizedTokens(db, uids, "sectionPublications");
    if (refsByToken.size === 0) return;

    const title = text(post.title, "Nuevo material del curso", 100);
    const body = text(post.body, "Tu profesor publicó un aviso o archivo nuevo.", 240);
    const message = {
      data: {
        title,
        body,
        courseId,
        postId,
        kind: text(post.kind, "material", 40),
        target: `course:${courseId}`,
      },
      android: {
        priority: "high",
        notification: {
          channelId: "course_updates",
          sound: "default",
        },
      },
      apns: {
        payload: {
          aps: {
            alert: { title, body },
            sound: "default",
          },
        },
      },
    };

    const messaging = getMessaging();
    const batches = chunk([...refsByToken.keys()], MULTICAST_BATCH);
    const outcomes = await Promise.all(
      batches.map(async (tokens) => {
        const result = await messaging.sendEachForMulticast({ ...message, tokens });
        const pruned = await pruneDeadTokens(db, refsByToken, tokens, result.responses);
        return { sent: result.successCount, pruned };
      })
    );

    const sent = outcomes.reduce((total, outcome) => total + outcome.sent, 0);
    const pruned = outcomes.reduce((total, outcome) => total + outcome.pruned, 0);
    console.log(
      `[notifyStudentsOnCoursePost] ${courseId}: ${uids.length} matriculados, ${refsByToken.size} dispositivos autorizados, ${sent} entregados, ${pruned} tokens dados de baja.`
    );
  }
);

// Implements: REQ-PERF-09, REQ-SEC-01, REQ-SEC-13
exports.deleteMyAccount = onCall(APP_CHECK_OBSERVATION_OPTIONS, async (request) => {
  const uid = request.auth && request.auth.uid;
  if (!uid)
    throw new HttpsError("unauthenticated", "Debes iniciar sesión para eliminar tu cuenta.");

  const db = getFirestore();

  // Bloqueo incondicional de eliminación de la cuenta propietaria institucional
  const userProfile = await db.collection("users").doc(uid).get();
  if (userProfile.exists && userProfile.get("role") === "owner") {
    throw new HttpsError(
      "failed-precondition",
      "La cuenta propietaria no puede eliminarse."
    );
  }

  const bucket = getStorage().bucket();
  const [posts, progress] = await Promise.all([
    db.collectionGroup("posts").where("authorId", "==", uid).get(),
    db.collectionGroup("progress").where("uid", "==", uid).get(),
  ]);

  // Clean up storage files dynamically
  const storageDeletions = [];
  for (const document of posts.docs) {
    const storagePath = text(document.get("storagePath"), "", 900);
    if (storagePath.startsWith("courses/") && storagePath.includes(`/${uid}/`)) {
      storageDeletions.push(bucket.file(storagePath).delete({ ignoreNotFound: true }));
    }
  }
  await Promise.all(storageDeletions);

  // Batch delete Firestore documents in chunks of up to 400 operations
  const allDocRefs = [
    ...posts.docs.map((doc) => doc.ref),
    ...progress.docs.map((doc) => doc.ref),
    db.collection("users").doc(uid),
  ];

  const BATCH_SIZE = 400;
  for (let i = 0; i < allDocRefs.length; i += BATCH_SIZE) {
    const chunk = allDocRefs.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const ref of chunk) {
      batch.delete(ref);
    }
    await batch.commit();
  }

  await getAuth().deleteUser(uid);
  return { deleted: true };
});
