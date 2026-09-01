"use client";

import {
  CodeBlock,
  Eye,
  EyeSlash,
  Function as FunctionIcon,
  Info,
  LinkSimple,
  ListBullets,
  ListNumbers,
  Minus,
  Quotes,
  Table,
  TextAlignCenter,
  TextAlignLeft,
  TextAlignRight,
  TextB,
  TextHOne,
  TextHThree,
  TextHTwo,
  TextItalic,
  TextUnderline,
  Warning,
  X,
} from "@phosphor-icons/react";
import {
  Fragment,
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useRef,
  useState,
  type ClipboardEvent,
  type InvalidEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";
import {
  EDITOR_MODES,
  htmlToAcademicMarkdown,
  markdownToEditorHtml,
  matchSlashCommands,
  slashQueryBefore,
  type EditorMode,
  type SlashCommand,
} from "../../../lib/multimodal-editor";
import {
  normalizeCodeLanguage,
  RICH_TEXT_MAX_LENGTH,
  safeLinkDestination,
  type CodeLanguage,
} from "../../../lib/rich-text";
import { RichText } from "./RichText";

type MultimodalEditorProps = {
  initialMode?: EditorMode;
  label?: string;
  maxLength?: number;
  name: string;
  onChange: (value: string) => void;
  onModeChange?: (mode: EditorMode) => void;
  required?: boolean;
  value: string;
};

type ToolAction =
  | "bold"
  | "italic"
  | "underline"
  | "justifyLeft"
  | "justifyCenter"
  | "justifyRight"
  | "heading1"
  | "heading2"
  | "heading3"
  | "insertUnorderedList"
  | "insertOrderedList"
  | "quote"
  | "divider"
  | "table"
  | "formula"
  | "code"
  | "callout"
  | "warning"
  | "link";

const modeLabels: Record<EditorMode, { label: string; detail: string }> = {
  visual: { label: "Visual", detail: "Edición tipo documento" },
  markdown: { label: "Markdown", detail: "Sintaxis técnica" },
  html: { label: "HTML", detail: "Código libre" },
};

/*
  La barra se agrupa por lo que hace el docente, no por lo que sabe el motor:
  dar énfasis, estructurar en títulos y listas, insertar un bloque académico y
  alinear. Los separadores marcan el corte entre grupos sin gastar una etiqueta.
*/
const visualTools = [
  { action: "bold", label: "Negrita", icon: TextB, pressed: true, group: "emphasis" },
  { action: "italic", label: "Cursiva", icon: TextItalic, pressed: true, group: "emphasis" },
  {
    action: "underline",
    label: "Subrayado",
    icon: TextUnderline,
    pressed: true,
    group: "emphasis",
  },
  {
    action: "heading1",
    label: "Título principal",
    icon: TextHOne,
    pressed: false,
    group: "blocks",
  },
  { action: "heading2", label: "Subtítulo", icon: TextHTwo, pressed: false, group: "blocks" },
  { action: "heading3", label: "Apartado", icon: TextHThree, pressed: false, group: "blocks" },
  {
    action: "insertUnorderedList",
    label: "Lista con viñetas",
    icon: ListBullets,
    pressed: true,
    group: "blocks",
  },
  {
    action: "insertOrderedList",
    label: "Lista numerada",
    icon: ListNumbers,
    pressed: true,
    group: "blocks",
  },
  { action: "quote", label: "Cita", icon: Quotes, pressed: false, group: "insert" },
  {
    action: "callout",
    label: "Nota destacada",
    icon: Info,
    pressed: false,
    group: "insert",
  },
  {
    action: "warning",
    label: "Aviso",
    icon: Warning,
    pressed: false,
    group: "insert",
  },
  { action: "divider", label: "Separador", icon: Minus, pressed: false, group: "insert" },
  { action: "table", label: "Insertar tabla", icon: Table, pressed: false, group: "insert" },
  {
    action: "formula",
    label: "Insertar fórmula LaTeX",
    icon: FunctionIcon,
    pressed: false,
    group: "insert",
  },
  {
    action: "code",
    label: "Insertar bloque de código",
    icon: CodeBlock,
    pressed: false,
    group: "insert",
  },
  { action: "link", label: "Insertar enlace", icon: LinkSimple, pressed: false, group: "insert" },
  {
    action: "justifyLeft",
    label: "Alinear a la izquierda",
    icon: TextAlignLeft,
    pressed: true,
    group: "align",
  },
  {
    action: "justifyCenter",
    label: "Centrar",
    icon: TextAlignCenter,
    pressed: true,
    group: "align",
  },
  {
    action: "justifyRight",
    label: "Alinear a la derecha",
    icon: TextAlignRight,
    pressed: true,
    group: "align",
  },
] as const;

type SlashMenuState = {
  commands: SlashCommand[];
  highlight: number;
  top: number;
  left: number;
};

const blockTagForAction: Partial<Record<ToolAction, string>> = {
  heading1: "h1",
  heading2: "h2",
  heading3: "h3",
  quote: "blockquote",
};

const allowedVisualTags = new Set([
  "a",
  "aside",
  "blockquote",
  "br",
  "code",
  "div",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "img",
  "li",
  "mark",
  "ol",
  "p",
  "pre",
  "span",
  "strong",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
]);

const blockedVisualTags = new Set([
  "audio",
  "button",
  "embed",
  "form",
  "iframe",
  "input",
  "link",
  "meta",
  "object",
  "script",
  "select",
  "style",
  "svg",
  "template",
  "textarea",
  "video",
]);

function appendSafeChildren(source: globalThis.Node, target: globalThis.Node, owner: Document) {
  for (const child of Array.from(source.childNodes)) {
    const safeChild = cloneSafeNode(child, owner);
    if (safeChild) target.appendChild(safeChild);
  }
}

function cloneSafeNode(source: globalThis.Node, owner: Document): globalThis.Node | null {
  if (source.nodeType === 3) return owner.createTextNode(source.textContent ?? "");
  if (source.nodeType !== 1) return null;

  const element = source as Element;
  const tag = element.tagName.toLowerCase();
  if (blockedVisualTags.has(tag)) return null;
  if (!allowedVisualTags.has(tag)) {
    const fragment = owner.createDocumentFragment();
    appendSafeChildren(element, fragment, owner);
    return fragment;
  }

  const safeElement = owner.createElement(tag);
  if (tag === "a") {
    const href = safeLinkDestination(element.getAttribute("href") ?? "");
    if (href) {
      safeElement.setAttribute("href", href);
      safeElement.setAttribute("rel", "noopener noreferrer");
    }
  }
  if (tag === "img") {
    const src = safeLinkDestination(element.getAttribute("src") ?? "");
    if (!src || !src.startsWith("https://")) return null;
    safeElement.setAttribute("src", src);
    safeElement.setAttribute("alt", element.getAttribute("alt") ?? "");
  }
  if (tag === "aside") {
    const callout = element.getAttribute("data-callout");
    safeElement.setAttribute("data-callout", callout === "assessment" ? "assessment" : "notice");
  }
  if ((tag === "span" || tag === "div") && element.hasAttribute("data-latex")) {
    const display = element.getAttribute("data-latex") === "display";
    const expression = element.getAttribute("data-source") ?? element.textContent ?? "";
    safeElement.setAttribute("data-latex", display ? "display" : "inline");
    safeElement.setAttribute("data-source", expression);
    safeElement.setAttribute("contenteditable", "false");
    safeElement.className = "editor-latex-token";
    safeElement.textContent = expression;
    return safeElement;
  }
  if (tag === "code") {
    const language = element.getAttribute("data-language");
    if (language) safeElement.setAttribute("data-language", language.replace(/[^a-z0-9_+-]/gi, ""));
  }
  if (tag === "p" || tag === "div") {
    const inlineAlignment = (element as HTMLElement).style.textAlign;
    const alignment = inlineAlignment || element.getAttribute("align") || "";
    if (["left", "center", "right"].includes(alignment))
      (safeElement as HTMLElement).style.textAlign = alignment;
  }
  if (["td", "th"].includes(tag)) {
    for (const attribute of ["colspan", "rowspan"]) {
      const value = element.getAttribute(attribute);
      if (value && /^\d{1,2}$/.test(value)) safeElement.setAttribute(attribute, value);
    }
  }

  appendSafeChildren(element, safeElement, owner);
  return safeElement;
}

function safeVisualFragment(html: string, owner: Document) {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const fragment = owner.createDocumentFragment();
  appendSafeChildren(parsed.body, fragment, owner);
  return fragment;
}

function selectionInside(editor: HTMLElement) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  return editor.contains(range.commonAncestorContainer) ? range : null;
}

