import { z } from "zod";
import { fail } from "./errors.ts";

// Implements: REQ-QMD-05
export function secureUrl(value: string) {
  if (!URL.canParse(value)) {
    return fail("La URL no es válida.");
  }
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.hash ||
    value.length > 2000 ||
    url.hostname === "localhost" ||
    url.hostname.endsWith(".local")
  )
    fail("Usa una URL HTTPS pública sin credenciales ni fragmento.");
  return url.href;
}

export function platformOrigin() {
  const value = process.env.INTEROP_PLATFORM_ORIGIN || "https://ceoubb.com";
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    fail("El origen del portal no está configurado correctamente.", 503);
  }
  if (
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password ||
    (url.protocol !== "https:" &&
      !(
        process.env.NODE_ENV !== "production" &&
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      ))
  )
    fail("El origen del portal no está configurado correctamente.", 503);
  return url.origin;
}

export function contentOrigin() {
  const value = process.env.INTEROP_CONTENT_ORIGIN;
  if (!value) fail("Falta configurar el origen aislado para los objetos de aprendizaje.", 503);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    fail("Falta configurar el origen aislado para los objetos de aprendizaje.", 503);
  }
  let platformHostname: string;
  try {
    platformHostname = new URL(platformOrigin()).hostname;
  } catch {
    platformHostname = "";
  }
  if (
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password ||
    url.hostname === platformHostname ||
    (url.protocol !== "https:" &&
      !(
        process.env.NODE_ENV !== "production" &&
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      ))
  )
    fail("Los contenidos requieren un host distinto del portal.", 503);
  return url.origin;
}

// Implements: REQ-INT-05
export const toolInputSchema = z.strictObject({
  name: z.string().trim().min(1).max(160),
  loginUrl: z.string().max(2000).transform(secureUrl),
  redirectUris: z.array(z.string().max(2000).transform(secureUrl)).min(1).max(10),
  targetUris: z.array(z.string().max(2000).transform(secureUrl)).min(1).max(20),
});

// Implements: REQ-INT-05
export const resourceInputSchema = z.strictObject({
  title: z.string().trim().min(1).max(160),
  toolId: z.uuid(),
  targetUrl: z.string().max(2000).transform(secureUrl),
});
