"use client";

import { Browser } from "@capacitor/browser";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { isNativeShell } from "./mobile-bridge";

/*
  Apertura de material académico en el contenedor nativo. La WebView no debe
  intentar pintar un PDF: en Android el visor embebido es lento, no permite
  buscar dentro del documento y deja al estudiante sin la opción de guardarlo.
  Se descarga a caché y se entrega al visor del sistema.

  Todo devuelve `false` ante cualquier problema para que el llamador degrade a
  `window.open`, que es el comportamiento del portal web. Un `false` de más sólo
  cuesta abrir el documento en el navegador; una excepción rompería la vista.
*/

/** El nombre viaja desde Firestore: se normaliza para que no escape del directorio de caché. */
function cacheFileName(fileName: string): string {
  const clean = fileName.replace(/[^\w.-]+/g, "_").replace(/^\.+/, "");
  return clean.length > 0 ? clean : "documento.pdf";
}

/**
 * Descarga el documento con Capacitor Filesystem y lo entrega al visor nativo.
 * Devuelve `true` sólo cuando el hand-off ocurrió; `false` significa "usa la
 * ruta web de siempre".
 */
// Implements: REQ-CAP-11
export async function openDocumentNatively(url: string, fileName: string): Promise<boolean> {
  // Salida temprana no-nativa: en el navegador el visor del propio Chrome ya
  // hace este trabajo y Filesystem ni siquiera está implementado.
  if (!isNativeShell()) return false;

  const path = `ceoubb/${cacheFileName(fileName)}`;
  try {
    // Directory.Cache: material académico reemplazable, el sistema puede
    // limpiarlo bajo presión de almacenamiento sin perder nada del alumno.
    const download = url.startsWith("blob:")
      ? await (async () => {
          const response = await fetch(url);
          if (!response.ok) throw new Error("No se pudo leer el archivo.");
          const blob = await response.blob();
          const data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(reader.error);
            reader.onload = () =>
              typeof reader.result === "string"
                ? resolve(reader.result.split(",")[1])
                : reject(new Error("Archivo inválido."));
            reader.readAsDataURL(blob);
          });
          const file = await Filesystem.writeFile({
            path,
            data,
            directory: Directory.Cache,
            recursive: true,
          });
          return { path: file.uri };
        })()
      : await Filesystem.downloadFile({ url, path, directory: Directory.Cache });
    // `downloadFile` devuelve la ruta del archivo escrito; si el plugin no la
    // entrega se resuelve el URI del mismo destino que se acaba de pedir.
    const uri =
      download.path ?? (await Filesystem.getUri({ path, directory: Directory.Cache })).uri;
    if (!uri) return false;

    await Browser.open({ url: uri });
    return true;
  } catch {
    return false;
  }
}
