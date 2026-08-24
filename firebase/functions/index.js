const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");
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

initializeApp();
setGlobalOptions({ region: "southamerica-west1", maxInstances: 4 });

function text(value, fallback, limit) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return (normalized || fallback).slice(0, limit);
}

function callableError(cause) {
  if (cause instanceof HttpsError) return cause;
  if (cause instanceof GradeAuditInputError) {
    return new HttpsError("invalid-argument", cause.message);
  }
  console.error("[grade-audit] Error inesperado:", cause);
  return new HttpsError("internal", "No fue posible guardar el libro de notas.");
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
exports.saveAuditedStudentScores = onCall(async (request) => {
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
exports.saveAuditedGradebook = onCall(async (request) => {
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

exports.notifyStudentsOnCoursePost = onDocumentCreated(
  "courses/{courseId}/posts/{postId}",
  async (event) => {
    if (!event.data) return;
    const post = event.data.data();
    if (post.notifyStudents === false) return;
    const courseId = event.params.courseId;
    const postId = event.params.postId;
    const topicCourse = courseId.replace(/[^a-zA-Z0-9-_.~%]/g, "_");
    const title = text(post.title, "Nuevo material del curso", 100);
    const body = text(post.body, "Tu profesor publicó un aviso o archivo nuevo.", 240);
    await getMessaging().send({
      topic: `course_${topicCourse}_students`,
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
    });
  }
);

// Implements: REQ-PERF-09
exports.deleteMyAccount = onCall(async (request) => {
  const uid = request.auth && request.auth.uid;
  if (!uid)
    throw new HttpsError("unauthenticated", "Debes iniciar sesión para eliminar tu cuenta.");
  const db = getFirestore();
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
