import { isSectionRole, type SectionRole } from "./section-roles.ts";

export const PARTICIPANT_PAGE_SIZE = 24;
export const PARTICIPANT_PAGE_LIMIT = 50;
export const PARTICIPANT_QUERY_MAX_LENGTH = 80;
export const COMPLETE_ROSTER_LIMIT = 12_000;
export const COMPLETE_ROSTER_PAGE_LIMIT = Math.ceil(COMPLETE_ROSTER_LIMIT / PARTICIPANT_PAGE_LIMIT);

export const PARTICIPANT_ROLE_FILTERS = ["all", "teaching", "assistant", "student"] as const;

export type ParticipantRoleFilter = (typeof PARTICIPANT_ROLE_FILTERS)[number];
export type ParticipantGroup = Exclude<ParticipantRoleFilter, "all">;

export type ParticipantDirectoryEntry = {
  id: string;
  name: string;
  email: string;
  role: SectionRole;
};

export type ParticipantRoleCounts = Record<SectionRole, number>;

export type ParticipantDirectoryPage = {
  items: ParticipantDirectoryEntry[];
  counts: ParticipantRoleCounts;
  nextCursor: string | null;
};

export type ParticipantDirectoryRequest = {
  query: string;
  role: ParticipantRoleFilter;
  roles: readonly SectionRole[] | undefined;
  cursor: string | null;
  limit: number;
};

export function emptyParticipantCounts(): ParticipantRoleCounts {
  return { teacher: 0, coordinator: 0, assistant: 0, student: 0 };
}

export function isParticipantRoleFilter(value: unknown): value is ParticipantRoleFilter {
  return (
    typeof value === "string" && PARTICIPANT_ROLE_FILTERS.includes(value as ParticipantRoleFilter)
  );
}

export function participantRolesForFilter(
  filter: ParticipantRoleFilter
): readonly SectionRole[] | undefined {
  if (filter === "teaching") return ["teacher", "coordinator"];
  if (filter === "assistant") return ["assistant"];
  if (filter === "student") return ["student"];
  return undefined;
}

export function participantGroupForRole(role: SectionRole): ParticipantGroup {
  if (role === "teacher" || role === "coordinator") return "teaching";
  return role;
}

export function groupParticipants(
  participants: readonly ParticipantDirectoryEntry[]
): Record<ParticipantGroup, ParticipantDirectoryEntry[]> {
  const groups: Record<ParticipantGroup, ParticipantDirectoryEntry[]> = {
    teaching: [],
    assistant: [],
    student: [],
  };
  for (const participant of participants) {
    groups[participantGroupForRole(participant.role)].push(participant);
  }
  return groups;
}

export function participantGroupCount(
  counts: ParticipantRoleCounts,
  group: ParticipantGroup
): number {
  if (group === "teaching") return counts.teacher + counts.coordinator;
  return counts[group];
}

export function participantCount(counts: ParticipantRoleCounts): number {
  return counts.teacher + counts.coordinator + counts.assistant + counts.student;
}

export function participantContactHref(
  email: string,
  courseCode: string,
  section: string
): string | null {
  const recipient = email.trim();
  if (!/^[^\s@?&]+@[^\s@?&]+\.[^\s@?&]+$/.test(recipient)) return null;
  const subject = `Consulta ${courseCode.trim()} · Sección ${section.trim()}`;
  return `mailto:${recipient}?subject=${encodeURIComponent(subject)}`;
}

