import type { DocumentData, DocumentSnapshot, QueryDocumentSnapshot } from "firebase/firestore";
import type { AccountRole } from "../access-policy.ts";
import {
  MAX_COMMUNICATION_ITEMS,
  canListStudentThreads,
  mergeMessageThreads,
  normalizeMessageBody,
  type CommunicationReadCursor,
  type CommunicationState,
  type DirectMessage,
  type MessageThreadSummary,
} from "../communications.ts";
import type { SectionMembership } from "../section-roles.ts";
import { firestore, currentUser, emailOf } from "./sdk.ts";
import { syncProfile } from "./profile.ts";
import { iso } from "./mappers.ts";
import { watchableSections } from "./posts.ts";

export const MAX_THREAD_SUMMARIES_PER_SECTION = 25;
export const MAX_MESSAGES_PER_THREAD = 100;
export const MAX_READ_CURSORS = 200;

type FirestoreDocument = DocumentSnapshot<DocumentData> | QueryDocumentSnapshot<DocumentData>;

function toThread(document: FirestoreDocument, courseId: string): MessageThreadSummary {
  const value = document.data() ?? {};
  return {
    id: document.id,
    courseId,
    studentId: String(value.studentId ?? document.id),
    studentName: String(value.studentName || value.studentEmail || "Estudiante"),
    studentEmail: String(value.studentEmail ?? ""),
    latestBody: String(value.latestBody ?? ""),
    latestAuthorId: String(value.latestAuthorId ?? ""),
    latestAuthorName: String(value.latestAuthorName || "Equipo docente"),
    createdAt: iso(value.createdAt),
    updatedAt: iso(value.updatedAt),
  };
}

function toMessage(document: QueryDocumentSnapshot<DocumentData>): DirectMessage {
  const value = document.data();
  return {
    id: document.id,
    courseId: String(value.courseId ?? ""),
    threadId: String(value.threadId ?? ""),
    authorId: String(value.authorId ?? ""),
    authorName: String(value.authorName || "Participante"),
    body: String(value.body ?? ""),
    createdAt: iso(value.createdAt),
  };
}

function toCursor(document: QueryDocumentSnapshot<DocumentData>): CommunicationReadCursor {
  const value = document.data();
  return {
    key: String(value.key || document.id),
    readAt: iso(value.readAt),
  };
}

function communicationError(cause: unknown, fallback: string): string {
  const code = typeof cause === "object" && cause && "code" in cause ? String(cause.code) : "";
  if (code === "permission-denied") return "No tienes permiso para acceder a esta conversación.";
  if (code === "unauthenticated") return "Tu sesión expiró. Vuelve a ingresar.";
  return fallback;
}

export function watchCommunications(
  memberships: readonly SectionMembership[],
  accountRole: AccountRole,
  onChange: (state: CommunicationState) => void,
  onError: (message: string) => void
) {
  let active = true;
  const stops: (() => void)[] = [];
  const threadsBySection = new Map<string, MessageThreadSummary[]>();
  let cursors: CommunicationReadCursor[] = [];
  const membershipBySection = new Map(
    memberships.map((membership) => [membership.sectionId, membership])
  );
  const sections = watchableSections(memberships.map((membership) => membership.sectionId));
  const emit = () => {
    if (!active) return;
    onChange({ threads: mergeMessageThreads(threadsBySection), cursors });
  };

  onChange({ threads: [], cursors: [] });

  Promise.all([firestore(), syncProfile()])
    .then(([{ sdk, db }, user]) => {
      if (!active) return;
      stops.push(
        sdk.onSnapshot(
          sdk.query(
            sdk.collection(db, "users", user.uid, "notificationReads"),
            sdk.orderBy("readAt", "desc"),
            sdk.limit(MAX_READ_CURSORS)
          ),
          (snapshot) => {
            cursors = snapshot.docs.map(toCursor);
            emit();
          },
          (cause) =>
            onError(communicationError(cause, "No se pudo sincronizar el estado de lectura."))
        )
      );

      for (const courseId of sections) {
        const membership = membershipBySection.get(courseId);
        if (!membership) continue;
        if (canListStudentThreads(accountRole, membership.role)) {
          stops.push(
            sdk.onSnapshot(
              sdk.query(
                sdk.collection(db, "courses", courseId, "messageThreads"),
                sdk.orderBy("updatedAt", "desc"),
                sdk.limit(MAX_THREAD_SUMMARIES_PER_SECTION)
              ),
              (snapshot) => {
                threadsBySection.set(
                  courseId,
                  snapshot.docs.map((document) => toThread(document, courseId))
                );
                emit();
              },
              (cause) =>
                onError(communicationError(cause, "No se pudieron sincronizar los mensajes."))
            )
          );
        } else {
          stops.push(
            sdk.onSnapshot(
              sdk.doc(db, "courses", courseId, "messageThreads", user.uid),
              (snapshot) => {
                threadsBySection.set(
                  courseId,
                  snapshot.exists() ? [toThread(snapshot, courseId)] : []
                );
                emit();
              },
              (cause) =>
                onError(communicationError(cause, "No se pudieron sincronizar los mensajes."))
            )
          );
        }
      }
    })
    .catch((cause) =>
      onError(communicationError(cause, "No se pudo conectar el centro de comunicaciones."))
    );

  return () => {
    active = false;
    for (const stop of stops) stop();
  };
}

