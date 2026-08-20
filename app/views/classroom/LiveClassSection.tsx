import { ArrowSquareOut, LinkSimple, VideoCamera } from "@phosphor-icons/react";
import type { FormEvent } from "react";
import type { LiveClassLink } from "../../../lib/live-class";
import type { Note } from "./classroom-utils";

// Implements: REQ-LIVE-03, REQ-LIVE-04, REQ-LIVE-07
export function LiveClassSection({
  liveClass,
  canTeach,
  status,
  invalid,
  onSave,
  onClear,
}: {
  liveClass: LiveClassLink | null;
  canTeach: boolean;
  status: Note;
  invalid: boolean;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onClear: () => void;
}) {
  if (!liveClass && !canTeach) return null;

  const provider = liveClass?.provider === "teams" ? "Microsoft Teams" : "Zoom";

  return (
    <section className="live-class-section" aria-label="Clase en vivo">
      {liveClass ? (
        <div className="live-class-banner">
          <span className="live-class-icon" aria-hidden="true">
            <VideoCamera size={24} weight="fill" />
          </span>
          <div className="live-class-copy">
            <span>Clase en vivo</span>
            <strong>Conéctate por {provider}</strong>
            <small>El enlace se abrirá en una ventana externa.</small>
          </div>
          <a
            className="primary-button live-class-join"
            href={liveClass.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Entrar a la clase
            <ArrowSquareOut size={18} aria-hidden="true" />
          </a>
        </div>
      ) : null}

      {canTeach ? (
        <form className="live-class-editor" key={liveClass?.url ?? "empty"} onSubmit={onSave}>
          <div className="live-class-editor-copy">
            <span className="live-class-editor-icon" aria-hidden="true">
              <LinkSimple size={18} weight="bold" />
            </span>
            <div>
              <strong>Enlace de clase en vivo</strong>
              <small>Admite enlaces HTTPS de Zoom o Microsoft Teams.</small>
            </div>
          </div>
          <div className="live-class-field">
            <label htmlFor="live-class-url">Enlace de la reunión</label>
            <input
              aria-describedby="live-class-feedback"
              aria-invalid={invalid || undefined}
              autoCapitalize="none"
              autoCorrect="off"
              defaultValue={liveClass?.url ?? ""}
              id="live-class-url"
              inputMode="url"
              maxLength={2048}
              name="liveClassUrl"
              placeholder="https://us02web.zoom.us/j/..."
              spellCheck={false}
              type="text"
            />
          </div>
          <div className="live-class-actions">
            <button className="primary-button" type="submit">
              Guardar enlace
            </button>
            {liveClass ? (
              <button className="secondary-button" onClick={onClear} type="button">
                Quitar enlace
              </button>
            ) : null}
          </div>
          <p
            className={`tool-status ${status.tone}`}
            id="live-class-feedback"
            role="status"
            aria-atomic="true"
          >
            {status.text}
          </p>
        </form>
      ) : null}
    </section>
  );
}