function placeCaretAfter(node: globalThis.Node) {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.setStartAfter(node);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

function insertVisualNode(editor: HTMLElement, node: globalThis.Node) {
  const lastInserted = node.nodeType === 11 ? node.lastChild : node;
  const range = selectionInside(editor);
  if (range) {
    range.deleteContents();
    range.insertNode(node);
  } else {
    editor.appendChild(node);
  }
  if (lastInserted) placeCaretAfter(lastInserted);
}

function focusByArrow(
  event: KeyboardEvent<HTMLElement>,
  selector: string,
  activate?: (element: HTMLElement) => void
) {
  if (!new Set(["ArrowLeft", "ArrowRight", "Home", "End"]).has(event.key)) return;
  const container = event.currentTarget;
  const items = Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
    (item) => !item.hasAttribute("disabled")
  );
  const current = items.indexOf(document.activeElement as HTMLElement);
  if (current < 0 || items.length === 0) return;
  event.preventDefault();
  const nextIndex =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? items.length - 1
        : event.key === "ArrowRight"
          ? (current + 1) % items.length
          : (current - 1 + items.length) % items.length;
  items[nextIndex].focus();
  activate?.(items[nextIndex]);
}

function EditorTabs({
  baseId,
  mode,
  onModeChange,
  panelId,
}: {
  baseId: string;
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  panelId: string;
}) {
  return (
    <div
      aria-label="Modo de edición"
      className="editor-tabs"
      onKeyDown={(event) =>
        focusByArrow(event, '[role="tab"]', (element) =>
          onModeChange(element.dataset.mode as EditorMode)
        )
      }
      role="tablist"
      tabIndex={-1}
    >
      {EDITOR_MODES.map((editorMode) => (
        <button
          aria-controls={panelId}
          aria-selected={mode === editorMode}
          data-mode={editorMode}
          id={`${baseId}-${editorMode}-tab`}
          key={editorMode}
          onClick={() => onModeChange(editorMode)}
          role="tab"
          tabIndex={mode === editorMode ? 0 : -1}
          title={modeLabels[editorMode].detail}
          type="button"
        >
          {modeLabels[editorMode].label}
        </button>
      ))}
    </div>
  );
}

