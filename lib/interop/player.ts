import { contentOrigin, platformOrigin } from "./config.ts";
import { escapeXml } from "./errors.ts";
import type { PackageManifest } from "./packages.ts";
import { createScormRuntime } from "./scorm.ts";

export function contentHeaders() {
  const origin = contentOrigin();
  return {
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy":
      "default-src 'none'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self' data:; connect-src 'self'; frame-src 'self'; object-src 'none'; worker-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors " +
      platformOrigin() +
      " " +
      origin +
      "; sandbox allow-scripts allow-same-origin",
  };
}

export function playerDocument(input: {
  manifest: PackageManifest;
  grant: string;
  actorId: string;
  registration: string;
  progress: { version: number; data: Record<string, string> };
}) {
  const base = "/api/interop/content/" + input.grant + "/";
  const launch = new URL(
    contentOrigin() +
      base +
      "files/" +
      input.manifest.launchPath.split("/").map(encodeURIComponent).join("/")
  );
  const actor = {
    objectType: "Agent",
    account: { homePage: platformOrigin(), name: input.actorId },
  };
  if (input.manifest.kind === "xapi") {
    launch.searchParams.set("endpoint", contentOrigin() + base + "xapi/");
    launch.searchParams.set("auth", "Bearer " + input.grant);
    launch.searchParams.set("actor", JSON.stringify(actor));
    launch.searchParams.set("registration", input.registration);
    launch.searchParams.set("activity_id", input.manifest.activityId);
  }
  const state = JSON.stringify({ ...input, base }).replaceAll("<", "\\u003c");
  const script = `
    const config = ${state};
    let version = config.progress.version;
    const status = document.getElementById("status");
    const save = (data) => {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", config.base + "progress", false);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send(JSON.stringify({ version, data }));
        if (xhr.status !== 200) {
          status.textContent = "No se guardó el avance. Cierra y vuelve a abrir el recurso.";
          return false;
        }
        version = JSON.parse(xhr.responseText).version;
        status.textContent = "Avance guardado";
        return true;
      } catch {
        status.textContent = "No se pudo guardar el avance. Revisa tu conexión.";
        return false;
      }
    };
    if (config.manifest.kind !== "xapi") {
      const initial = { ...config.progress.data };
      const old = config.manifest.kind === "scorm12";
      initial[old ? "cmi.core.student_id" : "cmi.learner_id"] = config.actorId;
      initial[old ? "cmi.core.entry" : "cmi.entry"] = initial[old ? "cmi.core.exit" : "cmi.exit"] === "suspend" ? "resume" : "ab-initio";
      const runtime = (${createScormRuntime.toString()})(config.manifest.kind, initial, save);
      window[old ? "API" : "API_1484_11"] = runtime;
    }
    document.getElementById("sco").src = ${JSON.stringify(launch.href).replaceAll("<", "\\u003c")};
  `;
  return (
    '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' +
    escapeXml(input.manifest.title) +
    '</title><style>body{margin:0;font:15px system-ui;background:#f4f6f9;color:#0f172a}p{padding:8px 16px;margin:0}iframe{width:100%;height:calc(100vh - 40px);border:0;background:white}</style></head><body><p id="status" role="status">El objeto guardará el avance al confirmarlo.</p><iframe id="sco" title="' +
    escapeXml(input.manifest.title) +
    '" sandbox="allow-scripts allow-same-origin"></iframe><script>' +
    script +
    "</script></body></html>"
  );
}