export function watchDirectMessages(
  courseId: string,
  threadId: string,
  onChange: (messages: DirectMessage[]) => void,
  onError: (message: string) => void
) {
  let active = true;
  let stop: (() => void) | undefined;

  firestore()
    .then(({ sdk, db }) => {
      if (!active) return;
      stop = sdk.onSnapshot(
        sdk.query(
          sdk.collection(db, "courses", courseId, "messageThreads", threadId, "messages"),
          sdk.orderBy("createdAt", "asc"),
          sdk.limitToLast(MAX_MESSAGES_PER_THREAD)
        ),
        (snapshot) => onChange(snapshot.docs.map(toMessage)),
        (cause) => onError(communicationError(cause, "No se pudo cargar esta conversación."))
      );
    })
    .catch((cause) => onError(communicationError(cause, "No se pudo cargar esta conversación.")));

  return () => {
    active = false;
    stop?.();
  };
}

export async function sendDirectMessage(courseId: string, threadId: string, value: string) {
  const body = normalizeMessageBody(value);
  const [{ sdk, db }, user] = await Promise.all([firestore(), currentUser()]);
  const threadReference = sdk.doc(db, "courses", courseId, "messageThreads", threadId);
  const messageReference = sdk.doc(sdk.collection(threadReference, "messages"));
  const authorName = (user.displayName ?? "").trim() || emailOf(user) || "Participante";

  try {
    await sdk.runTransaction(db, async (transaction) => {
      const existing = await transaction.get(threadReference);
      if (!existing.exists() && user.uid !== threadId) {
        throw new Error("La conversación ya no está disponible.");
      }
      const latest = {
        latestBody: body,
        latestAuthorId: user.uid,
        latestAuthorName: authorName.slice(0, 120),
        updatedAt: sdk.serverTimestamp(),
      };
      if (existing.exists()) {
        transaction.update(threadReference, latest);
      } else {
        transaction.set(threadReference, {
          courseId,
          studentId: user.uid,
          studentName: authorName.slice(0, 120),
          studentEmail: emailOf(user),
          ...latest,
          createdAt: sdk.serverTimestamp(),
        });
      }
      transaction.set(messageReference, {
        courseId,
        threadId,
        authorId: user.uid,
        authorName: authorName.slice(0, 120),
        body,
        createdAt: sdk.serverTimestamp(),
      });
    });
  } catch (cause) {
    if (cause instanceof Error && cause.message === "La conversación ya no está disponible.") {
      throw cause;
    }
    throw new Error(
      communicationError(cause, "No se pudo enviar el mensaje. Inténtalo nuevamente."),
      { cause }
    );
  }
}

export async function markCommunicationRead(keys: readonly string[]) {
  const uniqueKeys = [
    ...new Set(keys.filter((key) => key && !key.includes("/") && key.length <= 180)),
  ]
    .sort()
    .slice(0, MAX_COMMUNICATION_ITEMS + 40);
  if (uniqueKeys.length === 0) return;
  const [{ sdk, db }, user] = await Promise.all([firestore(), currentUser()]);
  const batch = sdk.writeBatch(db);
  for (const key of uniqueKeys) {
    batch.set(sdk.doc(db, "users", user.uid, "notificationReads", key), {
      key,
      readAt: sdk.serverTimestamp(),
    });
  }
  try {
    await batch.commit();
  } catch (cause) {
    throw new Error(communicationError(cause, "No se pudo actualizar el estado de lectura."), {
      cause,
    });
  }
}
