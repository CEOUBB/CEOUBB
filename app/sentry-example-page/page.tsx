"use client";

import * as Sentry from "@sentry/nextjs";
import { useState } from "react";

const pageStyle = {
  minHeight: "100dvh",
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "system-ui, -apple-system, sans-serif",
  padding: "2rem",
  backgroundColor: "#f4f6f9",
};

const cardStyle = {
  maxWidth: "520px",
  width: "100%",
  background: "#ffffff",
  padding: "2.5rem",
  borderRadius: "16px",
  boxShadow: "0 4px 20px rgba(15, 23, 42, 0.06)",
  textAlign: "center" as const,
};

const serverBtnStyle = {
  backgroundColor: "#0055b8",
  color: "#ffffff",
  border: "none",
  borderRadius: "10px",
  padding: "0.85rem 1.5rem",
  fontSize: "1rem",
  fontWeight: 600,
  transition: "opacity 0.2s",
};

const clientBtnStyle = {
  backgroundColor: "#e11d48",
  color: "#ffffff",
  border: "none",
  borderRadius: "10px",
  padding: "0.85rem 1.5rem",
  fontSize: "1rem",
  fontWeight: 600,
  cursor: "pointer",
};

export default function SentryExamplePage() {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleClientError = () => {
    try {
      throw new Error("Sentry Client-Side Test Error — CEOUBB");
    } catch (err) {
      const id = Sentry.captureException(err);
      setStatus(`Error de cliente enviado. Event ID: ${id || "procesando…"}`);
      throw err;
    }
  };

  const handleServerError = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/sentry-test");
      if (!res.ok) {
        setStatus(`❌ Error al contactar la API: HTTP ${res.status}`);
        return;
      }
      const data = (await res.json()) as { eventId?: string };
      setStatus(`✅ Error de servidor enviado exitosamente. Event ID: ${data.eventId}`);
    } catch (e) {
      setStatus(`❌ Error al contactar la API: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: "bold", color: "#0f172a", marginBottom: "0.5rem" }}>Verificación Sentry (CEOUBB)</h1>
        <p style={{ color: "#64748b", fontSize: "0.95rem", marginBottom: "1.75rem", lineHeight: 1.5 }}>
          Si recién agregaste el DSN a <code>.env.local</code>, asegúrate de <strong>reiniciar el servidor (pnpm dev)</strong> para que Next.js cargue las variables.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <button
            type="button"
            disabled={loading}
            onClick={handleServerError}
            style={{
              ...serverBtnStyle,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Enviando error…" : "⚡ Enviar Error de Servidor (API Route)"}
          </button>

          <button
            type="button"
            onClick={handleClientError}
            style={clientBtnStyle}
          >
            🔥 Disparar Error de Cliente (Browser)
          </button>
        </div>

        {status && (
          <div style={{ marginTop: "1.5rem", padding: "1rem", borderRadius: "8px", backgroundColor: "#f1f5f9", color: "#0f172a", fontSize: "0.875rem", fontWeight: 500 }}>
            {status}
          </div>
        )}
      </div>
    </main>
  );
}
