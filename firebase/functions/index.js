const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { getStorage } = require("firebase-admin/storage");
const { setGlobalOptions } = require("firebase-functions/v2");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { HttpsError, onCall } = require("firebase-functions/v2/https");

initializeApp();
setGlobalOptions({ region: "southamerica-west1", maxInstances: 4 });

function text(value, fallback, limit) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return (normalized || fallback).slice(0, limit);
}

exports.notifyStudentsOnCoursePost = onDocumentCreated(
  "courses/{courseId}/posts/{postId}",
  async (event) => {
    if (!event.data) return;
    const post = event.data.data();
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
