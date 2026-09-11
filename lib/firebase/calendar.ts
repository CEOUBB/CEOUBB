import { firestore, currentUser } from "./sdk.ts";
import { normalizeTime, validateBlock, weeklyDates } from "../planner.ts";
import type { PersonalEvent, PersonalEventKind } from "../planner.ts";
import { personalKind, toPersonalEvent } from "./mappers.ts";

export type PersonalEventInput = {
  id?: string;
  title: string;
  detail: string;
  date: string;
  startTime: string;
  endTime: string;
  courseId: string | null;
  kind: PersonalEventKind;
  repeatUntil?: string;
};

/**
 * Traduce los fallos de Firestore a algo que un estudiante pueda leer y accionar.
 * `permission-denied` es el caso real cuando las reglas del calendario no están publicadas.
 */
export function personalEventError(
  cause: unknown,
  action: "leer" | "guardar" | "eliminar"
): string {
  const code = String((cause as { code?: unknown })?.code ?? "");
  if (code.endsWith("permission-denied"))
    return "Tu calendario personal todavía no está habilitado en el servidor. Avisa al equipo de CEOUBB.";
  if (code.endsWith("unavailable") || code.endsWith("network-request-failed"))
    return "Sin conexión con el servidor. Revisa tu red e inténtalo otra vez.";
  if (code.endsWith("unauthenticated"))
    return "Tu sesión expiró. Cierra sesión y vuelve a ingresar.";
  if (action === "leer") return "No se pudieron sincronizar tus bloques de estudio.";
  return `No se pudo ${action} el bloque.`;
}

export function watchPersonalEvents(
  fromDate: string,
  toDate: string,
  onChange: (items: PersonalEvent[]) => void,
  onError: (message: string) => void
) {
  let active = true;
  const stops: (() => void)[] = [];

  Promise.all([firestore(), currentUser()])
    .then(([{ sdk, db }, user]) => {
      if (!active) return;
      const pages: PersonalEvent[][] = [];
      // Implements: REQ-CEO72-04 — páginas reactivas con cursor estable.
      const subscribe = (
        page: number,
        cursor?: import("firebase/firestore").QueryDocumentSnapshot
      ) => {
        stops[page] = sdk.onSnapshot(
          sdk.query(
            sdk.collection(db, "users", user.uid, "calendar_events"),
            sdk.where("date", ">=", fromDate),
            sdk.where("date", "<=", toDate),
            sdk.orderBy("date"),
            sdk.orderBy(sdk.documentId()),
            ...(cursor ? [sdk.startAfter(cursor)] : []),
            sdk.limit(200)
          ),
          (snapshot) => {
            if (!active) return;
            stops.splice(page + 1).forEach((stop) => stop());
            pages.splice(page, pages.length - page, snapshot.docs.map(toPersonalEvent));
            if (snapshot.size === 200) subscribe(page + 1, snapshot.docs.at(-1));
            else onChange(pages.flat());
          },
          (cause) => {
            if (active) onError(personalEventError(cause, "leer"));
          }
        );
      };
      subscribe(0);
    })
    .catch((cause) => {
      if (active) onError(personalEventError(cause, "leer"));
    });

  return () => {
    active = false;
    stops.forEach((stop) => stop());
  };
}

export async function savePersonalEvent(input: PersonalEventInput) {
  const problem = validateBlock(input);
  if (problem) throw new Error(problem);
  const dates = weeklyDates(input.date, input.id ? undefined : input.repeatUntil);
  const [{ sdk, db }, user] = await Promise.all([firestore(), currentUser()]);
  const values = {
    userId: user.uid,
    title: input.title.trim().slice(0, 120),
    detail: input.detail.trim().slice(0, 400),
    date: input.date,
    startTime: normalizeTime(input.startTime),
    endTime: normalizeTime(input.endTime),
    courseId: input.courseId || null,
    kind: personalKind(input.kind),
    updatedAt: sdk.serverTimestamp(),
  };
  const events = sdk.collection(db, "users", user.uid, "calendar_events");
  try {
    if (input.id) {
      await sdk.updateDoc(sdk.doc(events, input.id), values);
      return input.id;
    }
    // Implements: REQ-CEO72-02 — todo el horario se guarda atómicamente.
    const batch = sdk.writeBatch(db);
    const refs = dates.map((date) => {
      const ref = sdk.doc(events);
      batch.set(ref, { ...values, date, completed: false, createdAt: sdk.serverTimestamp() });
      return ref;
    });
    await batch.commit();
    return refs[0].id;
  } catch (cause) {
    throw new Error(personalEventError(cause, "guardar"), { cause });
  }
}

export async function setPersonalEventCompleted(id: string, completed: boolean) {
  const [{ sdk, db }, user] = await Promise.all([firestore(), currentUser()]);
  await sdk
    .updateDoc(sdk.doc(db, "users", user.uid, "calendar_events", id), {
      completed,
      updatedAt: sdk.serverTimestamp(),
    })
    .catch((cause) => {
      throw new Error(personalEventError(cause, "guardar"), { cause });
    });
}

export async function deletePersonalEvent(id: string) {
  const [{ sdk, db }, user] = await Promise.all([firestore(), currentUser()]);
  await sdk.deleteDoc(sdk.doc(db, "users", user.uid, "calendar_events", id)).catch((cause) => {
    throw new Error(personalEventError(cause, "eliminar"), { cause });
  });
}
