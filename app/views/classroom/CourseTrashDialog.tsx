"use client";

import { useEffect, useState } from "react";
import {
  ArrowCounterClockwise,
  File as FileIcon,
  ImageSquare,
  LinkSimple,
  Megaphone,
  SquaresFour,
  TextT,
  Trash,
  type Icon,
} from "@phosphor-icons/react";
import {
  purgeTrashEntries,
  restoreTrashEntry,
  watchTrash,
} from "../../../lib/firebase-classroom-client";
import {
  pageErrorText,
  TRASH_RETENTION_DAYS,
  trashDaysLeft,
  type PageItemType,
  type PageSection,
  type TrashEntry,
} from "../../../lib/course-page";
import { toast } from "../../../lib/toast";
import { Line } from "../skeleton-bones";
import { PageDialog } from "./PageDialog";

const ITEM_ICONS: Record<PageItemType, Icon> = {
  text: TextT,
  file: FileIcon,
  link: LinkSimple,
  image: ImageSquare,
};

const ITEM_NOUNS: Record<PageItemType, string> = {
  text: "Texto",
  file: "Archivo",
  link: "Enlace",
  image: "Imagen",
};

function describe(entry: TrashEntry) {
  if (entry.kind === "section") {
    return {
      Glyph: SquaresFour,
      title: `Sección «${entry.title}»`,
      context: entry.itemCount === 1 ? "Con 1 elemento" : `Con ${entry.itemCount} elementos`,
    };
  }

  if (entry.placement === "notice") {
    return { Glyph: Megaphone, title: entry.title || "Aviso sin título", context: "Aviso" };
  }

  return {
    Glyph: ITEM_ICONS[entry.itemType],
    title: entry.title || ITEM_NOUNS[entry.itemType],
    context: entry.sectionTitle ? `En «${entry.sectionTitle}»` : ITEM_NOUNS[entry.itemType],
  };
}

// Implements: REQ-PAGE-06
export function CourseTrashDialog({
  courseId,
  sections,
  onClose,
}: {
  courseId: string;
  sections: readonly PageSection[];
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<TrashEntry[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [confirming, setConfirming] = useState("");
  const [now] = useState(() => Date.now());

  useEffect(() => watchTrash(courseId, setEntries, setError), [courseId]);

  const run = async (key: string, task: () => Promise<void>, done: string, failure: string) => {
    setBusy(key);
    try {
      await task();
      toast.success(done);
    } catch (cause) {
      toast.error(pageErrorText(cause, failure));
    } finally {
      setBusy("");
      setConfirming("");
    }
  };

  const restore = (entry: TrashEntry) =>
    run(
      entry.id,
      () => restoreTrashEntry(courseId, entry, sections),
      entry.placement === "notice" ? "El aviso volvió al ramo." : "Se restauró en la página.",
      "No se pudo restaurar."
    );

  const purge = (list: TrashEntry[], key: string) =>
    run(
      key,
      () => purgeTrashEntries(courseId, list),
      list.length === 1 ? "Se borró para siempre." : "La papelera quedó vacía.",
      "No se pudo borrar de forma definitiva."
    );

  return (
    <PageDialog
      description={`Lo que eliminas se guarda ${TRASH_RETENTION_DAYS} días. Puedes restaurarlo tal como estaba o borrarlo para siempre, archivos incluidos.`}
      onClose={onClose}
      title="Papelera del ramo"
      wide
    >
      {error ? (
        <p className="tool-status bad" role="alert">
          {error}
        </p>
      ) : entries === null ? (
        <ul aria-busy="true" className="trash-list">
          {[0, 1, 2].map((row) => (
            <li key={row}>
              <span className="trash-text">
                <Line w={`${44 + row * 12}%`} />
                <Line quiet w="30%" />
              </span>
            </li>
          ))}
        </ul>
      ) : entries.length === 0 ? (
        <p className="page-section-empty">La papelera está vacía.</p>
      ) : (
        <>
          <ul className="trash-list">
            {entries.map((entry) => {
              const { Glyph, title, context } = describe(entry);
              const days = trashDaysLeft(entry.deletedAt, now);
              return (
                <li key={entry.id}>
                  <span className="page-file-icon">
                    <Glyph aria-hidden="true" size={18} />
                  </span>
                  <span className="trash-text">
                    <strong>{title}</strong>
                    <small>
                      {context} · se borra en <span className="num">{days}</span>{" "}
                      {days === 1 ? "día" : "días"}
                    </small>
                  </span>
                  <span className="trash-actions">
                    {confirming === entry.id ? (
                      <>
                        <button
                          className="confirmation-danger"
                          disabled={busy === entry.id}
                          onClick={() => void purge([entry], entry.id)}
                          type="button"
                        >
                          Borrar para siempre
                        </button>
                        <button
                          className="secondary-button"
                          onClick={() => setConfirming("")}
                          type="button"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="secondary-button"
                          disabled={Boolean(busy)}
                          onClick={() => void restore(entry)}
                          type="button"
                        >
                          <ArrowCounterClockwise aria-hidden="true" size={16} />
                          Restaurar
                        </button>
                        <button
                          aria-label={`Borrar para siempre ${title}`}
                          className="page-tool is-danger"
                          disabled={Boolean(busy)}
                          onClick={() => setConfirming(entry.id)}
                          type="button"
                        >
                          <Trash aria-hidden="true" size={17} />
                        </button>
                      </>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          <footer className="trash-footer">
            {confirming === "all" ? (
              <>
                <p>Se borrará todo lo que está en la papelera. Esta acción no se puede deshacer.</p>
                <button
                  className="confirmation-danger"
                  disabled={busy === "all"}
                  onClick={() => void purge(entries, "all")}
                  type="button"
                >
                  Vaciar papelera
                </button>
                <button
                  className="secondary-button"
                  onClick={() => setConfirming("")}
                  type="button"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <button
                className="secondary-button"
                disabled={Boolean(busy)}
                onClick={() => setConfirming("all")}
                type="button"
              >
                <Trash aria-hidden="true" size={16} />
                Vaciar papelera
              </button>
            )}
          </footer>
        </>
      )}
    </PageDialog>
  );
}
