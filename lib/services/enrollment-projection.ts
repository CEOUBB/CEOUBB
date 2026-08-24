import { createSign } from "node:crypto";
import { SECTION_ROLES, type SectionRole } from "../section-roles.ts";

/*
  Proyección unidireccional Turso -> Firestore. Turso manda; Firestore sólo
  recibe un marcador mínimo por matrícula activa para que `exists()` en las
  reglas pueda aislar cada sección sin leer la base relacional.

  Es idempotente por construcción: escribir dos veces la misma matrícula deja el
  mismo documento, y una matrícula que deja de estar activa borra su marcador
  para que la regla vuelva a denegar de inmediato.
*/
// Implements: REQ-ACAD-02

export const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "centro-de-estudio-ubb";

/** Firestore acepta 500 escrituras por commit; 400 deja margen ante reintentos. */
export const MAX_WRITES_PER_COMMIT = 400;

const ENROLLMENT_STATES = ["activa", "retirada", "congelada"] as const;

export type EnrollmentStatus = (typeof ENROLLMENT_STATES)[number];

export type EnrollmentProjection = {
  seccionId: string;
  userId: string;
  role: SectionRole;
  status: EnrollmentStatus;
  updatedAt?: string;
};

type FirestoreWrite =
  | {
      update: { name: string; fields: Record<string, { stringValue: string }> };
      updateMask: { fieldPaths: string[] };
    }
  | { delete: string };

/** Un segmento de ruta de Firestore no puede ir vacío ni contener separadores. */
export function isValidPathSegment(value: unknown): value is string {
  return (
    typeof value === "string" && value.length > 0 && value.length <= 1500 && !/[/\s]/.test(value)
  );
}

export function parseEnrollmentProjection(value: unknown): EnrollmentProjection {
  const input = (value ?? {}) as Partial<EnrollmentProjection>;
  const rawUserId =
    typeof input.userId === "string" ? input.userId.replace(/^firebase:/, "") : input.userId;
  if (!isValidPathSegment(input.seccionId))
    throw new Error("La matrícula no trae un identificador de sección válido.");
  if (!isValidPathSegment(rawUserId))
    throw new Error("La matrícula no trae un identificador de usuario válido.");
  if (!SECTION_ROLES.includes(input.role as SectionRole))
    throw new Error("La matrícula no trae un rol de sección válido.");
  if (!ENROLLMENT_STATES.includes(input.status as EnrollmentStatus))
    throw new Error("La matrícula no trae un estado válido.");
  return {
    seccionId: input.seccionId,
    userId: rawUserId,
    role: input.role as SectionRole,
    status: input.status as EnrollmentStatus,
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : undefined,
  };
}

/** Ruta REST del marcador de matrícula: `/enrollments/{uid}/sections/{seccionId}`. */
// Implements: REQ-SEC-07
export function enrollmentDocumentPath(
  userId: string,
  seccionId: string,
  projectId = FIREBASE_PROJECT_ID
) {
  const cleanUid = userId.startsWith("firebase:") ? userId.replace("firebase:", "") : userId;
  return `projects/${projectId}/databases/(default)/documents/enrollments/${cleanUid}/sections/${seccionId}`;
}

/** Parte una lista de operaciones en lotes que Firestore acepta de una vez. */
export function chunkWrites<T>(items: T[], size = MAX_WRITES_PER_COMMIT): T[][] {
  const limit = Math.max(1, Math.trunc(size));
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += limit) {
    batches.push(items.slice(index, index + limit));
  }
  return batches;
}

