"use client";

import {
  ArrowDown,
  EnvelopeSimple,
  MagnifyingGlass,
  UsersThree,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Course } from "../../../lib/courses";
import { ClassroomStudent } from "../../../lib/firebase-classroom-client";
import {
  emptyParticipantCounts,
  groupParticipants,
  participantContactHref,
  participantCount,
  participantGroupCount,
  participantGroupForRole,
  loadParticipantDirectoryPage,
  type ParticipantDirectoryEntry,
  type ParticipantDirectoryPage,
  type ParticipantGroup,
  type ParticipantRoleFilter,
} from "../../../lib/participants";
import { initials, type User } from "../../../lib/portal-utils";
import { sectionRoleLabel, type SectionRole } from "../../../lib/section-roles";
import { Avatar } from "../../portal-ui";
import { EnrollmentImport } from "./EnrollmentImport";

const GROUPS: { key: ParticipantGroup; label: string; action: string }[] = [
  { key: "teaching", label: "Equipo docente", action: "Ver equipo docente" },
  { key: "assistant", label: "Ayudantes", action: "Ver ayudantes" },
  { key: "student", label: "Estudiantes", action: "Ver estudiantes" },
];

function fallbackRole(user: User, sectionRole: SectionRole | null): SectionRole {
  if (sectionRole) return sectionRole;
  if (user.role === "teacher") return "teacher";
  if (user.role === "owner") return "coordinator";
  return "student";
}

function fallbackDirectory(
  course: Course,
  user: User,
  sectionRole: SectionRole | null,
  students: readonly ClassroomStudent[]
): ParticipantDirectoryEntry[] {
  const candidates: ParticipantDirectoryEntry[] = [
    {
      id: `course-${course.id}-teacher`,
      name: course.teacher,
      email: "",
      role: "teacher",
    },
    { id: user.id, name: user.name, email: user.email, role: fallbackRole(user, sectionRole) },
    ...students.map((student) => ({
      id: student.userId,
      name: student.name,
      email: student.email,
      role: "student" as const,
    })),
  ];
  const seen = new Set<string>();
  const result: ParticipantDirectoryEntry[] = [];
  for (const participant of candidates) {
    const identity = participant.email.trim().toLowerCase() || participant.id;
    if (!participant.name.trim() || seen.has(identity)) continue;
    seen.add(identity);
    result.push(participant);
  }
  return result;
}

function fallbackCounts(participants: readonly ParticipantDirectoryEntry[]) {
  const counts = emptyParticipantCounts();
  for (const participant of participants) counts[participant.role] += 1;
  return counts;
}

function ParticipantRow({
  participant,
  currentUserId,
  course,
}: {
  participant: ParticipantDirectoryEntry;
  currentUserId: string;
  course: Course;
}) {
  const isCurrentUser = participant.id === currentUserId;
  const contactHref = participantContactHref(participant.email, course.code, course.section);
  return (
    <article className="participant-row" data-current={isCurrentUser || undefined}>
      {isCurrentUser ? (
        <Avatar large email={participant.email} name={participant.name} />
      ) : (
        <span className="avatar large" aria-hidden="true">
          {initials(participant.name)}
        </span>
      )}
      <div className="participant-identity">
        <strong>
          {participant.name}
          {isCurrentUser && <span className="participant-you">Tú</span>}
        </strong>
        <span className="participant-email">
          {participant.email || "Correo institucional no disponible"}
        </span>
      </div>
      <span className="participant-role" data-role={participant.role}>
        {sectionRoleLabel(participant.role)}
      </span>
      {contactHref ? (
        <a
          aria-label={`Escribir correo a ${participant.name}`}
          className="participant-contact"
          href={contactHref}
        >
          <EnvelopeSimple size={18} aria-hidden="true" />
          <span>Escribir</span>
        </a>
      ) : (
        <span
          className="participant-contact unavailable"
          aria-label="Correo no disponible"
          role="img"
        >
          <EnvelopeSimple size={18} aria-hidden="true" />
          <span>Sin correo</span>
        </span>
      )}
    </article>
  );
}

