import { ArrowSquareOut, LinkSimple, VideoCamera } from "@phosphor-icons/react";
import type { FormEvent } from "react";
import type { LiveClassLink } from "../../../lib/live-class";
import type { Note } from "./classroom-utils";

/*
  Configurar el enlace de la reunión es una tarea puntual del semestre, no la
  primera decisión de cada visita al aula. Por eso la sección se parte en dos:
  el aviso de clase en vivo, que sí encabeza la Portada cuando hay enlace, y el
  editor, que baja al riel lateral junto al resto de los datos del ramo.
*/
// Implements: REQ-LIVE-03, REQ-LIVE-04, REQ-LIVE-07
export function LiveClassBanner({ liveClass }: { liveClass: LiveClassLink | null }) {
  if (!liveClass) return null;

  const provider = liveClass.provider === "teams" ? "Microsoft Teams" : "Zoom";

  return (
    <section className="live-class-banner" aria-label="Clase en vivo">
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
    </section>
  );
}

// Implements: REQ-LIVE-03, REQ-LIVE-04
export function LiveClassEditor({
  liveClass,
  status,
  invalid,
  onSave,
  onClear,
}: {
  liveClass: LiveClassLink | null;
  status: Note;
  invalid: boolean;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onClear: () => void;
}) {
  return (
    <details className="rail-card live-class-editor" open={invalid || undefined}>
      <summary>
        <span className="rail-card-icon" aria-hidden="true">
          <LinkSimple size={16} weight="bold" />
        </span>
        <span className="rail-card-heading">
          <strong>Enlace de clase en vivo</strong>
          <small>{liveClass ? "Enlace configurado" : "Sin configurar"}</small>
        </span>
      </summary>
      <form key={liveClass?.url ?? "empty"} onSubmit={onSave}>
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
        <small className="rail-card-help">Admite enlaces HTTPS de Zoom o Microsoft Teams.</small>
        <div className="live-class-actions">
          <button className="primary-button" type="submit">
            Guardar enlace
          </button>
          {liveClass ? (
            <button className="secondary-button" onClick={onClear} type="button">
              Quitar
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
    </details>
  );
}