function EditorToolbar({
  activeTools,
  onApply,
}: {
  activeTools: Set<string>;
  onApply: (action: ToolAction) => void;
}) {
  return (
    <div
      aria-label="Formato de texto"
      className="editor-toolbar"
      onKeyDown={(event) => focusByArrow(event, "[data-editor-tool]")}
      role="toolbar"
    >
      {visualTools.map((tool, index) => {
        const ToolIcon = tool.icon;
        const startsGroup = index > 0 && visualTools[index - 1].group !== tool.group;
        return (
          <Fragment key={tool.action}>
            {startsGroup && <span aria-hidden="true" className="editor-toolbar-rule" />}
            <button
              aria-label={tool.label}
              aria-pressed={tool.pressed ? activeTools.has(tool.action) : undefined}
              data-editor-tool={tool.action}
              onClick={() => onApply(tool.action)}
              onMouseDown={(event) => event.preventDefault()}
              tabIndex={index === 0 ? 0 : -1}
              title={tool.label}
              type="button"
            >
              <ToolIcon aria-hidden="true" size={18} weight="bold" />
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}

function EditorComposePane({
  activeTools,
  draft,
  handleCodeKeyDown,
  handleMarkdownKeyDown,
  handlePaste,
  handleVisualKeyDown,
  htmlDraft,
  label,
  labelId,
  markdownRef,
  maxLength,
  mode,
  onApplyTool,
  onHtmlChange,
  onMarkdownChange,
  onRunSlashCommand,
  required,
  slash,
  syncVisual,
  visualRef,
}: {
  activeTools: Set<string>;
  draft: string;
  handleCodeKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  handleMarkdownKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  handlePaste: (event: ClipboardEvent<HTMLDivElement>) => void;
  handleVisualKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  htmlDraft: string;
  label: string;
  labelId: string;
  markdownRef: RefObject<HTMLTextAreaElement | null>;
  maxLength: number;
  mode: EditorMode;
  onApplyTool: (action: ToolAction) => void;
  onHtmlChange: (value: string) => void;
  onMarkdownChange: (value: string) => void;
  onRunSlashCommand: (command: SlashCommand) => void;
  required: boolean;
  slash: SlashMenuState | null;
  syncVisual: () => void;
  visualRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="editor-compose-pane">
      {mode === "visual" ? (
        <>
          <EditorToolbar activeTools={activeTools} onApply={onApplyTool} />
          <div className="editor-visual-frame">
            <div
              aria-labelledby={labelId}
              aria-multiline="true"
              aria-required={required}
              className="editor-visual-canvas"
              contentEditable
              data-placeholder="Escribe, pega desde Word o pulsa / para insertar un bloque"
              onInput={syncVisual}
              onKeyDown={handleVisualKeyDown}
              onPaste={handlePaste}
              ref={visualRef}
              role="textbox"
              spellCheck
              suppressContentEditableWarning
              tabIndex={0}
            />
            {slash && <SlashMenu onRun={onRunSlashCommand} state={slash} />}
          </div>
        </>
      ) : mode === "markdown" ? (
        /* Implements: REQ-EDITOR-09 */
        <div className="editor-code-pane">
          <div className="editor-code-bar">
            <span>Markdown</span>
            <small className="num">{draft.split("\n").length} líneas</small>
          </div>
          <textarea
            aria-label={`${label}: Markdown`}
            className="editor-source editor-source-markdown"
            maxLength={maxLength}
            onChange={(event) => onMarkdownChange(event.target.value)}
            onKeyDown={handleMarkdownKeyDown}
            placeholder={"Escribe Markdown. Usa $...$ para fórmulas y ```python para código."}
            ref={markdownRef}
            rows={18}
            spellCheck
            value={draft}
          />
        </div>
      ) : (
        <div className="editor-code-pane">
          <div className="editor-code-bar">
            <span>HTML</span>
            <small className="num">{htmlDraft.split("\n").length} líneas</small>
          </div>
          <textarea
            aria-label={`${label}: código HTML libre`}
            className="editor-source editor-source-html"
            maxLength={maxLength}
            onChange={(event) => onHtmlChange(event.target.value)}
            onKeyDown={handleCodeKeyDown}
            placeholder={
              "<section>\n  <h2>Contenido académico</h2>\n  <p>Escribe tu HTML…</p>\n</section>"
            }
            rows={18}
            spellCheck={false}
            value={htmlDraft}
          />
        </div>
      )}
    </div>
  );
}

// Implements: REQ-EDITOR-06
function SlashMenu({
  onRun,
  state,
}: {
  onRun: (command: SlashCommand) => void;
  state: SlashMenuState;
}) {
  return (
    <div
      aria-label="Insertar bloque"
      className="editor-slash-menu"
      role="listbox"
      style={{ top: `${state.top}px`, left: `${state.left}px` }}
    >
      <p>Insertar</p>
      {state.commands.map((command, index) => (
        <button
          aria-selected={index === state.highlight}
          className={index === state.highlight ? "is-highlighted" : ""}
          key={command.action}
          onClick={() => onRun(command)}
          onMouseDown={(event) => event.preventDefault()}
          role="option"
          type="button"
        >
          <strong>{command.label}</strong>
          <small>{command.hint}</small>
        </button>
      ))}
    </div>
  );
}

function EditorPreview({ value }: { value: string }) {
  return (
    <div aria-label="Vista previa de la publicación" className="rich-editor-preview">
      <div className="editor-preview-heading">
        <strong>Vista previa</strong>
        <span>Resultado seguro</span>
      </div>
      {value.trim() ? (
        <RichText body={value} />
      ) : (
        <p>El contenido formateado aparecerá aquí mientras escribes.</p>
      )}
    </div>
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const AVAILABLE_CODE_LANGUAGES: Array<{ value: CodeLanguage; label: string }> = [
  { value: "python", label: "Python" },
  { value: "matlab", label: "MATLAB / Octave" },
  { value: "cpp", label: "C++" },
  { value: "c", label: "C" },
  { value: "java", label: "Java" },
  { value: "sql", label: "SQL" },
  { value: "typescript", label: "TypeScript" },
  { value: "javascript", label: "JavaScript" },
  { value: "html", label: "HTML / XML" },
  { value: "css", label: "CSS" },
  { value: "json", label: "JSON" },
  { value: "bash", label: "Bash / Shell" },
  { value: "plain", label: "Texto plano" },
];

type ActiveModal =
  | { type: "code"; initialSource: string; initialLanguage: CodeLanguage }
  | { type: "formula"; initialExpression: string; display: boolean }
  | { type: "link"; initialText: string; initialHref: string }
  | { type: "table"; rows: number; cols: number };

function CodeModal({
  initialLanguage,
  initialSource,
  onCancel,
  onSubmit,
}: {
  initialLanguage: CodeLanguage;
  initialSource: string;
  onCancel: () => void;
  onSubmit: (language: CodeLanguage, code: string) => void;
}) {
  const [language, setLanguage] = useState<CodeLanguage>(initialLanguage);
  const [code, setCode] = useState(initialSource);

  const handleSubmit = () => {
    onSubmit(language, code);
  };

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="editor-modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        aria-labelledby="code-modal-title"
        aria-modal="true"
        className="editor-modal-card"
        role="dialog"
      >
        <div className="editor-modal-head">
          <h3 id="code-modal-title">Insertar bloque de código</h3>
          <button
            aria-label="Cerrar modal"
            className="editor-modal-close"
            onClick={onCancel}
            type="button"
          >
            <X size={18} />
          </button>
        </div>
        <div className="editor-modal-form">
          <label className="editor-modal-field">
            <span>Lenguaje de programación</span>
            <select
              autoFocus
              onChange={(event) => setLanguage(event.target.value as CodeLanguage)}
              value={language}
            >
              {AVAILABLE_CODE_LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </label>
          <label className="editor-modal-field">
            <span>Código</span>
            <textarea
              onChange={(event) => setCode(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                  event.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Escribe o pega aquí el código..."
              rows={6}
              value={code}
            />
          </label>
          <div className="editor-modal-actions">
            <button className="editor-modal-btn-cancel" onClick={onCancel} type="button">
              Cancelar
            </button>
            <button className="editor-modal-btn-submit" onClick={handleSubmit} type="button">
              Insertar código
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormulaModal({
  display: initialDisplay,
  initialExpression,
  onCancel,
  onSubmit,
}: {
  display: boolean;
  initialExpression: string;
  onCancel: () => void;
  onSubmit: (expression: string, display: boolean) => void;
}) {
  const [expression, setExpression] = useState(initialExpression);
  const [display, setDisplay] = useState(initialDisplay);

  const handleSubmit = () => {
    onSubmit(expression, display);
  };

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="editor-modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        aria-labelledby="formula-modal-title"
        aria-modal="true"
        className="editor-modal-card"
        role="dialog"
      >
        <div className="editor-modal-head">
          <h3 id="formula-modal-title">Insertar fórmula matemática</h3>
          <button
            aria-label="Cerrar modal"
            className="editor-modal-close"
            onClick={onCancel}
            type="button"
          >
            <X size={18} />
          </button>
        </div>
        <div className="editor-modal-form">
          <label className="editor-modal-field">
            <span>Expresión en LaTeX</span>
            <textarea
              autoFocus
              onChange={(event) => setExpression(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Ej: \sum_{i=1}^n x_i = 0  o  f(x) = \frac{a}{b}"
              rows={3}
              value={expression}
            />
          </label>
          <div className="editor-modal-field">
            <span>Disposición</span>
            <div className="editor-modal-radio-group">
              <label className="editor-modal-radio-label">
                <input
                  checked={!display}
                  name="latex-display"
                  onChange={() => setDisplay(false)}
                  type="radio"
                />
                <span>En línea ($...$)</span>
              </label>
              <label className="editor-modal-radio-label">
                <input
                  checked={display}
                  name="latex-display"
                  onChange={() => setDisplay(true)}
                  type="radio"
                />
                <span>Bloque centrado ($$...$$)</span>
              </label>
            </div>
          </div>
          <div className="editor-modal-actions">
            <button className="editor-modal-btn-cancel" onClick={onCancel} type="button">
              Cancelar
            </button>
            <button className="editor-modal-btn-submit" onClick={handleSubmit} type="button">
              Insertar fórmula
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LinkModal({
  initialHref,
  initialText,
  onCancel,
  onSubmit,
}: {
  initialHref: string;
  initialText: string;
  onCancel: () => void;
  onSubmit: (text: string, href: string) => void;
}) {
  const [text, setText] = useState(initialText);
  const [href, setHref] = useState(initialHref);

  const handleSubmit = () => {
    onSubmit(text, href);
  };

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="editor-modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        aria-labelledby="link-modal-title"
        aria-modal="true"
        className="editor-modal-card"
        role="dialog"
      >
        <div className="editor-modal-head">
          <h3 id="link-modal-title">Insertar enlace</h3>
          <button
            aria-label="Cerrar modal"
            className="editor-modal-close"
            onClick={onCancel}
            type="button"
          >
            <X size={18} />
          </button>
        </div>
        <div className="editor-modal-form">
          <label className="editor-modal-field">
            <span>Texto a mostrar</span>
            <input
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Ej: Drive del ramo, apunte en PDF..."
              type="text"
              value={text}
            />
          </label>
          <label className="editor-modal-field">
            <span>Dirección URL</span>
            <input
              autoFocus
              onChange={(event) => setHref(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="https://..."
              type="url"
              value={href}
            />
          </label>
          <div className="editor-modal-actions">
            <button className="editor-modal-btn-cancel" onClick={onCancel} type="button">
              Cancelar
            </button>
            <button className="editor-modal-btn-submit" onClick={handleSubmit} type="button">
              Insertar enlace
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TableModal({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (rows: number, cols: number) => void;
}) {
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(2);

  const handleSubmit = () => {
    onSubmit(rows, cols);
  };

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="editor-modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        aria-labelledby="table-modal-title"
        aria-modal="true"
        className="editor-modal-card"
        role="dialog"
      >
        <div className="editor-modal-head">
          <h3 id="table-modal-title">Insertar tabla</h3>
          <button
            aria-label="Cerrar modal"
            className="editor-modal-close"
            onClick={onCancel}
            type="button"
          >
            <X size={18} />
          </button>
        </div>
        <div className="editor-modal-form">
          <div className="editor-modal-grid-2">
            <label className="editor-modal-field">
              <span>Filas</span>
              <input
                autoFocus
                max={20}
                min={2}
                onChange={(event) => setRows(Math.max(2, Math.min(20, Number(event.target.value))))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleSubmit();
                  }
                }}
                type="number"
                value={rows}
              />
            </label>
            <label className="editor-modal-field">
              <span>Columnas</span>
              <input
                max={10}
                min={1}
                onChange={(event) => setCols(Math.max(1, Math.min(10, Number(event.target.value))))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleSubmit();
                  }
                }}
                type="number"
                value={cols}
              />
            </label>
          </div>
          <div className="editor-modal-actions">
            <button className="editor-modal-btn-cancel" onClick={onCancel} type="button">
              Cancelar
            </button>
            <button className="editor-modal-btn-submit" onClick={handleSubmit} type="button">
              Insertar tabla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function useMultimodalEditorController({
  initialMode = "visual",
  label = "Mensaje",
  maxLength = RICH_TEXT_MAX_LENGTH,
  name,
  onChange,
  onModeChange,
  required = false,
  value,
}: MultimodalEditorProps) {
  const baseId = useId();
  const visualRef = useRef<HTMLDivElement>(null);
  const markdownRef = useRef<HTMLTextAreaElement>(null);
  const lastEmittedRef = useRef(value);
  const [mode, setMode] = useState<EditorMode>(initialMode);
  const [htmlDraft, setHtmlDraft] = useState(() => markdownToEditorHtml(value));
  const pendingVisualHtmlRef = useRef(htmlDraft);
  const visualOriginHtmlRef = useRef(htmlDraft);
  const visualDirtyRef = useRef(false);
  const [announcement, setAnnouncement] = useState("");
  const [activeTools, setActiveTools] = useState<Set<string>>(() => new Set());
  const [slash, setSlash] = useState<SlashMenuState | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal | null>(null);
  /*
    El lienzo visual ya muestra el resultado, así que la vista previa sólo
    ocupa la mitad del ancho sin añadir nada. En Markdown y HTML el docente
    escribe fuente y sí necesita verla compuesta mientras escribe.
  */
  // Implements: REQ-EDITOR-07
  const [showPreview, setShowPreview] = useState(initialMode !== "visual");
  const previewValue = useDeferredValue(value);
  const panelId = `${baseId}-panel`;
  const labelId = `${baseId}-label`;

  const emit = (next: string) => {
    lastEmittedRef.current = next;
    onChange(next);
  };

  const renderVisual = (html: string) => {
    const editor = visualRef.current;
    if (!editor) return;
    editor.replaceChildren(safeVisualFragment(html, editor.ownerDocument));
    visualOriginHtmlRef.current = html;
    visualDirtyRef.current = false;
  };

  useEffect(() => {
    if (value === lastEmittedRef.current) return;
    lastEmittedRef.current = value;
    const html = markdownToEditorHtml(value);
    setHtmlDraft(html);
    pendingVisualHtmlRef.current = html;
    if (mode === "visual") renderVisual(html);
  }, [mode, value]);

  useEffect(() => {
    if (mode !== "visual") return;
    renderVisual(pendingVisualHtmlRef.current);
  }, [mode]);

  useEffect(() => {
    if (mode !== "visual") return;
    const refresh = () => {
      const editor = visualRef.current;
      if (!editor || !selectionInside(editor)) return setActiveTools(new Set());
      setActiveTools(
        new Set(
          ["bold", "italic", "underline", "justifyLeft", "justifyCenter", "justifyRight"].filter(
            (command) => document.queryCommandState(command)
          )
        )
      );
    };
    document.addEventListener("selectionchange", refresh);
    return () => document.removeEventListener("selectionchange", refresh);
  }, [mode]);

  /*
    El menú se ancla al cursor, no al lienzo: en un documento largo el docente
    ve las opciones donde está escribiendo y no al principio de la página.
  */
  // Implements: REQ-EDITOR-06
  const refreshSlashMenu = useCallback(() => {
    const editor = visualRef.current;
    if (!editor) return setSlash(null);
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return setSlash(null);
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return setSlash(null);
    const probe = range.cloneRange();
    probe.setStart(editor, 0);
    const query = slashQueryBefore(probe.toString());
    if (query === null) return setSlash(null);
    const commands = matchSlashCommands(query);
    if (commands.length === 0) return setSlash(null);
    const caret = range.getBoundingClientRect();
    const anchor = editor.getBoundingClientRect();
    setSlash({
      commands,
      highlight: 0,
      top: (caret.bottom || anchor.top) - anchor.top + 6,
      left: Math.max(0, (caret.left || anchor.left) - anchor.left),
    });
  }, []);

  const syncVisual = () => {
    const editor = visualRef.current;
    if (!editor) return;
    const next = htmlToAcademicMarkdown(editor.innerHTML);
    if (next.length > maxLength) {
      renderVisual(markdownToEditorHtml(value));
      setAnnouncement(`Se alcanzó el máximo de ${maxLength.toLocaleString("es-CL")} caracteres.`);
      return;
    }
    visualDirtyRef.current = true;
    emit(next);
    refreshSlashMenu();
  };

  const switchMode = (nextMode: EditorMode) => {
    if (nextMode === mode) return;
    setSlash(null);
    setShowPreview(nextMode !== "visual");
    if (nextMode === "html") {
      if (mode === "visual") {
        const editorHtml = visualRef.current?.innerHTML ?? "";
        setHtmlDraft(visualDirtyRef.current ? editorHtml : visualOriginHtmlRef.current);
      } else {
        setHtmlDraft(markdownToEditorHtml(value));
      }
    }
    if (nextMode === "visual") {
      const nextHtml = mode === "html" ? htmlDraft : markdownToEditorHtml(value);
      pendingVisualHtmlRef.current = nextHtml;
      visualOriginHtmlRef.current = nextHtml;
      visualDirtyRef.current = false;
    }
    setMode(nextMode);
    onModeChange?.(nextMode);
    setAnnouncement(`Modo ${modeLabels[nextMode].label} activo.`);
  };

  const openCodeModal = () => {
    let selectedText = "";
    if (mode === "visual" && visualRef.current) {
      selectedText = selectionInside(visualRef.current)?.toString() || "";
    } else if (mode === "markdown" && markdownRef.current) {
      const textarea = markdownRef.current;
      selectedText = value.slice(textarea.selectionStart, textarea.selectionEnd);
    }
    setActiveModal({
      type: "code",
      initialSource: selectedText || 'print("Hola mundo")',
      initialLanguage: "python",
    });
  };

  const submitCodeModal = (language: CodeLanguage, codeContent: string) => {
    setActiveModal(null);
    if (mode === "visual") {
      const editor = visualRef.current;
      if (!editor) return;
      editor.focus();
      const pre = document.createElement("pre");
      const code = document.createElement("code");
      code.dataset.language = language;
      code.textContent = codeContent;
      pre.appendChild(code);
      insertVisualNode(editor, pre);
      syncVisual();
    } else if (mode === "markdown") {
      const textarea = markdownRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const snippet = `\n\`\`\`${language}\n${codeContent}\n\`\`\`\n`;
      const next = `${value.slice(0, start)}${snippet}${value.slice(end)}`;
      emit(next);
      requestAnimationFrame(() => textarea.focus());
    } else {
      const snippet = `\n<pre><code data-language="${language}">${escapeHtml(codeContent)}</code></pre>\n`;
      handleHtmlChange(`${htmlDraft}${snippet}`);
    }
  };

  const openFormulaModal = () => {
    let selectedText = "";
    if (mode === "visual" && visualRef.current) {
      selectedText = selectionInside(visualRef.current)?.toString() || "";
    } else if (mode === "markdown" && markdownRef.current) {
      const textarea = markdownRef.current;
      selectedText = value.slice(textarea.selectionStart, textarea.selectionEnd);
    }
    setActiveModal({
      type: "formula",
      initialExpression: selectedText || "\\sum_{i=1}^n x_i = 0",
      display: false,
    });
  };

  const submitFormulaModal = (expression: string, display: boolean) => {
    setActiveModal(null);
    const clean = expression.trim();
    if (!clean) return;
    if (mode === "visual") {
      const editor = visualRef.current;
      if (!editor) return;
      editor.focus();
      if (display) {
        const div = document.createElement("div");
        div.dataset.latex = "display";
        div.dataset.source = clean;
        div.className = "editor-latex-token-display";
        div.contentEditable = "false";
        div.textContent = clean;
        insertVisualNode(editor, div);
      } else {
        const span = document.createElement("span");
        span.dataset.latex = "inline";
        span.dataset.source = clean;
        span.className = "editor-latex-token";
        span.contentEditable = "false";
        span.textContent = clean;
        insertVisualNode(editor, span);
      }
      syncVisual();
    } else if (mode === "markdown") {
      const textarea = markdownRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const snippet = display ? `\n$$\n${clean}\n$$\n` : `$${clean}$`;
      const next = `${value.slice(0, start)}${snippet}${value.slice(end)}`;
      emit(next);
      requestAnimationFrame(() => textarea.focus());
    } else {
      const snippet = display
        ? `\n<div data-latex="display">${clean}</div>\n`
        : `<span data-latex="inline">${clean}</span>`;
      handleHtmlChange(`${htmlDraft}${snippet}`);
    }
  };

  const openLinkModal = () => {
    let selectedText = "";
    if (mode === "visual" && visualRef.current) {
      selectedText = selectionInside(visualRef.current)?.toString() || "";
    } else if (mode === "markdown" && markdownRef.current) {
      const textarea = markdownRef.current;
      selectedText = value.slice(textarea.selectionStart, textarea.selectionEnd);
    }
    setActiveModal({
      type: "link",
      initialText: selectedText || "",
      initialHref: "https://",
    });
  };

  const submitLinkModal = (text: string, href: string) => {
    setActiveModal(null);
    const validHref = safeLinkDestination(href.trim());
    if (!validHref) {
      setAnnouncement("El enlace debe usar http, https o mailto.");
      return;
    }
    const label = text.trim() || validHref;
    if (mode === "visual") {
      const editor = visualRef.current;
      if (!editor) return;
      editor.focus();
      const anchor = document.createElement("a");
      anchor.href = validHref;
      anchor.rel = "noopener noreferrer";
      anchor.textContent = label;
      insertVisualNode(editor, anchor);
      syncVisual();
    } else if (mode === "markdown") {
      const textarea = markdownRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const snippet = `[${label}](${validHref})`;
      const next = `${value.slice(0, start)}${snippet}${value.slice(end)}`;
      emit(next);
      requestAnimationFrame(() => textarea.focus());
    } else {
      const snippet = `<a href="${validHref}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
      handleHtmlChange(`${htmlDraft}${snippet}`);
    }
  };

  const openTableModal = () => {
    setActiveModal({
      type: "table",
      rows: 2,
      cols: 2,
    });
  };

  const submitTableModal = (rows: number, cols: number) => {
    setActiveModal(null);
    if (mode === "visual") {
      const editor = visualRef.current;
      if (!editor) return;
      editor.focus();
      const table = document.createElement("table");
      const thead = table.createTHead();
      const headRow = thead.insertRow();
      for (let columnIndex = 0; columnIndex < cols; columnIndex += 1) {
        const th = document.createElement("th");
        th.textContent = `Encabezado ${columnIndex + 1}`;
        headRow.appendChild(th);
      }
      const tbody = table.createTBody();
      for (let r = 0; r < Math.max(1, rows - 1); r += 1) {
        const row = tbody.insertRow();
        for (let columnIndex = 0; columnIndex < cols; columnIndex += 1) {
          const cell = row.insertCell();
          cell.textContent = `Dato ${r + 1}-${columnIndex + 1}`;
        }
      }
      insertVisualNode(editor, table);
      syncVisual();
    } else if (mode === "markdown") {
      const textarea = markdownRef.current;
      if (!textarea) return;
      const headers = Array.from({ length: cols }, (_, i) => `Columna ${i + 1}`);
      const dividers = Array.from({ length: cols }, () => "---");
      const row = Array.from({ length: cols }, () => "Dato");
      const mdTable = `\n| ${headers.join(" | ")} |\n| ${dividers.join(" | ")} |\n| ${row.join(" | ")} |\n`;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const next = `${value.slice(0, start)}${mdTable}${value.slice(end)}`;
      emit(next);
      requestAnimationFrame(() => textarea.focus());
    }
  };

  const insertCallout = (tone: "notice" | "assessment") => {
    const editor = visualRef.current!;
    const range = selectionInside(editor);
    const aside = document.createElement("aside");
    aside.dataset.callout = tone;
    const paragraph = document.createElement("p");
    paragraph.textContent =
      range?.toString() ||
      (tone === "assessment" ? "Fecha, sala y condiciones" : "Escribe una nota importante");
    aside.appendChild(paragraph);
    insertVisualNode(editor, aside);
  };

  const insertDivider = () => {
    const editor = visualRef.current!;
    const fragment = document.createDocumentFragment();
    fragment.appendChild(document.createElement("hr"));
    /* Sin un párrafo detrás, el separador deja al cursor sin dónde seguir. */
    fragment.appendChild(document.createElement("p")).appendChild(document.createElement("br"));
    insertVisualNode(editor, fragment);
  };

  const applyTool = (action: ToolAction) => {
    if (action === "table") {
      openTableModal();
      return;
    }
    if (action === "formula") {
      openFormulaModal();
      return;
    }
    if (action === "code") {
      openCodeModal();
      return;
    }
    if (action === "link") {
      openLinkModal();
      return;
    }
    const editor = visualRef.current;
    if (!editor) return;
    editor.focus();
    const blockTag = blockTagForAction[action];
    if (blockTag) document.execCommand("formatBlock", false, blockTag);
    else if (action === "callout") insertCallout("notice");
    else if (action === "warning") insertCallout("assessment");
    else if (action === "divider") insertDivider();
    else document.execCommand(action, false);
    syncVisual();
  };

  const handleVisualKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (slash) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const step = event.key === "ArrowDown" ? 1 : -1;
        return setSlash((current) =>
          current
            ? {
                ...current,
                highlight:
                  (current.highlight + step + current.commands.length) % current.commands.length,
              }
            : current
        );
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        return runSlashCommand(slash.commands[slash.highlight]);
      }
      if (event.key === "Escape") {
        event.preventDefault();
        return setSlash(null);
      }
    }

    if (event.key === "Enter" && !event.shiftKey) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        const editor = visualRef.current;
        let current: Node | null = range.startContainer;
        let containerBlock: HTMLElement | null = null;
        while (current && current !== editor) {
          if (
            current instanceof HTMLElement &&
            (current.tagName === "BLOCKQUOTE" || current.tagName === "ASIDE")
          ) {
            containerBlock = current;
            break;
          }
          current = current.parentNode;
        }

        if (containerBlock && editor) {
          let currentChild: Node | null = range.startContainer;
          while (currentChild && currentChild.parentNode !== containerBlock) {
            currentChild = currentChild.parentNode;
          }
          const childText = currentChild?.textContent?.trim() ?? "";
          if (childText === "" && (containerBlock.textContent?.trim() ?? "") !== "") {
            // Doble Enter en línea vacía: salir del bloque y continuar en párrafo estándar
            event.preventDefault();
            if (currentChild && currentChild.parentNode === containerBlock) {
              containerBlock.removeChild(currentChild);
            }
            const nextP = document.createElement("p");
            nextP.appendChild(document.createElement("br"));
            containerBlock.parentNode?.insertBefore(nextP, containerBlock.nextSibling);
            const nextRange = document.createRange();
            nextRange.setStart(nextP, 0);
            nextRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(nextRange);
            syncVisual();
            return;
          } else {
            // Enter normal dentro de cita o aviso: insertar un párrafo interno sin duplicar el contenedor
            event.preventDefault();
            const newP = document.createElement("p");
            newP.appendChild(document.createElement("br"));
            if (currentChild && currentChild.nextSibling) {
              containerBlock.insertBefore(newP, currentChild.nextSibling);
            } else {
              containerBlock.appendChild(newP);
            }
            const nextRange = document.createRange();
            nextRange.setStart(newP, 0);
            nextRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(nextRange);
            syncVisual();
            return;
          }
        }
      }
    }

    if (!(event.ctrlKey || event.metaKey)) return;
    if (event.key.toLowerCase() === "b") {
      event.preventDefault();
      applyTool("bold");
    } else if (event.key.toLowerCase() === "i") {
      event.preventDefault();
      applyTool("italic");
    } else if (event.key.toLowerCase() === "k") {
      event.preventDefault();
      openLinkModal();
    }
  };

  const wrapMarkdownSelection = (before: string, after: string, fallback: string) => {
    const textarea = markdownRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end) || fallback;
    const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
    emit(next);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  const handleMarkdownKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    if (event.key.toLowerCase() === "b") {
      event.preventDefault();
      wrapMarkdownSelection("**", "**", "texto importante");
    } else if (event.key.toLowerCase() === "i") {
      event.preventDefault();
      wrapMarkdownSelection("*", "*", "énfasis");
    } else if (event.key.toLowerCase() === "k") {
      event.preventDefault();
      openLinkModal();
    }
  };

  /*
    Tabular dentro del panel de codigo indenta en vez de saltar al siguiente
    control, que es lo que espera cualquiera que haya escrito HTML.
    Escape devuelve el tabulador a su papel de navegacion para no atrapar al
    teclado dentro del campo.
  */
  // Implements: REQ-EDITOR-09 REQ-A11Y-01
  const escapeTabRef = useRef(false);
  const handleCodeKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      escapeTabRef.current = true;
      return;
    }
    if (event.key !== "Tab" || event.ctrlKey || event.metaKey || event.altKey) {
      escapeTabRef.current = false;
      return;
    }
    if (escapeTabRef.current) {
      escapeTabRef.current = false;
      return;
    }
    event.preventDefault();
    const field = event.currentTarget;
    const { selectionStart: start, selectionEnd: end, value: current } = field;
    const next = `${current.slice(0, start)}  ${current.slice(end)}`;
    handleHtmlChange(next);
    requestAnimationFrame(() => {
      field.selectionStart = field.selectionEnd = start + 2;
    });
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const editor = visualRef.current;
    if (!editor) return;
    const html = event.clipboardData.getData("text/html");
    if (html) insertVisualNode(editor, safeVisualFragment(html, editor.ownerDocument));
    else
      insertVisualNode(editor, document.createTextNode(event.clipboardData.getData("text/plain")));
    syncVisual();
  };

  // Implements: REQ-EDITOR-06
  const runSlashCommand = (command: SlashCommand) => {
    const editor = visualRef.current;
    setSlash(null);
    if (!editor) return;
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      /* Borra el `/consulta` que abrió el menú antes de insertar el bloque. */
      const probe = selection.getRangeAt(0).cloneRange();
      probe.setStart(editor, 0);
      const typed = slashQueryBefore(probe.toString());
      if (typed !== null) {
        for (let step = 0; step < typed.length + 1; step += 1)
          document.execCommand("delete", false);
      }
    }
    applyTool(command.action as ToolAction);
  };

  const counter = `${value.length.toLocaleString("es-CL")} / ${maxLength.toLocaleString("es-CL")}`;

  const handleHtmlChange = (nextHtml: string) => {
    setHtmlDraft(nextHtml);
    emit(htmlToAcademicMarkdown(nextHtml));
  };

  const handleInvalid = (event: InvalidEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    setAnnouncement(`Completa el campo ${label}.`);
    if (mode === "visual") visualRef.current?.focus();
    else event.currentTarget.parentElement?.querySelector<HTMLElement>(".editor-source")?.focus();
  };

  return {
    activeTools,
    activeModal,
    cancelModal: () => setActiveModal(null),
    submitCodeModal,
    submitFormulaModal,
    submitLinkModal,
    submitTableModal,
    announcement,
    baseId,
    counter,
    draft: value,
    handleHtmlChange,
    handleInvalid,
    handleCodeKeyDown,
    handleMarkdownKeyDown,
    handlePaste,
    handleVisualKeyDown,
    htmlDraft,
    label,
    labelId,
    markdownRef,
    maxLength,
    mode,
    name,
    panelId,
    previewValue,
    required,
    runSlashCommand,
    setSlash,
    showPreview,
    slash,
    togglePreview: () => setShowPreview((current) => !current),
    switchMode,
    syncVisual,
    visualRef,
    applyTool,
    emit,
  };
}

export function MultimodalEditor(props: MultimodalEditorProps) {
  const editor = useMultimodalEditorController(props);

  return (
    <div
      className="rich-editor multimodal-editor"
      data-requirement="Implements: REQ-EDITOR-01 REQ-EDITOR-02 REQ-EDITOR-03 REQ-EDITOR-04 REQ-EDITOR-05"
    >
      <span className="sr-only" id={editor.labelId}>
        {editor.label}
      </span>

      {/* Una sola fila de chrome: modo, vista previa y contador. */}
      <div className="rich-editor-heading">
        <EditorTabs
          baseId={editor.baseId}
          mode={editor.mode}
          onModeChange={editor.switchMode}
          panelId={editor.panelId}
        />
        <span className="rich-editor-heading-end">
          {/* En modo visual el lienzo ya es la vista previa; en Markdown y
              HTML el docente escribe fuente y sí necesita verla compuesta. */}
          <button
            aria-pressed={editor.showPreview}
            className="editor-preview-toggle"
            onClick={editor.togglePreview}
            type="button"
          >
            {editor.showPreview ? (
              <Eye aria-hidden="true" size={16} weight="fill" />
            ) : (
              <EyeSlash aria-hidden="true" size={16} />
            )}
            Vista previa
          </button>
          <span className="num">{editor.counter}</span>
        </span>
      </div>

      <div
        aria-labelledby={`${editor.baseId}-${editor.mode}-tab`}
        className="multimodal-editor-workspace"
        data-preview={editor.showPreview ? "on" : "off"}
        id={editor.panelId}
        role="tabpanel"
        tabIndex={0}
      >
        <EditorComposePane
          activeTools={editor.activeTools}
          draft={editor.draft}
          handleCodeKeyDown={editor.handleCodeKeyDown}
          handleMarkdownKeyDown={editor.handleMarkdownKeyDown}
          handlePaste={editor.handlePaste}
          handleVisualKeyDown={editor.handleVisualKeyDown}
          htmlDraft={editor.htmlDraft}
          label={editor.label}
          labelId={editor.labelId}
          markdownRef={editor.markdownRef}
          maxLength={editor.maxLength}
          mode={editor.mode}
          onApplyTool={editor.applyTool}
          onHtmlChange={editor.handleHtmlChange}
          onMarkdownChange={editor.emit}
          onRunSlashCommand={editor.runSlashCommand}
          required={editor.required}
          slash={editor.slash}
          syncVisual={editor.syncVisual}
          visualRef={editor.visualRef}
        />
        {editor.showPreview && <EditorPreview value={editor.previewValue} />}
      </div>

      <textarea
        aria-label={`${editor.label}: valor enviado`}
        className="sr-only editor-form-value"
        name={editor.name}
        onInvalid={editor.handleInvalid}
        readOnly
        required={editor.required}
        tabIndex={-1}
        value={editor.draft}
      />
      <p aria-atomic="true" aria-live="polite" className="sr-only">
        {editor.announcement}
      </p>

      {editor.activeModal?.type === "code" && (
        <CodeModal
          initialLanguage={editor.activeModal.initialLanguage}
          initialSource={editor.activeModal.initialSource}
          onCancel={editor.cancelModal}
          onSubmit={editor.submitCodeModal}
        />
      )}
      {editor.activeModal?.type === "formula" && (
        <FormulaModal
          display={editor.activeModal.display}
          initialExpression={editor.activeModal.initialExpression}
          onCancel={editor.cancelModal}
          onSubmit={editor.submitFormulaModal}
        />
      )}
      {editor.activeModal?.type === "link" && (
        <LinkModal
          initialHref={editor.activeModal.initialHref}
          initialText={editor.activeModal.initialText}
          onCancel={editor.cancelModal}
          onSubmit={editor.submitLinkModal}
        />
      )}
      {editor.activeModal?.type === "table" && (
        <TableModal onCancel={editor.cancelModal} onSubmit={editor.submitTableModal} />
      )}
    </div>
  );
}
