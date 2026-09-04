"use client";

// Implements: REQ-QMD-07
import { useState, type ChangeEvent, type FormEvent } from "react";
import { Package, Plus } from "@phosphor-icons/react";
import type { InteropTool } from "../../../lib/interop/client";

export function InteropAuthoringPanel({
  busy,
  tools,
  toolCursor,
  upload,
  onLinkTool,
  onLoadMoreTools,
}: {
  busy: boolean;
  tools: InteropTool[];
  toolCursor: string | null;
  upload: (event: ChangeEvent<HTMLInputElement>) => void;
  onLinkTool: (data: { title: string; toolId: string; targetUrl: string }) => Promise<void>;
  onLoadMoreTools: () => Promise<void>;
}) {
  const [selectedTool, setSelectedTool] = useState("");

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
    <details className="interop-authoring">
      <summary>
        <Plus size={18} aria-hidden="true" />
        Agregar recurso
      </summary>
      <div className="interop-authoring-grid">
        <div>
          <h3>Objeto de aprendizaje</h3>
          <p>SCORM 1.2, SCORM 2004 o xAPI con un solo objeto. ZIP de hasta 50 MiB.</p>
          <label className="secondary-button interop-upload">
            <Package size={18} aria-hidden="true" />
            Seleccionar paquete ZIP
            <input accept=".zip,application/zip" disabled={busy} onChange={upload} type="file" />
          </label>
          <p className="interop-help">
            Los paquetes que requieren secuenciación, varios objetos o recursos remotos no son
            compatibles.
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <h3>Herramienta externa</h3>
          <label>
            Nombre en el aula
            <input name="title" maxLength={160} required />
          </label>
          <label>
            Herramienta registrada
            <select required value={selectedTool} onChange={(e) => setSelectedTool(e.target.value)}>
              <option value="">Seleccionar herramienta…</option>
              {tools.flatMap((tool) =>
                tool.enabled ? (
                  <option value={tool.id} key={tool.id}>
                    {tool.name}
                  </option>
                ) : (
                  []
                )
              )}
            </select>
          </label>
          <label>
            Destino
            <select name="targetUrl" required key={selectedTool}>
              <option value="">Seleccionar destino…</option>
              {tools
                .find((t) => t.id === selectedTool)
                ?.targetUris.map((uri) => (
                  <option key={uri} value={uri}>
                    {uri}
                  </option>
                ))}
            </select>
          </label>
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
          <button className="primary-button" disabled={busy || !selectedTool} type="submit">
            Vincular herramienta
          </button>
          {tools.length === 0 && (
            <p className="interop-help">
              Administración debe registrar primero una herramienta LTI.
            </p>
          )}
        </form>
      </div>
    </details>
  );
}
