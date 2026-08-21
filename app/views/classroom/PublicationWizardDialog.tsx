"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BellRinging,
  BellSlash,
  BookOpen,
  BracketsCurly,
  ClipboardText,
  Code,
  File,
  FolderOpen,
  Megaphone,
  TextT,
  X,
  type Icon,
} from "@phosphor-icons/react";
import {
  CONTENT_TYPES,
  EDITOR_MODES,
  NOTIFICATION_MODES,
  createPublicationDraft,
  type EditorMode,
  type NotificationMode,
  type PublicationContentType,
  type PublicationDraft,
} from "../../../lib/publication-workflow";

const CONTENT_ICONS: Record<PublicationContentType, Icon> = {
  notice: Megaphone,
  assessment: ClipboardText,
  guide: BookOpen,
  blank: File,
};

const EDITOR_ICONS: Record<EditorMode, Icon> = {
  visual: TextT,
  markdown: BracketsCurly,
  html: Code,
};

const NOTIFICATION_ICONS: Record<NotificationMode, Icon> = {
  push: BellRinging,
  silent: BellSlash,
};

const STEPS = ["Tipo de contenido", "Modo de redacción", "Destino y alertas"] as const;

export function PublicationWizardDialog({
  folders,
  initialMode,
  initialRemember,
  onClose,
  onComplete,
}: {
  folders: string[];
  initialMode: EditorMode;
  initialRemember: boolean;
  onClose: () => void;
  onComplete: (draft: PublicationDraft, remember: boolean) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState(0);
  const [contentType, setContentType] = useState<PublicationContentType>("notice");
  const [editorMode, setEditorMode] = useState<EditorMode>(initialMode);
  const [remember, setRemember] = useState(initialRemember);
  const [folder, setFolder] = useState(folders[0] ?? "");
  const [notificationMode, setNotificationMode] = useState<NotificationMode>("push");

  useEffect(() => {
    if (dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
    headingRef.current?.focus();
  }, []);

  const close = () => onClose();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step < STEPS.length - 1) {
      setStep((current) => current + 1);
      return;
    }
    onComplete(
      createPublicationDraft({ contentType, editorMode, folder, notificationMode }),
      remember
    );
  };

  return (
    <dialog
      aria-describedby="publication-wizard-context"
      aria-labelledby="publication-wizard-title"
      className="publication-dialog publication-wizard"
      data-requirement="Implements: REQ-PUB-02 REQ-PUB-03 REQ-PUB-04 REQ-PUB-08"
      onCancel={close}
      onClose={close}
      ref={dialogRef}
    >
      <form onSubmit={submit}>
        <header className="publication-dialog-head">
          <div>
            <h2 id="publication-wizard-title" ref={headingRef} tabIndex={-1}>
              Crear una publicación
            </h2>
            <p id="publication-wizard-context" aria-live="polite">
              Paso {step + 1} de {STEPS.length}: {STEPS[step]}
            </p>
          </div>
          <button aria-label="Cerrar asistente" onClick={close} type="button">
            <X size={18} weight="bold" aria-hidden="true" />
          </button>
        </header>

        <ol aria-label="Progreso del asistente" className="publication-steps">
          {STEPS.map((label, index) => (
            <li aria-current={index === step ? "step" : undefined} key={label}>
              <span>{index + 1}</span>
              <small>{label}</small>
            </li>
          ))}
        </ol>

        <div className="publication-dialog-body">
          {step === 0 && (
            <fieldset className="publication-options">
              <legend>¿Qué quieres publicar?</legend>
              <p>Elige la estructura que mejor representa el contenido.</p>
              <div className="publication-option-grid">
                {CONTENT_TYPES.map((option) => {
                  const OptionIcon = CONTENT_ICONS[option.value];
                  return (
                    <label className="publication-option" key={option.value}>
                      <input
                        checked={contentType === option.value}
                        name="contentType"
                        onChange={() => setContentType(option.value)}
                        type="radio"
                        value={option.value}
                      />
                      <span className="publication-option-icon">
                        <OptionIcon size={22} aria-hidden="true" />
                      </span>
                      <span>
                        <strong>{option.label}</strong>
                        <small>{option.description}</small>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          {step === 1 && (
            <fieldset className="publication-options">
              <legend>¿Cómo prefieres redactar?</legend>
              <p>Esta elección prepara el editor antes de que empieces a escribir.</p>
              <div className="publication-option-grid editor-options">
                {EDITOR_MODES.map((option) => {
                  const OptionIcon = EDITOR_ICONS[option.value];
                  return (
                    <label className="publication-option" key={option.value}>
                      <input
                        checked={editorMode === option.value}
                        name="editorMode"
                        onChange={() => setEditorMode(option.value)}
                        type="radio"
                        value={option.value}
                      />
                      <span className="publication-option-icon">
                        <OptionIcon size={22} aria-hidden="true" />
                      </span>
                      <span>
                        <strong>{option.label}</strong>
                        <small>{option.description}</small>
                      </span>
                    </label>
                  );
                })}
              </div>
              <div className="publication-remember">
                <input
                  checked={remember}
                  id="publication-remember-choice"
                  onChange={(event) => setRemember(event.target.checked)}
                  type="checkbox"
                />
                <label htmlFor="publication-remember-choice">
                  Recordar mi elección y usarla siempre por defecto
                  <small>Puedes cambiarla en cualquier momento desde la flecha del botón.</small>
                </label>
              </div>
            </fieldset>
          )}

          {step === 2 && (
            <div className="publication-destination">
              <label>
                <span>
                  <FolderOpen size={18} aria-hidden="true" />
                  Carpeta de destino
                </span>
                <select onChange={(event) => setFolder(event.target.value)} value={folder}>
                  {folders.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset className="publication-options">
                <legend>¿Cómo avisamos al curso?</legend>
                <div className="publication-option-grid notification-options">
                  {NOTIFICATION_MODES.map((option) => {
                    const OptionIcon = NOTIFICATION_ICONS[option.value];
                    return (
                      <label className="publication-option" key={option.value}>
                        <input
                          checked={notificationMode === option.value}
                          name="notificationMode"
                          onChange={() => setNotificationMode(option.value)}
                          type="radio"
                          value={option.value}
                        />
                        <span className="publication-option-icon">
                          <OptionIcon size={22} aria-hidden="true" />
                        </span>
                        <span>
                          <strong>{option.label}</strong>
                          <small>{option.description}</small>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          )}
        </div>

        <footer className="publication-dialog-footer">
          {step > 0 && (
            <button
              className="publication-back"
              onClick={() => setStep((current) => current - 1)}
              type="button"
            >
              <ArrowLeft size={17} aria-hidden="true" />
              Atrás
            </button>
          )}
          <button className="publication-cancel" onClick={close} type="button">
            Cancelar
          </button>
          <button className="publication-continue" type="submit">
            {step === STEPS.length - 1 ? "Abrir editor" : "Continuar"}
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </footer>
      </form>
    </dialog>
  );
}
