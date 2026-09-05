"use client";

import { useMemo, useState } from "react";
import { Plus, UsersThree, X } from "@phosphor-icons/react";
import type { ClassroomStudent } from "../../../lib/firebase-classroom-client";
import { MAX_TEAM_MEMBERS, type EvaluationTeam } from "../../../lib/grades";
import { filterRoster } from "./classroom-utils";

/*
  Nómina de equipos de una evaluación con integrantes definidos por el docente.

  Trabaja sobre la nómina que el aula ya tiene cargada, la misma con la que se
  ponen las notas: si alguien no aparece aquí tampoco puede recibir la nota que
  la entrega del equipo replicará, y prometer lo contrario dejaría un equipo
  incompleto en el momento de corregir.
*/
// Implements: REQ-TEAM-01
export function EvaluationTeamsEditor({
  itemName,
  teams,
  students,
  onChange,
}: {
  itemName: string;
  teams: EvaluationTeam[];
  students: readonly ClassroomStudent[];
  onChange: (next: EvaluationTeam[]) => void;
}) {
  const [query, setQuery] = useState("");

  const nameById = useMemo(
    () => new Map(students.map((student) => [student.userId, student.name])),
    [students]
  );

  const assigned = useMemo(() => new Set(teams.flatMap((team) => team.memberIds)), [teams]);

  const available = useMemo(
    () => filterRoster(students, query).filter((student) => !assigned.has(student.userId)),
    [students, query, assigned]
  );

  const patchTeam = (teamId: string, values: Partial<EvaluationTeam>) => {
    onChange(teams.map((team) => (team.id === teamId ? { ...team, ...values } : team)));
  };

  const addTeam = () => {
    onChange([
      ...teams,
      { id: crypto.randomUUID(), name: `Equipo ${teams.length + 1}`, memberIds: [] },
    ]);
  };

  const addMember = (teamId: string, userId: string) => {
    if (!userId) return;
    const team = teams.find((candidate) => candidate.id === teamId);
    if (!team || team.memberIds.includes(userId) || team.memberIds.length >= MAX_TEAM_MEMBERS) {
      return;
    }
    patchTeam(teamId, { memberIds: [...team.memberIds, userId] });
  };

  return (
    <section aria-label={`Equipos de ${itemName || "la evaluación"}`} className="teams-editor">
      <header className="teams-editor-head">
        <UsersThree aria-hidden="true" size={17} weight="fill" />
        <p>
          Cada equipo entrega una vez. La nota y la retroalimentación llegan a todos sus
          integrantes.
        </p>
      </header>

      {students.length === 0 && (
        <p className="empty-row">
          La nómina aparecerá cuando el estudiantado ingrese al aula. Hasta entonces no es posible
          formar equipos.
        </p>
      )}

      {students.length > 0 && (
        <label className="teams-editor-search">
          Buscar estudiante
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre o correo"
            type="search"
            value={query}
          />
        </label>
      )}

      {teams.map((team) => (
        <article className="teams-editor-card" key={team.id}>
          <div className="teams-editor-card-head">
            <label>
              Nombre del equipo
              <input
                maxLength={120}
                onChange={(event) => patchTeam(team.id, { name: event.target.value })}
                value={team.name}
              />
            </label>
            <button
              className="remove-row"
              onClick={() => onChange(teams.filter((candidate) => candidate.id !== team.id))}
              type="button"
            >
              <X aria-hidden="true" size={14} />
              Quitar equipo
            </button>
          </div>

          <ul className="teams-editor-members">
            {team.memberIds.length === 0 && (
              <li className="teams-editor-hint">Sin integrantes todavía.</li>
            )}
            {team.memberIds.map((memberId) => (
              <li key={memberId}>
                <span>{nameById.get(memberId) ?? memberId}</span>
                <button
                  aria-label={`Quitar a ${nameById.get(memberId) ?? memberId} de ${team.name}`}
                  onClick={() =>
                    patchTeam(team.id, {
                      memberIds: team.memberIds.filter((id) => id !== memberId),
                    })
                  }
                  type="button"
                >
                  <X aria-hidden="true" size={12} />
                </button>
              </li>
            ))}
          </ul>

          <label className="teams-editor-add">
            Agregar integrante
            <select
              disabled={team.memberIds.length >= MAX_TEAM_MEMBERS || available.length === 0}
              onChange={(event) => {
                addMember(team.id, event.target.value);
                event.target.value = "";
              }}
              value=""
            >
              <option value="">
                {team.memberIds.length >= MAX_TEAM_MEMBERS
                  ? `Máximo de ${MAX_TEAM_MEMBERS} integrantes`
                  : available.length === 0
                    ? "Sin estudiantes disponibles"
                    : "Elegir estudiante…"}
              </option>
              {available.map((student) => (
                <option key={student.userId} value={student.userId}>
                  {student.name} · {student.email}
                </option>
              ))}
            </select>
          </label>
        </article>
      ))}

      <button
        className="secondary-button"
        disabled={students.length === 0}
        onClick={addTeam}
        type="button"
      >
        <Plus aria-hidden="true" size={15} />
        Agregar equipo
      </button>
    </section>
  );
}
