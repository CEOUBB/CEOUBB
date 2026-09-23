import { resolveQaRuntime, type QaEnvironment } from "./qa-runtime.ts";

// Implements: REQ-QA-02, REQ-QA-03
export function firebaseRestOrigins(environment: QaEnvironment = process.env) {
  const qa = resolveQaRuntime(environment);
  return {
    auth: qa
      ? `${qa.auth.origin}/identitytoolkit.googleapis.com`
      : "https://identitytoolkit.googleapis.com",
    firestore: qa?.firestore.origin ?? "https://firestore.googleapis.com",
    storage: qa?.storage.origin ?? "https://storage.googleapis.com",
    storageDownload: qa?.storage.origin ?? "https://firebasestorage.googleapis.com",
  };
}
