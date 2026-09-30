const ACTIVITY_FIELDS = ["title", "kind", "dueDate", "createdAt"];

// Implements: REQ-PERF-LOAD-03
function compactActivity(post) {
  const activity = {
    title: String(post.title ?? "Publicación"),
    kind: String(post.kind ?? "notice"),
    dueDate: String(post.dueDate ?? ""),
  };

  if (post.createdAt !== undefined) activity.createdAt = post.createdAt;
  return activity;
}

// Implements: REQ-PERF-LOAD-03
async function projectCourseActivity(db, courseId, postId, dryRun = false) {
  const post = db.doc(`courses/${courseId}/posts/${postId}`);
  const activity = db.doc(`courses/${courseId}/activity/${postId}`);
  return db.runTransaction(async (transaction) => {
    const [source, destination] = await transaction.getAll(post, activity);

    if (!source.exists) {
      if (destination.exists && !dryRun) transaction.delete(activity);
      return { changed: destination.exists, exists: false };
    }
    const compact = compactActivity(source.data());
    const stored = destination.exists ? destination.data() : {};
    const unchanged =
      destination.exists &&
      Object.keys(stored).length === Object.keys(compact).length &&
      ACTIVITY_FIELDS.every((key) => JSON.stringify(stored[key]) === JSON.stringify(compact[key]));

    if (!unchanged && !dryRun) transaction.set(activity, compact);
    return { changed: !unchanged, exists: true };
  });
}

module.exports = { compactActivity, projectCourseActivity };
