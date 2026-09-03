"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowSquareOut, DownloadSimple, Package, Plus, X } from "@phosphor-icons/react";
import { z } from "zod";
import {
  downloadInteropFile,
  interopRequest,
  launchSchema,
  resourcePageSchema,
  toolPageSchema,
  toolSchema,
  type InteropResource,
  type InteropTool,
} from "../../../lib/interop/client";
import { MAX_PACKAGE_BYTES } from "../../../lib/interop/zip";
import type { Note } from "./classroom-utils";
import "./interop.css";

const kindLabel = {
  lti: "Herramienta LTI",
  scorm12: "SCORM 1.2",
  scorm2004: "SCORM 2004",
  xapi: "xAPI",
};
export function InteropSection({
  sectionId,
  canTeach,
  isOwner,
  readOnly,
  note,
}: {
  sectionId: string;
  canTeach: boolean;
  isOwner: boolean;
  readOnly: boolean;
  note: (text: string, tone?: Note["tone"]) => void;
}) {
  const [resources, setResources] = useState<InteropResource[]>([]);
  const [tools, setTools] = useState<InteropTool[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [toolCursor, setToolCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedTool, setSelectedTool] = useState("");
  const [player, setPlayer] = useState<{ url: string; title: string } | null>(null);
  const noteRef = useRef(note);
  const base = "/api/courses/" + encodeURIComponent(sectionId) + "/interop";
  useEffect(() => {
    noteRef.current = note;
  }, [note]);
  const refresh = useCallback(
    (signal?: AbortSignal) => {
      return Promise.all([
        interopRequest(base, resourcePageSchema, { signal }),
        canTeach
          ? interopRequest("/api/interop/tools", toolPageSchema, { signal })
          : Promise.resolve({ items: [], nextCursor: null }),
      ])
        .then(([page, registered]) => {
          if (signal?.aborted) return;
          setResources(page.items);
          setCursor(page.nextCursor);
          setTools(registered.items);
          setToolCursor(registered.nextCursor);
          setError("");
        })
        .catch((cause: unknown) => {
          if (!signal?.aborted)
            setError(
              cause instanceof Error ? cause.message : "No se pudieron cargar los recursos."
            );
        })
        .finally(() => {
          if (!signal?.aborted) setLoading(false);
        });
    },
    [base, canTeach]
  );
  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  const act = async (operation: () => Promise<void>) => {
    setBusy(true);
    try {
      await operation();
    } catch (cause) {
      noteRef.current(
        cause instanceof Error ? cause.message : "No se pudo completar la operación.",
        "bad"
      );
    } finally {
      setBusy(false);
    }
  };
  const upload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_PACKAGE_BYTES || !file.name.toLowerCase().endsWith(".zip"))
      return note("Selecciona un ZIP de hasta 50 MiB.", "bad");
    void act(async () => {
      note("Validando y guardando el paquete…");
      await interopRequest(base, z.object({ id: z.string() }), {
        method: "POST",
        headers: { "Content-Type": "application/zip" },
        body: file,
      });
      await refresh();
      note("Objeto de aprendizaje disponible en la sección.", "ok");
    });
  };
  const link = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    void act(async () => {
      await interopRequest(base, z.object({ id: z.string() }), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: values.get("title"),
          toolId: selectedTool,
          targetUrl: values.get("targetUrl"),
        }),
      });
      form.reset();
      setSelectedTool("");
      await refresh();
      note("Herramienta vinculada a la sección.", "ok");
    });
  };
  const open = (resource: InteropResource) =>
    void act(async () => {
      const result = await interopRequest(base + "/" + resource.id, launchSchema, {
        method: "POST",
      });
      if (result.kind === "lti") window.location.assign(result.url);
      else setPlayer({ url: result.url, title: result.title });
    });
  if (player)
    return (
      <section className="interop-player" aria-label={player.title}>
        <header>
          <h2>{player.title}</h2>
          <button className="secondary-button" onClick={() => setPlayer(null)} type="button">
            <X size={18} aria-hidden="true" />
            Cerrar recurso
          </button>
        </header>
        <p>
          Antes de cerrar, usa la opción de guardar o finalizar del objeto. Su avance no modifica el
          libro de notas.
        </p>
        <iframe
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin"
          src={player.url}
          title={player.title}
        />
      </section>
    );
  return (
    <section className="interop-workspace" aria-label="Herramientas y objetos de aprendizaje">
      <header>
        <div>
          <h2>Herramientas y objetos de aprendizaje</h2>
          <p>Abre los laboratorios, bibliotecas y actividades que comparte tu equipo docente.</p>
        </div>
      </header>
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button className="secondary-button" onClick={() => void refresh()} type="button">
            Reintentar
          </button>
        </div>
      )}
      {canTeach && !readOnly && (
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
                <input
                  accept=".zip,application/zip"
                  disabled={busy}
                  onChange={upload}
                  type="file"
                />
              </label>
              <p className="interop-help">
                Los paquetes que requieren secuenciación, varios objetos o recursos remotos no son
                compatibles.
              </p>
            </div>
            <form onSubmit={link}>
              <h3>Herramienta externa</h3>
              <label>
                Nombre en el aula
                <input name="title" maxLength={160} required />
              </label>
              <label>
                Herramienta registrada
                <select
                  required
                  value={selectedTool}
                  onChange={(e) => setSelectedTool(e.target.value)}
                >
                  <option value="">Seleccionar herramienta…</option>
                  {tools
                    .filter((tool) => tool.enabled)
                    .map((tool) => (
                      <option value={tool.id} key={tool.id}>
                        {tool.name}
                      </option>
                    ))}
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
                  onClick={() =>
                    void act(async () => {
                      const page = await interopRequest(
                        "/api/interop/tools?cursor=" + encodeURIComponent(toolCursor),
                        toolPageSchema
                      );
                      setTools((current) => [...current, ...page.items]);
                      setToolCursor(page.nextCursor);
                    })
                  }
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
      )}
      {isOwner && (
        <ToolRegistration
          tools={tools}
          disabled={busy}
          onChanged={refresh}
          onError={(message) => note(message, "bad")}
        />
      )}
      {busy && <p role="status">Procesando recurso…</p>}
      {loading ? (
        <p role="status">Cargando recursos…</p>
      ) : resources.length === 0 && !error ? (
        <p className="interop-empty">
          Todavía no hay herramientas ni objetos de aprendizaje en esta sección.
        </p>
      ) : (
        <ul className="interop-resource-list">
          {resources.map((resource) => (
            <li key={resource.id}>
              <div>
                <span>{kindLabel[resource.kind]}</span>
                <h3>{resource.title}</h3>
              </div>
              <div className="interop-actions">
                {resource.kind !== "lti" && (
                  <button
                    className="secondary-button"
                    aria-label={"Descargar " + resource.title}
                    disabled={busy}
                    onClick={() =>
                      void act(() =>
                        downloadInteropFile(base + "/" + resource.id, resource.title + ".zip")
                      )
                    }
                    type="button"
                  >
                    <DownloadSimple size={18} aria-hidden="true" />
                    ZIP
                  </button>
                )}
                <button
                  className="primary-button"
                  disabled={busy || readOnly}
                  onClick={() => open(resource)}
                  type="button"
                >
                  <ArrowSquareOut size={18} aria-hidden="true" />
                  Abrir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {cursor && (
        <button
          className="secondary-button"
          disabled={busy}
          onClick={() =>
            void act(async () => {
              const page = await interopRequest(
                base + "?cursor=" + encodeURIComponent(cursor),
                resourcePageSchema
              );
              setResources((current) => [...current, ...page.items]);
              setCursor(page.nextCursor);
            })
          }
          type="button"
        >
          Cargar más recursos
        </button>
      )}
    </section>
  );
}

function ToolRegistration({
  tools,
  disabled,
  onChanged,
  onError,
}: {
  tools: InteropTool[];
  disabled: boolean;
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setSaving(true);
    try {
      await interopRequest("/api/interop/tools", toolSchema, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.get("name"),
          loginUrl: values.get("loginUrl"),
          redirectUris: String(values.get("redirectUris"))
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean),
          targetUris: String(values.get("targetUris"))
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      form.reset();
      await onChanged();
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : "No se pudo registrar la herramienta.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <details className="interop-authoring">
      <summary>Administrar herramientas LTI</summary>
      <p>
        Este registro habilita destinos para todas las secciones. Configura en el proveedor el
        issuer, la URL de autorización y JWKS disponibles en{" "}
        <a href="/api/interop/lti/configuration" target="_blank" rel="noreferrer">
          configuración de la plataforma
        </a>
        .
      </p>
      <form className="interop-registration" onSubmit={submit}>
        <label>
          Nombre de la herramienta
          <input name="name" maxLength={160} required />
        </label>
        <label>
          URL de inicio OIDC
          <input
            name="loginUrl"
            type="url"
            maxLength={2000}
            placeholder="https://proveedor.cl/login"
            required
          />
        </label>
        <label>
          URLs de retorno, una por línea
          <textarea name="redirectUris" rows={3} maxLength={20000} required />
        </label>
        <label>
          Destinos autorizados, uno por línea
          <textarea name="targetUris" rows={3} maxLength={40000} required />
        </label>
        <button className="primary-button" disabled={saving || disabled} type="submit">
          {saving ? "Registrando…" : "Registrar herramienta"}
        </button>
      </form>
      <ul className="interop-tool-list">
        {tools.map((tool) => (
          <li key={tool.id}>
            <strong>{tool.name}</strong>
            <dl>
              <dt>Client ID</dt>
              <dd>{tool.clientId}</dd>
              <dt>Deployment ID</dt>
              <dd>{tool.deploymentId}</dd>
            </dl>
            <button
              className="secondary-button"
              disabled={saving || disabled}
              onClick={async () => {
                setSaving(true);
                try {
                  await interopRequest("/api/interop/tools", z.object({ ok: z.boolean() }), {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: tool.id, enabled: !tool.enabled }),
                  });
                  await onChanged();
                } catch (cause) {
                  onError(
                    cause instanceof Error ? cause.message : "No se pudo cambiar la herramienta."
                  );
                } finally {
                  setSaving(false);
                }
              }}
              type="button"
            >
              {tool.enabled ? "Deshabilitar" : "Habilitar"}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
