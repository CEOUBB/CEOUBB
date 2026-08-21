"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { BellRinging, BellSlash, SlidersHorizontal, X } from "@phosphor-icons/react";
import {
  CONTENT_TYPES,
  EDITOR_MODES,
  NOTIFICATION_MODES,
  type NotificationMode,
  type PublicationDraft,
} from "../../../lib/publication-workflow";
import type { Note } from "./classroom-utils";
import { RichPostEditor } from "./RichPostEditor";

export function PublicationComposerDialog({
  draft,
  folders,
  onClose,
  onReconfigure,
  publish,
  status,
}: {
  draft: PublicationDraft;
  folders: string[];
  onClose: () => void;
  onReconfigure: () => void;
  publish: (event: FormEvent<HTMLFormElement>) => Promise<boolean>;
  status: Note;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState("");
  const [folder, setFolder] = useState(draft.folder);
  const [notificationMode, setNotificationMode] = useState<NotificationMode>(
    draft.notificationMode
  );
  const [saving, setSaving] = useState(false);
  const mode = EDITOR_MODES.find((option) => option.value === draft.editorMode)!;
  const contentType = CONTENT_TYPES.find((option) => option.value === draft.contentType)!;

  useEffect(() => {
    if (dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
    titleRef.current?.focus();
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (await publish(event)) onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <dialog
      aria-describedby="publication-composer-context"
      aria-labelledby="publication-composer-title"
      className="publication-dialog publication-composer"
      data-editor-mode={draft.editorMode}
      data-requirement="Implements: REQ-PUB-01 REQ-PUB-03 REQ-PUB-05 REQ-PUB-06 REQ-PUB-08"
      onCancel={onClose}
      onClose={onClose}
      ref={dialogRef}
    >
      <form onSubmit={submit}>
        <header className="publication-dialog-head">
          <div>
            <h2 id="publication-composer-title">Nueva publicación</h2>
            <p id="publication-composer-context">
              {contentType.label} · {mode.label}
            </p>
          </div>
          <button aria-label="Cerrar editor" onClick={onClose} type="button">
            <X size={18} weight="bold" aria-hidden="true" />
          </button>
        </header>

        <div className="publication-composer-toolbar">
          <span>{mode.label}</span>
          <button onClick={onReconfigure} type="button">
            <SlidersHorizontal size={16} aria-hidden="true" />
            Cambiar configuración
          </button>
        </div>

        <div className="publication-composer-body">
          <input name="kind" type="hidden" value={draft.kind} />
          <input name="editorMode" type="hidden" value={draft.editorMode} />
          <label>
            Título
            <input maxLength={140} name="title" ref={titleRef} required />
          </label>
          <RichPostEditor
            editorMode={draft.editorMode}
            name="body"
            onChange={setBody}
            required
            value={body}
          />
          <div className="publication-composer-row">
            <label>
              Carpeta
              <select
                name="folder"
                onChange={(event) => setFolder(event.target.value)}
                value={folder}
              >
                {folders.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Fecha de entrega opcional
              <input name="dueDate" type="datetime-local" />
            </label>
          </div>
          <label>
            Enlace Drive opcional
            <input name="linkUrl" placeholder="https://…" type="url" />
          </label>
          <fieldset className="publication-notification-choice">
            <legend>Alertas</legend>
            {NOTIFICATION_MODES.map((option) => (
              <label key={option.value}>
                <input
                  checked={notificationMode === option.value}
                  name="notificationMode"
                  onChange={() => setNotificationMode(option.value)}
                  type="radio"
                  value={option.value}
                />
                {option.value === "push" ? (
                  <BellRinging size={18} aria-hidden="true" />
                ) : (
                  <BellSlash size={18} aria-hidden="true" />
                )}
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </span>
              </label>
            ))}
          </fieldset>
          {status.text && (
            <p className={`tool-status ${status.tone}`} role="status">
              {status.text}
            </p>
          )}
        </div>

        <footer className="publication-dialog-footer">
          <button className="publication-cancel" disabled={saving} onClick={onClose} type="button">
            Cancelar
          </button>
          <button className="publication-continue" disabled={saving} type="submit">
            {saving ? "Publicando…" : "Publicar en el aula"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