/** Traduce una matrícula a la escritura REST que le corresponde. */
export function toFirestoreWrite(
  entry: EnrollmentProjection,
  projectId = FIREBASE_PROJECT_ID
): FirestoreWrite {
  const name = enrollmentDocumentPath(entry.userId, entry.seccionId, projectId);
  if (entry.status !== "activa") return { delete: name };
  const updatedAt = entry.updatedAt ?? new Date().toISOString();
  return {
    update: {
      name,
      fields: {
        seccionId: { stringValue: entry.seccionId },
        role: { stringValue: entry.role },
        status: { stringValue: entry.status },
        updatedAt: { stringValue: updatedAt },
      },
    },
    updateMask: { fieldPaths: ["seccionId", "role", "status", "updatedAt"] },
  };
}

/**
 * Proyecta una matrícula. Devuelve la escritura aplicada para que quien llama
 * pueda registrarla en su propia bitácora.
 */
// Implements: REQ-ACAD-02
export async function projectEnrollmentToFirestore(
  seccionId: string,
  userId: string,
  role: SectionRole,
  status: EnrollmentStatus = "activa"
): Promise<FirestoreWrite> {
  const [write] = await projectEnrollments([{ seccionId, userId, role, status }]);
  return write;
}

/**
 * Proyecta la mutación de un rol de usuario a Firestore usando credenciales de servicio.
 */
// Implements: REQ-SEC-10
export async function projectUserRoleToFirestore(
  userId: string,
  role: "teacher" | "student",
  projectId = FIREBASE_PROJECT_ID
): Promise<void> {
  const clientEmail = process.env.FIREBASE_SERVICE_ACCOUNT_EMAIL ?? "";
  const privateKey = process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "";
  if (!clientEmail || !privateKey) {
    return;
  }

  const cleanUid = userId.startsWith("firebase:") ? userId.replace("firebase:", "") : userId;
  const name = `projects/${projectId}/databases/(default)/documents/users/${cleanUid}`;
  const write: FirestoreWrite = {
    update: {
      name,
      fields: {
        role: { stringValue: role },
      },
    },
    updateMask: { fieldPaths: ["role"] },
  };
  try {
    const token = await accessToken();
    await commit([write], token);
  } catch (err) {
    console.error("[projectUserRoleToFirestore] Error projecting role to Firestore:", err);
    throw err;
  }
}

/** Proyecta muchas matrículas particionando en lotes de `MAX_WRITES_PER_COMMIT`. */
// Implements: REQ-ACAD-02
export async function projectEnrollments(
  entries: EnrollmentProjection[]
): Promise<FirestoreWrite[]> {
  const writes = entries.map((entry) => toFirestoreWrite(parseEnrollmentProjection(entry)));
  if (writes.length === 0) return [];
  const token = await accessToken();
  for (const batch of chunkWrites(writes)) {
    await commit(batch, token);
  }
  return writes;
}

async function commit(writes: FirestoreWrite[], token: string) {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:commit`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ writes }),
    }
  );
  if (!response.ok) {
    throw new Error(
      `Firestore rechazó la proyección de matrículas (HTTP ${response.status}). Revisa la cuenta de servicio y las reglas.`
    );
  }
}

let cachedToken: { value: string; expiresAt: number } | null = null;

/*
  Sin firebase-admin en el servidor web: se firma un JWT RS256 con la cuenta de
  servicio y se canjea por un token OAuth. Se cachea hasta 60 s antes de vencer.
*/
async function accessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt > now + 60) return cachedToken.value;

  const clientEmail = process.env.FIREBASE_SERVICE_ACCOUNT_EMAIL ?? "";
  const privateKey = (process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) {
    throw new Error(
      "Faltan FIREBASE_SERVICE_ACCOUNT_EMAIL y FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY para proyectar matrículas."
    );
  }

  const claim = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64url(JSON.stringify(claim))}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(privateKey, "base64url");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
  });
  if (!response.ok) {
    throw new Error("La cuenta de servicio de Firebase no pudo autenticarse contra Google OAuth.");
  }
  const token = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!token.access_token) throw new Error("Google OAuth no devolvió un token de acceso.");
  cachedToken = { value: token.access_token, expiresAt: now + (token.expires_in ?? 3600) };
  return cachedToken.value;
}

function base64url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}
