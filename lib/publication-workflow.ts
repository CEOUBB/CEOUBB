// Implements: REQ-PUB-01 REQ-PUB-02 REQ-PUB-03 REQ-PUB-04 REQ-PUB-05 REQ-PUB-06 REQ-PUB-07 REQ-PUB-08

export const DEFAULT_EDITOR_STORAGE_KEY = "ceoubb_default_editor";

export const EDITOR_MODES = [
  {
    value: "visual",
    label: "Visual tipo Word",
    description: "Para redactar con una experiencia familiar y guiada.",
  },
  {
    value: "markdown",
    label: "Markdown + LaTeX",
    description: "Para apuntes técnicos, fórmulas y código con vista previa.",
  },
  {
    value: "html",
    label: "Código HTML libre",
    description: "Para trabajar directamente con marcado académico.",
  },
] as const;

export const CONTENT_TYPES = [
  {
    value: "notice",
    label: "Aviso o portada del ramo",
    description: "Bienvenida, información general o anuncio destacado.",
  },
  {
    value: "assessment",
    label: "Certamen o evaluación",
    description: "Instrucciones, pauta, fecha o material de evaluación.",
  },
  {
    value: "guide",
    label: "Guía de estudio",
    description: "Objetivos, desarrollo, ejercicios y material de apoyo.",
  },
  {
    value: "blank",
    label: "En blanco",
    description: "Empieza sin estructura ni contenido sugerido.",
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
export type PublicationContentType = (typeof CONTENT_TYPES)[number]["value"];
export type NotificationMode = (typeof NOTIFICATION_MODES)[number]["value"];

export type PublicationPreferenceStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

export type PublicationDraft = {
  contentType: PublicationContentType;
  editorMode: EditorMode;
  folder: string;
  kind: "notice" | "guide" | "assessment";
  notificationMode: NotificationMode;
};

export function isEditorMode(value: unknown): value is EditorMode {
  return EDITOR_MODES.some((mode) => mode.value === value);
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

export function createPublicationDraft({
  contentType,
  editorMode,
  folder,
  notificationMode,
}: {
  contentType: PublicationContentType;
  editorMode: EditorMode;
  folder: string;
  notificationMode: NotificationMode;
}): PublicationDraft {
  return {
    contentType,
    editorMode,
    folder: folder.trim(),
    kind:
      contentType === "assessment" ? "assessment" : contentType === "guide" ? "guide" : "notice",
    notificationMode,
  };
}
