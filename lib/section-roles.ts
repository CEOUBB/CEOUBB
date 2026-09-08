import type { AccountRole } from "./access-policy.ts";

// Implements: REQ-ASST-01, REQ-ASST-02, REQ-ASST-03, REQ-ASST-04, REQ-ASST-05
export const SECTION_ROLES = ["teacher", "student", "assistant", "coordinator"] as const;

export type SectionRole = (typeof SECTION_ROLES)[number];

export type SectionMembership = {
  sectionId: string;
  role: SectionRole;
};

export function isSectionRole(value: unknown): value is SectionRole {
  return typeof value === "string" && SECTION_ROLES.includes(value as SectionRole);
}

export function isSectionId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9][a-z0-9-]{1,60}$/.test(value);
}

export function parseSectionMemberships(value: unknown): SectionMembership[] {
  if (!Array.isArray(value)) return [];
  const memberships = new Map<string, SectionMembership>();
  const duplicates = new Set<string>();

  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const sectionId = "sectionId" in item ? item.sectionId : undefined;
    const role = "role" in item ? item.role : undefined;
    if (!isSectionId(sectionId) || !isSectionRole(role) || duplicates.has(sectionId)) continue;
    if (memberships.has(sectionId)) {
      memberships.delete(sectionId);
      duplicates.add(sectionId);
      continue;
    }
    memberships.set(sectionId, { sectionId, role });
  }

  return [...memberships.values()];
}

export function sectionRoleFor(
  memberships: readonly SectionMembership[],
  sectionId: string
): SectionRole | null {
  return memberships.find((membership) => membership.sectionId === sectionId)?.role ?? null;
}

export function canManageSectionContent(
  accountRole: AccountRole,
  sectionRole: SectionRole | null
): boolean {
  return (
    accountRole === "owner" ||
    sectionRole === "teacher" ||
    sectionRole === "coordinator" ||
    sectionRole === "assistant"
  );
}

export function canTeachSection(
  accountRole: AccountRole,
  sectionRole: SectionRole | null
): boolean {
  return (
    accountRole === "owner" ||
    (accountRole === "teacher" && (sectionRole === "teacher" || sectionRole === "coordinator"))
  );
}

export function sectionRoleLabel(role: SectionRole): string {
  if (role === "assistant") return "Ayudante";
  if (role === "teacher") return "Docente";
  if (role === "coordinator") return "Coordinación";
  return "Estudiante";
}

export function canReadGradeHistory(accountRole: AccountRole, sectionRole: SectionRole | null) {
  return canTeachSection(accountRole, sectionRole) || sectionRole === "assistant";
}

/*
  Identidad del usuario en Firebase a partir de la que guarda Turso.

  El sistema de registro conserva las cuentas creadas por el flujo institucional
  con el prefijo `firebase:` y las cuentas sembradas sin él. Firestore, en
  cambio, indexa siempre por el UID desnudo: expedientes de notas, comprobantes
  de entrega y proyecciones de matrícula. Traducir en un solo lugar evita que un
  equipo de trabajo quede formado por identificadores que nunca coinciden con la
  fila de notas que deben recibir.
*/
// Implements: REQ-SEC-07, REQ-TEAM-02
export function firebaseUidOf(userId: string): string {
  return typeof userId === "string" && userId.startsWith("firebase:")
    ? userId.slice("firebase:".length)
    : userId;
}