export function PeopleSection({
  course,
  user,
  sectionRole,
  students,
  canTeach,
}: {
  course: Course;
  user: User;
  sectionRole: SectionRole | null;
  students: ClassroomStudent[];
  canTeach: boolean;
}) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const [roleFilter, setRoleFilter] = useState<ParticipantRoleFilter>("all");
  const [directory, setDirectory] = useState<{
    key: string;
    page: ParticipantDirectoryPage | null;
    error: string;
  }>({ key: "", page: null, error: "" });
  const [loadingMore, setLoadingMore] = useState(false);
  const [retry, setRetry] = useState(0);
  const requestVersion = useRef(0);
  const directoryKey = JSON.stringify([course.id, deferredQuery, roleFilter, retry]);
  const page = directory.key === directoryKey ? directory.page : null;
  const error = directory.key === directoryKey ? directory.error : "";
  const loading = directory.key !== directoryKey;

  const fallback = useMemo(
    () => fallbackDirectory(course, user, sectionRole, students),
    [course, user, sectionRole, students]
  );

  // Implements: REQ-QMD-02
  // react-doctor-disable-next-line react-doctor/no-fetch-in-effect
  useEffect(() => {
    const controller = new AbortController();
    const version = requestVersion.current + 1;
    requestVersion.current = version;
    loadParticipantDirectoryPage(course.id, deferredQuery, roleFilter, null, controller.signal)
      .then((nextPage) => {
        if (requestVersion.current === version)
          setDirectory({ key: directoryKey, page: nextPage, error: "" });
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted || requestVersion.current !== version) return;
        setDirectory({
          key: directoryKey,
          page: null,
          error: cause instanceof Error ? cause.message : "No se pudo cargar el directorio.",
        });
      });
    return () => controller.abort();
  }, [course.id, deferredQuery, directoryKey, roleFilter]);

  const fallbackForQuery = useMemo(() => {
    const normalized = deferredQuery.toLocaleLowerCase("es-CL");
    if (!normalized) return fallback;
    return fallback.filter((participant) =>
      `${participant.name} ${participant.email}`.toLocaleLowerCase("es-CL").includes(normalized)
    );
  }, [deferredQuery, fallback]);

  const visibleFallback = useMemo(
    () =>
      roleFilter === "all"
        ? fallbackForQuery
        : fallbackForQuery.filter(
            (participant) => participantGroupForRole(participant.role) === roleFilter
          ),
    [fallbackForQuery, roleFilter]
  );
  const visibleParticipants = page?.items ?? visibleFallback;
  const counts = page?.counts ?? fallbackCounts(fallbackForQuery);
  const grouped = groupParticipants(visibleParticipants);
  const total = participantCount(counts);
  const filteredTotal = roleFilter === "all" ? total : participantGroupCount(counts, roleFilter);
  const shown = visibleParticipants.length;

  const roleFilters: { key: ParticipantRoleFilter; label: string; count: number }[] = [
    { key: "all", label: "Todos", count: total },
    {
      key: "teaching",
      label: "Equipo docente",
      count: participantGroupCount(counts, "teaching"),
    },
    {
      key: "assistant",
      label: "Ayudantes",
      count: participantGroupCount(counts, "assistant"),
    },
    {
      key: "student",
      label: "Estudiantes",
      count: participantGroupCount(counts, "student"),
    },
  ];

  const loadMore = async () => {
    if (!page?.nextCursor || loadingMore) return;
    const version = requestVersion.current;
    setLoadingMore(true);
    try {
      const nextPage = await loadParticipantDirectoryPage(
        course.id,
        deferredQuery,
        roleFilter,
        page.nextCursor
      );
      if (requestVersion.current !== version) return;
      setDirectory((current) => {
        if (current.key !== directoryKey || !current.page) return current;
        const ids = new Set(current.page.items.map((participant) => participant.id));
        return {
          key: directoryKey,
          error: "",
          page: {
            ...nextPage,
            items: [
              ...current.page.items,
              ...nextPage.items.filter((participant) => !ids.has(participant.id)),
            ],
          },
        };
      });
    } catch (cause) {
      if (requestVersion.current === version)
        setDirectory((current) => ({
          ...current,
          error: cause instanceof Error ? cause.message : "No se pudo cargar la página siguiente.",
        }));
    } finally {
      setLoadingMore(false);
    }
  };

  const announcement = loading
    ? "Actualizando el directorio de participantes."
    : error
      ? error
      : filteredTotal === 0
        ? "No hay participantes que coincidan con los filtros."
        : `Mostrando ${shown} de ${filteredTotal} participantes.`;

  return (
    <section
      aria-busy={loading || loadingMore}
      aria-labelledby="participants-title"
      className="participants-directory"
    >
      {/* El encabezado del ramo ya dice «Participantes» y los filtros ya
          llevan el total: un segundo título y un contador aparte repetían
          lo mismo tres veces. */}
      <h2 className="sr-only" id="participants-title">
        Personas del ramo
      </h2>

      {canTeach && (
        <EnrollmentImport
          sectionId={course.id}
          sectionLabel={`${course.code} · Sección ${course.section}`}
        />
      )}

      <div className="participants-toolbar">
        <div className="participant-search">
          <label className="sr-only" htmlFor="participant-search-input">
            Buscar participantes
          </label>
          <MagnifyingGlass size={19} aria-hidden="true" />
          <input
            aria-controls="participant-groups"
            autoComplete="off"
            id="participant-search-input"
            maxLength={80}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre o correo"
            type="search"
            value={query}
          />
          {query && (
            <button aria-label="Limpiar búsqueda" onClick={() => setQuery("")} type="button">
              <X size={17} aria-hidden="true" />
            </button>
          )}
        </div>
        <div
          aria-label="Filtrar participantes por rol"
          className="participant-filters"
          role="group"
        >
          {roleFilters.map((filter) => (
            <button
              aria-pressed={roleFilter === filter.key}
              className={roleFilter === filter.key ? "active" : ""}
              key={filter.key}
              onClick={() => setRoleFilter(filter.key)}
              type="button"
            >
              {filter.label}
              <span className="num">{filter.count}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      {error && (
        <div className="participant-error" role="status">
          <WarningCircle size={20} weight="fill" aria-hidden="true" />
          <span>{error} Se muestra la información segura disponible en el aula.</span>
          <button onClick={() => setRetry((value) => value + 1)} type="button">
            Reintentar
          </button>
        </div>
      )}

      {loading && !error && (
        <div className="participant-loading" role="status">
          Actualizando padrón…
        </div>
      )}

      {filteredTotal === 0 && !loading ? (
        <div className="participant-empty">
          <UsersThree size={28} aria-hidden="true" />
          <strong>Sin coincidencias</strong>
          <p>Prueba otro nombre, correo o filtro de rol.</p>
          {(query || roleFilter !== "all") && (
            <button
              onClick={() => {
                setQuery("");
                setRoleFilter("all");
              }}
              type="button"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="participant-groups" id="participant-groups">
          {GROUPS.map((group) => {
            const groupCount = participantGroupCount(counts, group.key);
            if (groupCount === 0 || (roleFilter !== "all" && roleFilter !== group.key)) return null;
            const entries = grouped[group.key];
            return (
              <section aria-labelledby={`participant-group-${group.key}`} key={group.key}>
                <header className="participant-group-heading">
                  <h3 id={`participant-group-${group.key}`}>{group.label}</h3>
                  <span className="num">{groupCount}</span>
                </header>
                {entries.length ? (
                  <div className="participant-list">
                    {entries.map((participant) => (
                      <ParticipantRow
                        course={course}
                        currentUserId={user.id}
                        key={participant.id}
                        participant={participant}
                      />
                    ))}
                  </div>
                ) : (
                  <button
                    className="participant-group-shortcut"
                    onClick={() => setRoleFilter(group.key)}
                    type="button"
                  >
                    {group.action}
                    <span className="num">{groupCount}</span>
                  </button>
                )}
              </section>
            );
          })}
        </div>
      )}

      {page?.nextCursor && (
        <button
          className="participant-load-more"
          disabled={loadingMore}
          onClick={loadMore}
          type="button"
        >
          <ArrowDown size={18} aria-hidden="true" />
          {loadingMore ? "Cargando…" : "Cargar más participantes"}
        </button>
      )}
    </section>
  );
}
