"use client";

import { useEffect, useMemo, useState } from "react";
import { UsersThree, X } from "@phosphor-icons/react";
import {
  PARTICIPANT_PAGE_LIMIT,
  loadParticipantDirectoryPage,
  type ParticipantDirectoryEntry,
} from "../../../lib/participants";
import { firebaseUidOf } from "../../../lib/section-roles";
import { MAX_TEAM_MEMBERS, type GradeItem } from "../../../lib/grades";

/*
  Elección de compañeros para una evaluación en equipo de asignación libre.

  El curso arma sus propios grupos, así que quien sube el archivo declara con
  quién lo hizo. La nómina se pide al directorio de la sección, el mismo que
  alimenta Participantes: un estudiante ya puede ver a sus compañeros allí, y
  reutilizarlo evita abrir una segunda puerta a los mismos datos.

  La confirmación no envía nada todavía: entrega el equipo y el aula abre el
  selector de archivo. Así el estudiante ve a quién está firmando antes de que
  el archivo salga de su computador.
*/
// Implements: REQ-TEAM-02
export function TeamSubmissionPicker({
  sectionId,
  item,
  selfUid,
  initialMemberIds,
  onCancel,
  onConfirm,
}: {
  sectionId: string;
  item: GradeItem;
  selfUid: string;
  initialMemberIds: readonly string[];
  onCancel: () => void;
  onConfirm: (memberIds: string[]) => void;
}) {
  const [roster, setRoster] = useState<ParticipantDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>(() =>
    initialMemberIds.filter((memberId) => memberId !== selfUid)
  );

  /*
    La nómina se pide una sola vez por apertura del selector: el ramo no cambia
    mientras está en pantalla, así que el estado parte en «cargando» y sólo lo
    mueve la respuesta.
  */
  useEffect(() => {
    const controller = new AbortController();
    loadParticipantDirectoryPage(
      sectionId,
      "",
      "student",
      null,
      controller.signal,
      PARTICIPANT_PAGE_LIMIT
    )
      .then((page) => {
        setRoster(
          page.items.flatMap((entry) => {
            const id = firebaseUidOf(entry.id);
            return id === selfUid ? [] : [{ ...entry, id }];
          })
        );
        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          cause instanceof Error ? cause.message : "No se pudo cargar la nómina de la sección."
        );
        setLoading(false);
      });
    return () => controller.abort();
  }, [sectionId, selfUid]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return roster;
    return roster.filter(
      (entry) =>
        entry.name.toLowerCase().includes(needle) || entry.email.toLowerCase().includes(needle)
    );
  }, [roster, query]);

  /* La lista se repinta con cada tecla del buscador: preguntar por pertenencia
     con un Set evita recorrer la selección una vez por compañero visible. */
  const selectedIds = useMemo(() => new Set(selected), [selected]);
  const remaining = MAX_TEAM_MEMBERS - 1 - selected.length;

  const toggle = (userId: string) => {
    setSelected((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : current.length >= MAX_TEAM_MEMBERS - 1
          ? current
          : [...current, userId]
    );
  };

  return (
    <div className="team-picker" role="group" aria-label={`Equipo para ${item.name}`}>
      <header className="team-picker-head">
        <span>
          <UsersThree aria-hidden="true" size={17} weight="fill" />
          <b>Equipo para {item.name}</b>
        </span>
        <button aria-label="Cancelar la entrega en equipo" onClick={onCancel} type="button">
          <X aria-hidden="true" size={14} />
        </button>
      </header>

      <p className="team-picker-note">
        Elige a quienes trabajaron contigo. Recibirán la misma entrega, la misma nota y la misma
        retroalimentación. Puedes sumar hasta {MAX_TEAM_MEMBERS - 1} compañeros.
      </p>

      {loading && <p className="empty-row">Cargando la nómina de la sección…</p>}
      {!loading && error && (
        <p className="tool-status bad" role="status">
          {error}
        </p>
      )}

      {!loading && !error && (
        <>
          <label className="team-picker-search">
            Buscar compañero
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nombre o correo"
              type="search"
              value={query}
            />
          </label>
          <ul className="team-picker-list">
            {visible.length === 0 && (
              <li className="empty-row">No hay compañeros que coincidan con la búsqueda.</li>
            )}
            {visible.map((entry) => {
              const checked = selectedIds.has(entry.id);
              return (
                <li key={entry.id}>
                  <label htmlFor={`team-member-${entry.id}`}>
                    <input
                      checked={checked}
                      disabled={!checked && remaining <= 0}
                      id={`team-member-${entry.id}`}
                      onChange={() => toggle(entry.id)}
                      type="checkbox"
                    />
                    <b>{entry.name}</b>
                    <small>{entry.email}</small>
                  </label>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <footer className="team-picker-foot">
        <span className="num">
          {selected.length + 1} de {MAX_TEAM_MEMBERS} integrantes
        </span>
        <button className="secondary-button" onClick={onCancel} type="button">
          Cancelar
        </button>
        <button
          className="primary-button"
          disabled={selected.length === 0}
          onClick={() => onConfirm([...selected, selfUid])}
          type="button"
        >
          Elegir archivo
        </button>
      </footer>
    </div>
  );
}
