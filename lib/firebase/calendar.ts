import { firestore, currentUser } from "./sdk.ts";
import { normalizeTime, validateBlock } from "../planner.ts";
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
  let stop: () => void = () => undefined;

  Promise.all([firestore(), currentUser()])
    .then(([{ sdk, db }, user]) => {
      if (!active) return;
      stop = sdk.onSnapshot(
        sdk.query(
          sdk.collection(db, "users", user.uid, "calendar_events"),
          sdk.where("date", ">=", fromDate),
          sdk.where("date", "<=", toDate)
        ),
        (snapshot) => onChange(snapshot.docs.map(toPersonalEvent)),
        (cause) => onError(personalEventError(cause, "leer"))
      );
    })
    .catch((cause) => onError(personalEventError(cause, "leer")));

  return () => {
    active = false;
    stop();
  };
}

export async function savePersonalEvent(input: PersonalEventInput) {
  const problem = validateBlock(input);
  if (problem) throw new Error(problem);
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
    const created = await sdk.addDoc(events, {
      ...values,
      completed: false,
      createdAt: sdk.serverTimestamp(),
    });
    return created.id;
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
