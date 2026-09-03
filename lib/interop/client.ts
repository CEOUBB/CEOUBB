import { z } from "zod";

export const resourcePageSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      kind: z.enum(["lti", "scorm12", "scorm2004", "xapi"]),
      createdAt: z.string(),
    })
  ),
  nextCursor: z.string().nullable(),
});
export const toolSchema = z.object({
  id: z.string(),
  name: z.string(),
  clientId: z.string(),
  deploymentId: z.string(),
  loginUrl: z.string(),
  redirectUris: z.array(z.string()),
  targetUris: z.array(z.string()),
  enabled: z.boolean(),
});
export const toolPageSchema = z.object({
  items: z.array(toolSchema),
  nextCursor: z.string().nullable(),
});
export const launchSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("lti"), url: z.url() }),
  z.object({ kind: z.literal("content"), url: z.url(), title: z.string(), expiresAt: z.string() }),
]);
export type InteropResource = z.infer<typeof resourcePageSchema>["items"][number];
export type InteropTool = z.infer<typeof toolSchema>;
export async function interopRequest<T>(url: string, schema: z.ZodType<T>, init?: RequestInit) {
  const response = await fetch(url, { ...init, credentials: "same-origin" });
  const value: unknown = await response.json();
  if (!response.ok) {
    const error = z.object({ error: z.string() }).safeParse(value);
    throw new Error(error.success ? error.data.error : "No se pudo completar la operación.");
  }
  return schema.parse(value);
}
export function downloadInteropBytes(bytes: Uint8Array, filename: string) {
  const url = URL.createObjectURL(new Blob([bytes.slice().buffer], { type: "application/zip" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function downloadInteropFile(url: string, filename: string) {
  const response = await fetch(url, { credentials: "same-origin" });
  if (!response.ok) {
    const error = z.object({ error: z.string() }).safeParse(await response.json());
    throw new Error(error.success ? error.data.error : "No se pudo descargar el archivo.");
  }
  downloadInteropBytes(new Uint8Array(await response.arrayBuffer()), filename);
}
