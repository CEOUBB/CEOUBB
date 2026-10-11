// Implements: REQ-PUB-01 REQ-PUB-02 REQ-PUB-03 REQ-PUB-04 REQ-PUB-05 REQ-PUB-06 REQ-PUB-07 REQ-PUB-08 REQ-PUB-09

export const DEFAULT_EDITOR_STORAGE_KEY = "ceoubb_default_editor";
export const DRAFT_STORAGE_PREFIX = "ceoubb_publication_draft";

export const EDITOR_MODES = [
  {
    value: "visual",
    label: "Visual tipo Word",
    description: "Para redactar con una experiencia familiar y guiada.",
  },
  {
    value: "markdown",
    label: "Markdown",
    description: "Para apuntes técnicos, fórmulas y código con vista previa.",
  },
  {
    value: "html",
    label: "Marcado HTML",
    description: "Para editar o pegar etiquetas HTML estándar reconocidas por el aula.",
  },
] as const;

export const NOTIFICATION_MODES = [
  {
    value: "push",
    label: "Publicar y alertar",
    description: "Envía una notificación push a Android y Web.",
  },
  {
    value: "silent",
    label: "Publicar en silencio",
    description: "El contenido aparece en el aula sin interrumpir al curso.",
  },
] as const;

export type EditorMode = (typeof EDITOR_MODES)[number]["value"];
export type NotificationMode = (typeof NOTIFICATION_MODES)[number]["value"];

export type PublicationPreferenceStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

export function isEditorMode(value: unknown): value is EditorMode {
  return EDITOR_MODES.some((mode) => mode.value === value);
}

export function isNotificationMode(value: unknown): value is NotificationMode {
  return NOTIFICATION_MODES.some((mode) => mode.value === value);
}

export function readDefaultEditor(storage: PublicationPreferenceStorage | null): EditorMode | null {
  if (!storage) return null;
  try {
    const value = storage.getItem(DEFAULT_EDITOR_STORAGE_KEY);
    return isEditorMode(value) ? value : null;
  } catch {
    return null;
  }
}

export function persistDefaultEditor(
  storage: PublicationPreferenceStorage | null,
  mode: EditorMode | null
) {
  if (!storage) return false;
  try {
    if (mode) storage.setItem(DEFAULT_EDITOR_STORAGE_KEY, mode);
    else storage.removeItem(DEFAULT_EDITOR_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

/*
  Borrador de la publicación en curso. Es local al dispositivo y a la sección:
  una guía a medio escribir no debe aparecer en otro ramo, y un cierre de
  pestaña accidental no debe costar una hora de redacción.
*/
// Implements: REQ-PUB-11
export type StoredPublicationDraft = {
  editorMode: EditorMode;
  notificationMode: NotificationMode;
  title: string;
  body: string;
  folder: string;
  dueDate: string;
  linkUrl: string;
  savedAt: string;
};

export function draftStorageKey(courseId: string) {
  return `${DRAFT_STORAGE_PREFIX}:${courseId}`;
}

export function readPublicationDraft(
  storage: PublicationPreferenceStorage | null,
  courseId: string
): StoredPublicationDraft | null {
  if (!storage || !courseId) return null;
  try {
    const raw = storage.getItem(draftStorageKey(courseId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const value = parsed as Record<string, unknown>;
    const title = typeof value.title === "string" ? value.title : "";
    const body = typeof value.body === "string" ? value.body : "";
    if (!title.trim() && !body.trim()) return null;
    return {
      editorMode: isEditorMode(value.editorMode) ? value.editorMode : "visual",
      notificationMode: isNotificationMode(value.notificationMode)
        ? value.notificationMode
        : "push",
      title,
      body,
      folder: typeof value.folder === "string" ? value.folder : "",
      dueDate: typeof value.dueDate === "string" ? value.dueDate : "",
      linkUrl: typeof value.linkUrl === "string" ? value.linkUrl : "",
      savedAt: typeof value.savedAt === "string" ? value.savedAt : "",
    };
  } catch {
    return null;
  }
}

export function persistPublicationDraft(
  storage: PublicationPreferenceStorage | null,
  courseId: string,
  draft: StoredPublicationDraft
) {
  if (!storage || !courseId) return false;
  /* Un borrador vacío no merece ocupar el almacenamiento del dispositivo. */
  if (!draft.title.trim() && !draft.body.trim()) return clearPublicationDraft(storage, courseId);
  try {
    storage.setItem(draftStorageKey(courseId), JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function clearPublicationDraft(
  storage: PublicationPreferenceStorage | null,
  courseId: string
) {
  if (!storage || !courseId) return false;
  try {
    storage.removeItem(draftStorageKey(courseId));
    return true;
  } catch {
    return false;
  }
}

/*
  Estadísticas de lectura del cuerpo. 200 palabras por minuto es la velocidad
  de lectura silenciosa en español que reporta la literatura; sirve para que el
  docente sepa si está pidiendo dos minutos o quince.
*/
// Implements: REQ-PUB-12
export const READING_WORDS_PER_MINUTE = 200;

export function readingStats(body: string) {
  const plain = body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/[#>*_`|-]/g, " ");
  const words = plain.split(/\s+/).filter(Boolean).length;
  return {
    words,
    characters: body.length,
    minutes: words === 0 ? 0 : Math.max(1, Math.round(words / READING_WORDS_PER_MINUTE)),
  };
}
