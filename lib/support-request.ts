import { z } from "zod";

// Implements: REQ-SUP-01
// Fuente única de la forma de una solicitud de soporte. El formulario del
// navegador y el manejador de ruta validan contra este mismo esquema; el
// servidor nunca confía en el veredicto del cliente.

export const CATEGORIAS_SOPORTE = [
  "soporte-tecnico",
  "sugerencia",
  "reporte-error",
  "duda-academica",
] as const;

export type CategoriaSoporte = (typeof CATEGORIAS_SOPORTE)[number];

export const CATEGORIA_ETIQUETAS: Record<CategoriaSoporte, string> = {
  "soporte-tecnico": "Soporte técnico",
  sugerencia: "Sugerencia",
  "reporte-error": "Reporte de error",
  "duda-academica": "Duda académica",
};

/** Tiempo mínimo, en milisegundos, entre presentar el formulario y enviarlo. */
export const DURACION_MINIMA_MS = 3000;

/** Tamaño máximo del cuerpo de la petición, en bytes. */
export const TAMANO_MAXIMO_BYTES = 8 * 1024;

/** Los cinco campos que la persona completa. Lo que el formulario valida. */
export const solicitudSoporteSchema = z.object({
  nombre: z.string().trim().min(2, "Indica tu nombre.").max(120, "El nombre es demasiado largo."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Revisa el formato del correo."))
    .pipe(z.string().max(254, "El correo es demasiado largo.")),
  categoria: z.enum(CATEGORIAS_SOPORTE, { error: "Selecciona una categoría." }),
  asunto: z
    .string()
    .trim()
    .min(4, "Resume tu consulta en el asunto.")
    .max(160, "El asunto es demasiado largo."),
  mensaje: z
    .string()
    .trim()
    .min(20, "Cuéntanos un poco más para poder ayudarte.")
    .max(4000, "El mensaje supera los 4000 caracteres."),
});

/**
 * Lo que viaja por la red: los campos de la persona más los dos controles
 * antiabuso. Se mantienen fuera del esquema del formulario para que un fallo
 * en ellos nunca se muestre como error de un campo visible.
 *
 * `sitioWeb` es el señuelo: está oculto de la maquetación y de la tecnología
 * asistiva, así que solo un cliente automatizado lo completa. El esquema lo
 * acepta con cualquier contenido a propósito. Si lo rechazara aquí, la
 * respuesta sería un 400 con errores de campo, y eso le diría al cliente
 * automatizado exactamente qué lo delató. La decisión se toma en la ruta, que
 * responde igual que ante una aceptación.
 *
 * `duracionMs` es tiempo transcurrido medido en el propio navegador, no una
 * marca de tiempo. Una marca de tiempo dependería de que el reloj del cliente
 * coincida con el del servidor, y muchos no coinciden.
 */
export const envioSoporteSchema = solicitudSoporteSchema.extend({
  sitioWeb: z.string().max(200).optional(),
  duracionMs: z.number().int().nonnegative().optional(),
  turnstileToken: z.string().max(2048).optional(),
  cfTurnstileResponse: z.string().max(2048).optional(),
});

export type SolicitudSoporte = z.infer<typeof solicitudSoporteSchema>;
export type EnvioSoporte = z.infer<typeof envioSoporteSchema>;

/** Errores por campo, en la forma que consume el formulario. */
export type ErroresPorCampo = Partial<Record<keyof SolicitudSoporte, string>>;

export function erroresPorCampo(error: z.ZodError): ErroresPorCampo {
  const salida: ErroresPorCampo = {};
  for (const incidencia of error.issues) {
    const campo = incidencia.path[0];
    if (typeof campo === "string" && !(campo in salida)) {
      salida[campo as keyof SolicitudSoporte] = incidencia.message;
    }
  }
  return salida;
}
