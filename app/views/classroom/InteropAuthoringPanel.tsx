"use client";

// Implements: REQ-QMD-07
import { useState, type ChangeEvent, type FormEvent } from "react";
import { CaretRight, Package, WarningCircle } from "@phosphor-icons/react";
import type { InteropTool } from "../../../lib/interop/client";

export function InteropAuthoringPanel({
  busy,
  tools,
  toolCursor,
  upload,
  onLinkTool,
  onLoadMoreTools,
  defaultOpen = false,
}: {
  busy: boolean;
  tools: InteropTool[];
  toolCursor: string | null;
  upload: (event: ChangeEvent<HTMLInputElement>) => void;
  onLinkTool: (data: { title: string; toolId: string; targetUrl: string }) => Promise<void>;
  onLoadMoreTools: () => Promise<void>;
  defaultOpen?: boolean;
}) {
  const [selectedTool, setSelectedTool] = useState("");
  const enabledTools = tools.filter((tool) => tool.enabled);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const title = String(values.get("title") ?? "");
    const targetUrl = String(values.get("targetUrl") ?? "");
    void onLinkTool({ title, toolId: selectedTool, targetUrl }).then(() => {
      form.reset();
      setSelectedTool("");
    });
  };

  return (
    <details className="interop-authoring" open={defaultOpen || undefined}>
      <summary>
        <CaretRight className="interop-caret" size={16} weight="bold" aria-hidden="true" />
        <span>
          <strong>Agregar recurso</strong>
          <small>Sube un paquete de aprendizaje o vincula una herramienta externa.</small>
        </span>
      </summary>
      <div className="interop-authoring-grid">
        <section className="interop-authoring-pane">
          <h3>Objeto de aprendizaje</h3>
          <p className="interop-help">
            SCORM 1.2, SCORM 2004 o xAPI con un solo objeto. ZIP de hasta 50 MiB.
          </p>
          <label className="interop-upload">
            <Package size={26} weight="duotone" aria-hidden="true" />
            <span>
              <strong>Seleccionar paquete ZIP</strong>
              <small>Arrastra el archivo o búscalo en tu equipo.</small>
            </span>
            <input accept=".zip,application/zip" disabled={busy} onChange={upload} type="file" />
          </label>
          <p className="interop-help">
            Los paquetes que requieren secuenciación, varios objetos o recursos remotos no son
            compatibles.
          </p>
        </section>
        <form className="interop-authoring-pane" onSubmit={handleSubmit}>
          <h3>Herramienta externa</h3>
          <p className="interop-help">
            Vincula una herramienta LTI ya registrada por administración.
          </p>
          {enabledTools.length === 0 ? (
            <p className="interop-inline-alert" role="status">
              <WarningCircle size={17} weight="fill" aria-hidden="true" />
              Administración debe registrar primero una herramienta LTI.
            </p>
          ) : (
            <>
              <label>
                Nombre en el aula
                <input name="title" maxLength={160} required />
              </label>
              <label>
                Herramienta registrada
                <select
                  required
                  value={selectedTool}
                  onChange={(event) => setSelectedTool(event.target.value)}
                >
                  <option value="">Seleccionar herramienta…</option>
                  {enabledTools.map((tool) => (
                    <option value={tool.id} key={tool.id}>
                      {tool.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Destino
                {/* Sin herramienta elegida el destino no tiene opciones que
                    ofrecer: se mantiene inerte en vez de abrir un menú vacío. */}
                <select
                  name="targetUrl"
                  required
                  key={selectedTool}
                  disabled={busy || !selectedTool}
                >
                  <option value="">Seleccionar destino…</option>
                  {tools
                    .find((tool) => tool.id === selectedTool)
                    ?.targetUris.map((uri) => (
                      <option key={uri} value={uri}>
                        {uri}
                      </option>
                    ))}
                </select>
              </label>
              <div className="interop-authoring-actions">
                <button className="primary-button" disabled={busy || !selectedTool} type="submit">
                  Vincular herramienta
                </button>
                {toolCursor && (
                  <button
                    className="secondary-button"
                    disabled={busy}
                    onClick={() => void onLoadMoreTools()}
                    type="button"
                  >
                    Más herramientas
                  </button>
                )}
              </div>
            </>
          )}
        </form>
      </div>
    </details>
  );
}