export function parseParticipantDirectoryRequest(
  requestUrl: string
): ParticipantDirectoryRequest | { error: string } {
  const params = new URL(requestUrl).searchParams;
  const query = (params.get("q") ?? "").trim();
  if (query.length > PARTICIPANT_QUERY_MAX_LENGTH)
    return { error: `La búsqueda no puede superar ${PARTICIPANT_QUERY_MAX_LENGTH} caracteres.` };

  const rawRole = params.get("role") ?? "all";
  if (!isParticipantRoleFilter(rawRole)) return { error: "El filtro de rol no es válido." };

  const rawCursor = params.get("cursor")?.trim() || null;
  if (rawCursor && rawCursor.length > 160) return { error: "El cursor no es válido." };

  const rawLimit = params.get("limit");
  if (rawLimit && !/^\d+$/.test(rawLimit)) return { error: "El límite no es válido." };
  const requestedLimit = rawLimit ? Number.parseInt(rawLimit, 10) : PARTICIPANT_PAGE_SIZE;
  const limit = Math.max(1, Math.min(PARTICIPANT_PAGE_LIMIT, requestedLimit));

  return {
    query,
    role: rawRole,
    roles: participantRolesForFilter(rawRole),
    cursor: rawCursor,
    limit,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseCount(value: unknown): number | null {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : null;
}

export function parseParticipantDirectoryPage(value: unknown): ParticipantDirectoryPage | null {
  if (!isRecord(value) || !Array.isArray(value.items) || !isRecord(value.counts)) return null;
  if (value.items.length > PARTICIPANT_PAGE_LIMIT) return null;

  const counts = emptyParticipantCounts();
  for (const role of ["teacher", "coordinator", "assistant", "student"] as const) {
    const count = parseCount(value.counts[role]);
    if (count === null) return null;
    counts[role] = count;
  }

  const items: ParticipantDirectoryEntry[] = [];
  const ids = new Set<string>();
  for (const item of value.items) {
    if (!isRecord(item)) return null;
    const { id, name, email, role } = item;
    if (
      typeof id !== "string" ||
      !id ||
      ids.has(id) ||
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !isSectionRole(role)
    )
      return null;
    ids.add(id);
    items.push({ id, name: name.trim(), email: email.trim(), role });
  }

  const nextCursor = value.nextCursor;
  if (nextCursor !== null && (typeof nextCursor !== "string" || nextCursor.length > 160))
    return null;
  return { items, counts, nextCursor };
}

export function participantDirectoryUrl(
  sectionId: string,
  query: string,
  role: ParticipantRoleFilter,
  cursor?: string | null,
  limit = PARTICIPANT_PAGE_SIZE
): string {
  const params = new URLSearchParams({
    role,
    limit: String(Math.max(1, Math.min(PARTICIPANT_PAGE_LIMIT, Math.trunc(limit)))),
  });
  if (query) params.set("q", query);
  if (cursor) params.set("cursor", cursor);
  return `/api/sections/${encodeURIComponent(sectionId)}/participants?${params}`;
}

export async function loadParticipantDirectoryPage(
  sectionId: string,
  query: string,
  role: ParticipantRoleFilter,
  cursor: string | null,
  signal?: AbortSignal,
  limit = PARTICIPANT_PAGE_SIZE
): Promise<ParticipantDirectoryPage> {
  const response = await fetch(participantDirectoryUrl(sectionId, query, role, cursor, limit), {
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : "No se pudo cargar el directorio completo.";
    throw new Error(message);
  }
  const payload: unknown = await response.json().catch(() => null);
  const page = parseParticipantDirectoryPage(payload);
  if (!page) throw new Error("El directorio recibió una respuesta no válida.");
  return page;
}

// Implements: REQ-ACTA-05
export async function loadCompleteStudentDirectory(
  sectionId: string,
  signal?: AbortSignal
): Promise<ParticipantDirectoryEntry[]> {
  const students: ParticipantDirectoryEntry[] = [];
  const ids = new Set<string>();
  const cursors = new Set<string>();
  let cursor: string | null = null;
  let expectedTotal: number | null = null;
  let pages = 0;
  do {
    pages += 1;
    if (pages > COMPLETE_ROSTER_PAGE_LIMIT) {
      throw new Error("La nómina excedió el máximo de páginas permitido.");
    }
    const page = await loadParticipantDirectoryPage(
      sectionId,
      "",
      "student",
      cursor,
      signal,
      PARTICIPANT_PAGE_LIMIT
    );
    if (expectedTotal === null) expectedTotal = page.counts.student;
    else if (expectedTotal !== page.counts.student) {
      throw new Error(
        "La nómina cambió durante la carga. Reintenta para generar una acta consistente."
      );
    }
    for (const student of page.items) {
      if (student.role !== "student" || ids.has(student.id)) {
        throw new Error("La nómina de la sección contiene filas inconsistentes.");
      }
      ids.add(student.id);
      students.push(student);
    }
    if (students.length > COMPLETE_ROSTER_LIMIT) {
      throw new Error(
        `La nómina supera el máximo de ${COMPLETE_ROSTER_LIMIT.toLocaleString("es-CL")} estudiantes.`
      );
    }
    cursor = page.nextCursor;
    if (cursor && cursors.has(cursor)) {
      throw new Error("La paginación de la nómina devolvió un cursor repetido.");
    }
    if (cursor) cursors.add(cursor);
  } while (cursor);

  if (students.length !== expectedTotal) {
    throw new Error("No se pudo completar la nómina activa. Reintenta antes de exportar.");
  }
  return students;
}
