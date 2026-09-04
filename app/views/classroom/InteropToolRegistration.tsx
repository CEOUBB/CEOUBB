"use client";

// Implements: REQ-QMD-07
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { interopRequest, toolSchema, type InteropTool } from "../../../lib/interop/client";

export function ToolRegistration({
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
