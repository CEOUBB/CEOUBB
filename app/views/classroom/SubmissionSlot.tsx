"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { CheckCircle, Paperclip, UsersThree } from "@phosphor-icons/react";
import {
  MAX_SUBMISSION_BYTES,
  StudentSubmission,
  SubmissionTeam,
  uploadStudentSubmission,
  watchOwnSubmissions,
} from "../../../lib/firebase-classroom-client";
import { submissionModeOf, type GradeItem } from "../../../lib/grades";
import { formatBytes, formatDay } from "../../../lib/portal-utils";
import type { Note } from "./classroom-utils";

/*
  Buzón de entregas del estudiante. Vive dentro de la fila de la evaluación
  porque una entrega no es una pantalla aparte: es el estado de esa evaluación.
  La celda muestra sólo un estado a la vez —adjuntar, enviando o comprobante—
  para que la tabla siga leyéndose de un vistazo.
*/
// Implements: REQ-EVAL-01
export function useOwnSubmissions(courseId: string) {
  /*
    El identificador del ramo viaja junto a los comprobantes: al cambiar de aula
    la lista anterior deja de coincidir y se descarta al derivar, sin reiniciar
    estado durante el render.
  */
  const [state, setState] = useState<{ courseId: string; items: StudentSubmission[] }>({
    courseId,
    items: [],
  });
  useEffect(
    () =>
      watchOwnSubmissions(
        courseId,
        (items) => setState({ courseId, items }),
        () => setState({ courseId, items: [] })
      ),
    [courseId]
  );
  return useMemo(() => {
    const rows = state.courseId === courseId ? state.items : [];
    return new Map(rows.map((item) => [item.evalId, item]));
  }, [courseId, state]);
}

// Implements: REQ-EVAL-01
export function useSubmissionUpload(
  courseId: string,
  note: (text: string, tone?: Note["tone"]) => void,
  enabled: boolean
) {
  const input = useRef<HTMLInputElement | null>(null);
  const pending = useRef<{ evalId: string; team?: SubmissionTeam } | null>(null);
  const [state, setState] = useState<{ evalId: string; percent: number } | null>(null);

  const pick = useCallback(
    (evalId: string, team?: SubmissionTeam) => {
      if (!enabled) return note("Este ramo está archivado y no recibe nuevas entregas.", "bad");
      pending.current = { evalId, team };
      input.current?.click();
    },
    [enabled, note]
  );

  const send = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      const target = pending.current;
      event.target.value = "";
      pending.current = null;
      if (!file || !target) return;
      const { evalId, team } = target;
      if (file.size <= 0 || file.size > MAX_SUBMISSION_BYTES) {
        note(`La entrega debe pesar entre 1 byte y ${formatBytes(MAX_SUBMISSION_BYTES)}.`, "bad");
        return;
      }
      setState({ evalId, percent: 0 });
      try {
        await uploadStudentSubmission(
          courseId,
          evalId,
          file,
          (percent) => setState({ evalId, percent }),
          team
        );
        note(
          team
            ? `Entrega recibida y registrada para los ${team.memberIds.length} integrantes del equipo.`
            : "Entrega recibida. El comprobante queda en la evaluación.",
          "ok"
        );
      } catch (cause) {
        note(cause instanceof Error ? cause.message : "No se pudo enviar la entrega.", "bad");
      } finally {
        setState(null);
      }
    },
    [courseId, note]
  );

  const field = (
    <input
      aria-hidden="true"
      className="sr-only"
      onChange={send}
      ref={input}
      tabIndex={-1}
      type="file"
    />
  );

  return { field, pick, state };
}

/*
  Comprobante de una entrega ya recibida. La huella acorta a doce caracteres
  porque nadie lee sesenta y cuatro de un vistazo: sirve para comparar dos
  comprobantes, y el valor completo queda en el título para copiarlo.
*/
// Implements: REQ-TEAM-03, REQ-TEAM-04
function SubmissionReceiptDetails({ receipt }: { receipt: StudentSubmission }) {
  const isTeam = receipt.memberIds.length > 1;
  const uploader = receipt.submittedByName.trim();
  if (!isTeam && !receipt.sha256) return null;
  return (
    <small className="grades-receipt-trace">
      {isTeam && (
        <span>
          Equipo de <span className="num">{receipt.memberIds.length}</span>
          {uploader ? ` · entregó ${uploader}` : ""}
        </span>
      )}
      {receipt.sha256 && (
        <code className="num" title={`SHA-256: ${receipt.sha256}`}>
          {receipt.sha256.slice(0, 12)}
        </code>
      )}
    </small>
  );
}

// Implements: REQ-EVAL-01, REQ-TEAM-01
export function SubmissionSlot({
  item,
  receipt,
  percent,
  onPick,
  readOnly,
}: {
  item: GradeItem;
  receipt: StudentSubmission | undefined;
  percent: number | null;
  onPick: (item: GradeItem) => void;
  readOnly: boolean;
}) {
  const shouldReduceMotion = useReducedMotion();
  const mode = submissionModeOf(item);
  const teamLabel = mode === "individual" ? "" : "en equipo";

  if (percent !== null) {
    return (
      <span className="grades-upload">
        <span className="grades-upload-track">
          <span
            className="grades-upload-fill"
            style={{
              transform: `scaleX(${percent / 100})`,
              transition: shouldReduceMotion ? "none" : undefined,
            }}
          />
        </span>
        <small className="num" role="status">
          Enviando {percent}%
        </small>
      </span>
    );
  }

  if (receipt) {
    return (
      <span className="grades-receipt">
        <b title={receipt.fileName}>
          <CheckCircle aria-hidden="true" size={14} weight="fill" />
          {receipt.fileName}
        </b>
        <small className="num">
          {formatBytes(receipt.size)} · {formatDay(receipt.createdAt.slice(0, 10))}
        </small>
        <SubmissionReceiptDetails receipt={receipt} />
        {!readOnly && (
          <button
            aria-label={`Reemplazar la entrega ${teamLabel} de ${item.name}`.replace("  ", " ")}
            className="grades-attach"
            onClick={() => onPick(item)}
            type="button"
          >
            Reemplazar
          </button>
        )}
      </span>
    );
  }

  if (readOnly) return <span className="grades-closed">Sin nuevas entregas</span>;

  return (
    <button
      aria-label={`Adjuntar la entrega ${teamLabel} de ${item.name}`.replace("  ", " ")}
      className="grades-attach"
      onClick={() => onPick(item)}
      type="button"
    >
      {mode === "individual" ? (
        <Paperclip aria-hidden="true" size={14} />
      ) : (
        <UsersThree aria-hidden="true" size={14} weight="fill" />
      )}
      {mode === "individual" ? "Adjuntar" : "Entregar en equipo"}
    </button>
  );
}
