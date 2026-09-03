/* ── Recursos de estudio ──────────────────────────────────────
   Plataformas y servicios externos categorizados por condición
   de uso y grupo institucional.
   ─────────────────────────────────────────────────────────── */

export type Brand =
  | "chatgpt"
  | "claude"
  | "gemini"
  | "deepseek"
  | "kimi"
  | "qwen"
  | "github"
  | "notion"
  | "microsoft"
  | "autodesk"
  | "spotify"
  | "applemusic"
  | "moodle"
  | "youtubemusic"
  | "perplexity";

/* Todo lo que no es CEOUBB entra al mismo índice: un servicio externo con
   marca, nombre, condición de uso y destino. La condición viaja en el propio
   ítem —y no en un encabezado de tramo— para que el filtro pueda cruzarla y
   para que la fila siga siendo legible fuera de su grupo. */
export type ResourceTone = "free" | "plan";

export type ResourceItem = {
  name: string;
  url: string;
  host: string;
  /* Sólo cuando distingue a esta ficha de sus vecinas del grupo. */
  tag?: string;
  tone?: ResourceTone;
  note?: string;
  brand?: Brand;
  image?: string;
};

export type ResourceGroup = {
  id: string;
  title: string;
  /* Aclaraciones de la etiqueta, una por condición usada en el grupo. */
  notes?: string[];
  /* Descargo institucional al pie del grupo. */
  disclaimer?: string;
  items: ResourceItem[];
};

export const RESOURCE_GROUPS: ResourceGroup[] = [
  {
    id: "ia",
    title: "Asistentes de inteligencia artificial",
    notes: [
      "* En ChatGPT los límites afectan sólo a los modelos avanzados y a la subida de archivos.",
    ],
    items: [
      {
        brand: "deepseek",
        name: "DeepSeek",
        host: "chat.deepseek.com",
        url: "https://chat.deepseek.com",
        tag: "Sin límites",
        tone: "free",
      },
      {
        brand: "qwen",
        name: "Qwen",
        host: "chat.qwen.ai",
        url: "https://chat.qwen.ai",
        tag: "Sin límites",
        tone: "free",
      },
      {
        brand: "chatgpt",
        name: "ChatGPT",
        host: "chatgpt.com",
        url: "https://chatgpt.com",
        tag: "Con límites*",
        tone: "plan",
      },
      {
        brand: "claude",
        name: "Claude",
        host: "claude.ai",
        url: "https://claude.ai",
        tag: "Con límites",
        tone: "plan",
      },
      {
        brand: "gemini",
        name: "Google Gemini",
        host: "gemini.google.com",
        url: "https://gemini.google.com",
        tag: "Con límites",
        tone: "plan",
      },
      {
        image: "/brand/gemini-notebook.webp",
        name: "Gemini Notebook",
        host: "notebooklm.google.com",
        url: "https://notebooklm.google.com",
        tag: "Con límites",
        tone: "plan",
      },
      {
        brand: "kimi",
        name: "Kimi",
        host: "kimi.com",
        url: "https://www.kimi.com",
        tag: "Con límites",
        tone: "plan",
      },
      {
        brand: "perplexity",
        name: "Perplexity AI",
        host: "perplexity.ai",
        url: "https://www.perplexity.ai",
        tag: "Con límites",
        tone: "plan",
      },
    ],
  },
  {
    id: "beneficios",
    title: "Beneficios con tu correo institucional",
    items: [
      {
        brand: "github",
        name: "GitHub Student Pack",
        host: "education.github.com",
        url: "https://education.github.com/pack",
        tag: "Gratis",
        tone: "free",
        note: "Copilot, la suite completa de JetBrains y mucho más.",
      },
      {
        brand: "microsoft",
        name: "Microsoft 365 UBB",
        host: "microsoft365.com",
        url: "https://www.microsoft365.com",
        tag: "Gratis",
        tone: "free",
        note: "Office en 5 equipos y OneDrive institucional.",
      },
      {
        brand: "notion",
        name: "Notion para Educación",
        host: "notion.com",
        url: "https://www.notion.com/product/notion-for-education",
        tag: "Gratis",
        tone: "free",
        note: "Plan Plus con archivos ilimitados.",
      },
      {
        brand: "autodesk",
        name: "Autodesk Education",
        host: "autodesk.com",
        url: "https://www.autodesk.com/education/edu-software",
        tag: "Gratis",
        tone: "free",
        note: "AutoCAD, Revit, Fusion 360 e Inventor.",
      },
      {
        brand: "spotify",
        name: "Spotify Premium",
        host: "spotify.com",
        url: "https://www.spotify.com/cl/student/",
        tag: "Tarifa rebajada",
        tone: "plan",
        note: "$2.700 al mes mientras dure la verificación.",
      },
      {
        brand: "applemusic",
        name: "Apple Music",
        host: "apple.com",
        url: "https://www.apple.com/cl/apple-music/",
        tag: "Tarifa rebajada",
        tone: "plan",
        note: "Tarifa reducida con Apple TV+ incluido.",
      },
      {
        brand: "youtubemusic",
        name: "YouTube Premium",
        host: "youtube.com",
        url: "https://www.youtube.com/premium/student",
        tag: "Tarifa rebajada",
        tone: "plan",
        note: "Sin anuncios y con reproducción en segundo plano.",
      },
    ],
  },
  {
    /* Cada servicio lleva su propia marca cuando la tiene (Moodle como vector,
       Adecca como imagen); el resto usa el escudo UBB, que es su identidad real.
       Ninguno lleva etiqueta: la condición es la misma para los cinco. */
    id: "portales",
    title: "Portales y servicios oficiales UBB",
    disclaimer:
      "Sistemas administrados por la Universidad del Bío-Bío. CEOUBB es una plataforma estudiantil independiente y no los reemplaza.",
    items: [
      {
        name: "Intranet Alumnos UBB",
        host: "intranet.ubiobio.cl",
        url: "https://intranet.ubiobio.cl",
      },
      {
        name: "Adecca UBB",
        host: "adecca.ubiobio.cl",
        url: "https://adecca.ubiobio.cl",
        image: "/brand/adecca-mark.webp",
      },
      {
        brand: "moodle",
        name: "Moodle UBB",
        host: "moodle.ubiobio.cl",
        url: "https://moodle.ubiobio.cl",
      },
      {
        name: "Biblioteca Central Werken",
        host: "werken.ubiobio.cl",
        url: "https://werken.ubiobio.cl/",
        image: "/brand/werken-mark.webp",
      },
      {
        name: "Portal Institucional UBB",
        host: "ubiobio.cl",
        url: "https://www.ubiobio.cl",
      },
    ],
  },
];
