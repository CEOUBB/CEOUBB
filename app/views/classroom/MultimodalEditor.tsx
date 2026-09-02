"use client";

import {
  ArrowUUpLeft,
  ArrowUUpRight,
  CaretDown,
  CaretUp,
  Code,
  CodeBlock,
  Eraser,
  Eye,
  EyeSlash,
  Function as FunctionIcon,
  Highlighter,
  Info,
  LinkSimple,
  ListBullets,
  ListChecks,
  ListNumbers,
  MagnifyingGlass,
  Minus,
  Note,
  Quotes,
  Table,
  TextAlignCenter,
  TextAlignJustify,
  TextAlignLeft,
  TextAlignRight,
  TextB,
  TextHOne,
  TextHThree,
  TextHTwo,
  TextIndent,
  TextItalic,
  TextOutdent,
  TextStrikethrough,
  TextSubscript,
  TextSuperscript,
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
  useMemo,
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
  | "strikeThrough"
  | "highlight"
  | "superscript"
  | "subscript"
  | "inlineCode"
  | "removeFormat"
  | "justifyLeft"
  | "justifyCenter"
  | "justifyRight"
  | "justifyFull"
  | "indent"
  | "outdent"
  | "heading1"
  | "heading2"
  | "heading3"
  | "insertUnorderedList"
  | "insertOrderedList"
  | "checklist"
  | "quote"
  | "divider"
  | "table"
  | "formula"
  | "code"
  | "callout"
  | "warning"
  | "footnote"
  | "link"
  | "undo"
  | "redo"
  | "findReplace";

const modeLabels: Record<EditorMode, { label: string; detail: string }> = {
  visual: { label: "Visual", detail: "Edición tipo documento" },
  markdown: { label: "Markdown", detail: "Sintaxis técnica" },
  html: { label: "Marcado HTML", detail: "Etiquetas HTML reconocidas" },
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
    action: "strikeThrough",
    label: "Tachado",
    icon: TextStrikethrough,
    pressed: true,
    group: "emphasis",
  },
  {
    action: "highlight",
    label: "Resaltado",
    icon: Highlighter,
    pressed: true,
    group: "emphasis",
  },
  {
    action: "superscript",
    label: "Superíndice",
    icon: TextSuperscript,
    pressed: true,
    group: "emphasis",
  },
  {
    action: "subscript",
    label: "Subíndice",
    icon: TextSubscript,
    pressed: true,
    group: "emphasis",
  },
  {
    action: "inlineCode",
    label: "Código en línea",
    icon: Code,
    pressed: true,
    group: "emphasis",
  },
  {
    action: "removeFormat",
    label: "Limpiar formato",
    icon: Eraser,
    pressed: false,
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
  {
    action: "checklist",
    label: "Lista de verificación",
    icon: ListChecks,
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
  { action: "footnote", label: "Nota al pie", icon: Note, pressed: false, group: "insert" },
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
  {
    action: "justifyFull",
    label: "Justificar",
    icon: TextAlignJustify,
    pressed: true,
    group: "align",
  },
  {
    action: "outdent",
    label: "Reducir sangría",
    icon: TextOutdent,
    pressed: false,
    group: "align",
  },
  {
    action: "indent",
    label: "Aumentar sangría",
    icon: TextIndent,
    pressed: false,
    group: "align",
  },
  {
    action: "undo",
    label: "Deshacer",
    icon: ArrowUUpLeft,
    pressed: false,
    group: "history",
  },
  {
    action: "redo",
    label: "Rehacer",
    icon: ArrowUUpRight,
    pressed: false,
    group: "history",
  },
  {
    action: "findReplace",
    label: "Buscar y reemplazar",
    icon: MagnifyingGlass,
    pressed: false,
    group: "history",
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
  "del",
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
  "input",
  "li",
  "mark",
  "ol",
  "p",
  "pre",
  "s",
  "span",
  "strike",
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

  if (tag === "input") {
    if (element.getAttribute("type") === "checkbox") {
      const checkbox = owner.createElement("input");
      checkbox.setAttribute("type", "checkbox");
      checkbox.setAttribute("disabled", "true");
      if (element.hasAttribute("checked") || (element as HTMLInputElement).checked) {
        checkbox.setAttribute("checked", "true");
      }
      return checkbox;
    }
    return null;
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
    if (["left", "center", "right", "justify"].includes(alignment))
      (safeElement as HTMLElement).style.textAlign = alignment;
  }
  if (tag === "ul" && element.hasAttribute("data-checklist")) {
    safeElement.setAttribute("data-checklist", "true");
  }
  if (tag === "li" && element.hasAttribute("data-checked")) {
    safeElement.setAttribute(
      "data-checked",
      element.getAttribute("data-checked") === "true" ? "true" : "false"
    );
  }
  if ((tag === "sup" || tag === "div") && element.hasAttribute("data-footnote")) {
    safeElement.setAttribute("data-footnote", element.getAttribute("data-footnote") ?? "");
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

function getLineTextBeforeCaret(editor: HTMLElement, range: Range): string {
  let text = "";
  const container = range.startContainer;
  const offset = range.startOffset;

  if (container.nodeType === Node.TEXT_NODE) {
    text = container.textContent?.slice(0, offset) ?? "";
  }

  let curr: Node | null = container;
  while (curr) {
    let prev: Node | null = curr.previousSibling;
    while (prev) {
      if (prev.nodeName === "BR") return text;
      text = (prev.textContent ?? "") + text;
      prev = prev.previousSibling;
    }
    curr = curr.parentNode;
    if (
      !curr ||
      curr === editor ||
      /^(P|DIV|LI|H[1-6]|BLOCKQUOTE|ASIDE|SECTION)$/i.test(curr.nodeName)
    ) {
      break;
    }
  }
  return text;
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

function focusByArrow(event: KeyboardEvent<HTMLElement>, selector: string) {
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
  // La tabulación debe seguir al foco: sin mover el tabIndex, Tab siempre
  // devolvería al primer control del grupo en vez de al que el docente usa.
  items.forEach((item, index) => {
    item.tabIndex = index === nextIndex ? 0 : -1;
  });
  items[nextIndex].focus();
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
    /* Activación manual a propósito: recorrer las pestañas con las flechas sólo
       mueve el foco. Cambiar de modo reescribe el documento y queda guardado
       como preferencia, así que exige una elección explícita con Enter o clic. */
    <div
      aria-label="Modo de edición"
      className="editor-tabs"
      onKeyDown={(event) => focusByArrow(event, '[role="tab"]')}
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
  const [pressingTool, setPressingTool] = useState<string | null>(null);

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
        const isSelected = tool.pressed ? activeTools.has(tool.action) : false;
        return (
          <Fragment key={tool.action}>
            {startsGroup && <span aria-hidden="true" className="editor-toolbar-rule" />}
            <button
              aria-label={tool.label}
              aria-pressed={tool.pressed ? isSelected : undefined}
              className={pressingTool === tool.action ? "is-pressing" : undefined}
              data-editor-tool={tool.action}
              onClick={() => onApply(tool.action)}
              onMouseDown={(event) => event.preventDefault()}
              onPointerDown={() => setPressingTool(tool.action)}
              onPointerLeave={() => setPressingTool(null)}
              onPointerUp={() => setPressingTool(null)}
              tabIndex={index === 0 ? 0 : -1}
              title={tool.label}
              type="button"
            >
              <ToolIcon aria-hidden="true" size={17} weight="bold" />
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}

function FindReplaceBar({
  findTerm,
  matchCount,
  onClose,
  onFindNext,
  onFindPrev,
  onFindTermChange,
  onReplace,
  onReplaceAll,
  onReplaceTermChange,
  replaceTerm,
}: {
  findTerm: string;
  matchCount: number;
  onClose: () => void;
  onFindNext: () => void;
  onFindPrev: () => void;
  onFindTermChange: (term: string) => void;
  onReplace: () => void;
  onReplaceAll: () => void;
  onReplaceTermChange: (term: string) => void;
  replaceTerm: string;
}) {
  const findInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    findInputRef.current?.focus();
    findInputRef.current?.select();
  }, []);

  return (
    <div aria-label="Buscar y reemplazar texto" className="editor-find-replace-bar" role="search">
      <div className="editor-find-row">
        <div className="editor-find-input-wrap">
          <MagnifyingGlass aria-hidden="true" className="editor-find-icon" size={16} />
          <input
            aria-label="Texto a buscar"
            className="editor-find-input"
            onChange={(e) => onFindTermChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (e.shiftKey) onFindPrev();
                else onFindNext();
              } else if (e.key === "Escape") {
                e.preventDefault();
                onClose();
              }
            }}
            placeholder="Buscar..."
            ref={findInputRef}
            type="search"
            value={findTerm}
          />
          {findTerm ? (
            <span aria-live="polite" className="editor-find-badge num">
              {matchCount === 1 ? "1 coincidencia" : `${matchCount} coincidencias`}
            </span>
          ) : null}
        </div>
        <div className="editor-find-actions">
          <button
            aria-label="Buscar anterior (Shift+Enter)"
            className="editor-find-btn"
            disabled={!findTerm || matchCount === 0}
            onClick={onFindPrev}
            title="Anterior (Shift+Enter)"
            type="button"
          >
            <CaretUp aria-hidden="true" size={16} weight="bold" />
          </button>
          <button
            aria-label="Buscar siguiente (Enter)"
            className="editor-find-btn"
            disabled={!findTerm || matchCount === 0}
            onClick={onFindNext}
            title="Siguiente (Enter)"
            type="button"
          >
            <CaretDown aria-hidden="true" size={16} weight="bold" />
          </button>
          <button
            aria-label="Cerrar buscar y reemplazar (Escape)"
            className="editor-find-close"
            onClick={onClose}
            title="Cerrar (Esc)"
            type="button"
          >
            <X aria-hidden="true" size={16} />
          </button>
        </div>
      </div>
      <div className="editor-replace-row">
        <input
          aria-label="Texto de reemplazo"
          className="editor-replace-input"
          onChange={(e) => onReplaceTermChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onReplace();
            } else if (e.key === "Escape") {
              e.preventDefault();
              onClose();
            }
          }}
          placeholder="Reemplazar con..."
          type="text"
          value={replaceTerm}
        />
        <div className="editor-replace-actions">
          <button
            aria-label="Reemplazar coincidencia actual"
            className="editor-replace-btn"
            disabled={!findTerm || matchCount === 0}
            onClick={onReplace}
            type="button"
          >
            Reemplazar
          </button>
          <button
            aria-label="Reemplazar todas las coincidencias"
            className="editor-replace-btn"
            disabled={!findTerm || matchCount === 0}
            onClick={onReplaceAll}
            type="button"
          >
            Todo
          </button>
        </div>
      </div>
    </div>
  );
}

function EditorComposePane({
  activeTools,
  draft,
  findMatchCount,
  findReplaceOpen,
  findTerm,
  handleCodeKeyDown,
  handleMarkdownKeyDown,
  handlePaste,
  handleVisualKeyDown,
  htmlDraft,
  htmlRef,
  label,
  labelId,
  markdownRef,
  maxLength,
  mode,
  onApplyTool,
  onCloseFindReplace,
  onFindNext,
  onFindPrev,
  onFindTermChange,
  onHtmlChange,
  onMarkdownChange,
  onReplace,
  onReplaceAll,
  onReplaceTermChange,
  onRunSlashCommand,
  replaceTerm,
  required,
  slash,
  syncVisual,
  visualRef,
}: {
  activeTools: Set<string>;
  draft: string;
  findMatchCount: number;
  findReplaceOpen: boolean;
  findTerm: string;
  handleCodeKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  handleMarkdownKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  handlePaste: (event: ClipboardEvent<HTMLDivElement>) => void;
  handleVisualKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  htmlDraft: string;
  htmlRef: RefObject<HTMLTextAreaElement | null>;
  label: string;
  labelId: string;
  markdownRef: RefObject<HTMLTextAreaElement | null>;
  maxLength: number;
  mode: EditorMode;
  onApplyTool: (action: ToolAction) => void;
  onCloseFindReplace: () => void;
  onFindNext: () => void;
  onFindPrev: () => void;
  onFindTermChange: (term: string) => void;
  onHtmlChange: (value: string) => void;
  onMarkdownChange: (value: string) => void;
  onReplace: () => void;
  onReplaceAll: () => void;
  onReplaceTermChange: (term: string) => void;
  onRunSlashCommand: (command: SlashCommand) => void;
  replaceTerm: string;
  required: boolean;
  slash: SlashMenuState | null;
  syncVisual: () => void;
  visualRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="editor-compose-pane">
      {findReplaceOpen && (
        <FindReplaceBar
          findTerm={findTerm}
          matchCount={findMatchCount}
          onClose={onCloseFindReplace}
          onFindNext={onFindNext}
          onFindPrev={onFindPrev}
          onFindTermChange={onFindTermChange}
          onReplace={onReplace}
          onReplaceAll={onReplaceAll}
          onReplaceTermChange={onReplaceTermChange}
          replaceTerm={replaceTerm}
        />
      )}
      {mode === "visual" ? (
        <>
          <EditorToolbar activeTools={activeTools} onApply={onApplyTool} />
          <div className="editor-visual-frame">
            <div
              aria-activedescendant={slash ? `${labelId}-slash-${slash.highlight}` : undefined}
              aria-controls={slash ? `${labelId}-slash` : undefined}
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
            {slash && (
              <SlashMenu menuId={`${labelId}-slash`} onRun={onRunSlashCommand} state={slash} />
            )}
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
            aria-label={`${label}: marcado HTML`}
            className="editor-source editor-source-html"
            maxLength={maxLength}
            onChange={(event) => onHtmlChange(event.target.value)}
            onKeyDown={handleCodeKeyDown}
            placeholder={
              "<section>\n  <h2>Contenido académico</h2>\n  <p>Escribe tu HTML…</p>\n</section>"
            }
            ref={htmlRef}
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
  menuId,
  onRun,
  state,
}: {
  menuId: string;
  onRun: (command: SlashCommand) => void;
  state: SlashMenuState;
}) {
  return (
    <div
      aria-label="Insertar bloque"
      className="editor-slash-menu"
      id={menuId}
      role="listbox"
      style={{ top: `${state.top}px`, left: `${state.left}px` }}
    >
      {/* Rótulo decorativo: un listbox solo admite opciones como hijos. */}
      <p aria-hidden="true">Insertar</p>
      {state.commands.map((command, index) => (
        <button
          aria-selected={index === state.highlight}
          className={index === state.highlight ? "is-highlighted" : ""}
          id={`${menuId}-${index}`}
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
  const selectRef = useRef<HTMLSelectElement>(null);

  const handleSubmit = () => {
    onSubmit(language, code);
  };

  useEffect(() => {
    selectRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div className="editor-modal-backdrop">
      <button
        aria-label="Cerrar modal"
        className="editor-modal-overlay"
        onClick={onCancel}
        tabIndex={-1}
        type="button"
      />
      <dialog
        aria-labelledby="code-modal-title"
        aria-modal="true"
        className="editor-modal-card"
        open
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
              onChange={(event) => setLanguage(event.target.value as CodeLanguage)}
              ref={selectRef}
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
      </dialog>
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    onSubmit(expression, display);
  };

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div className="editor-modal-backdrop">
      <button
        aria-label="Cerrar modal"
        className="editor-modal-overlay"
        onClick={onCancel}
        tabIndex={-1}
        type="button"
      />
      <dialog
        aria-labelledby="formula-modal-title"
        aria-modal="true"
        className="editor-modal-card"
        open
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
              onChange={(event) => setExpression(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Ej: \sum_{i=1}^n x_i = 0  o  f(x) = \frac{a}{b}"
              ref={textareaRef}
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
      </dialog>
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
  const textRef = useRef<HTMLInputElement>(null);
  const hrefRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    onSubmit(text, href);
  };

  useEffect(() => {
    if (initialText) {
      hrefRef.current?.focus();
    } else {
      textRef.current?.focus();
    }
  }, [initialText]);

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div className="editor-modal-backdrop">
      <button
        aria-label="Cerrar modal"
        className="editor-modal-overlay"
        onClick={onCancel}
        tabIndex={-1}
        type="button"
      />
      <dialog
        aria-labelledby="link-modal-title"
        aria-modal="true"
        className="editor-modal-card"
        open
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
              ref={textRef}
              type="text"
              value={text}
            />
          </label>
          <label className="editor-modal-field">
            <span>Dirección URL</span>
            <input
              onChange={(event) => setHref(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="https://..."
              ref={hrefRef}
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
      </dialog>
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
  const rowsRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    onSubmit(rows, cols);
  };

  useEffect(() => {
    rowsRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div className="editor-modal-backdrop">
      <button
        aria-label="Cerrar modal"
        className="editor-modal-overlay"
        onClick={onCancel}
        tabIndex={-1}
        type="button"
      />
      <dialog
        aria-labelledby="table-modal-title"
        aria-modal="true"
        className="editor-modal-card"
        open
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
                max={20}
                min={2}
                onChange={(event) => {
                  const val = Number.parseInt(event.target.value, 10);
                  if (!Number.isNaN(val)) {
                    setRows(Math.max(2, Math.min(20, val)));
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleSubmit();
                  }
                }}
                ref={rowsRef}
                type="number"
                value={rows}
              />
            </label>
            <label className="editor-modal-field">
              <span>Columnas</span>
              <input
                max={10}
                min={1}
                onChange={(event) => {
                  const val = Number.parseInt(event.target.value, 10);
                  if (!Number.isNaN(val)) {
                    setCols(Math.max(1, Math.min(10, val)));
                  }
                }}
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
      </dialog>
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
  const htmlRef = useRef<HTMLTextAreaElement>(null);
  const lastEmittedRef = useRef(value);
  const [mode, setMode] = useState<EditorMode>(initialMode);
  const [htmlDraft, setHtmlDraft] = useState(() => markdownToEditorHtml(value));
  const pendingVisualHtmlRef = useRef(htmlDraft);
  const visualOriginHtmlRef = useRef(htmlDraft);
  const visualDirtyRef = useRef(false);
  const savedSelectionRef = useRef<Range | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [findReplaceOpen, setFindReplaceOpen] = useState(false);
  const [findTerm, setFindTerm] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");
  /*
    Un aviso que sólo vive en la región `aria-live` deja al docente vidente sin
    respuesta: pulsa Publicar, no pasa nada y vuelve a pulsar. Este estado pinta
    el mismo mensaje donde se ve.
  */
  // Implements: REQ-EDITOR-10
  const [notice, setNotice] = useState<{ text: string; tone: "bad" | "info" } | null>(null);
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

  const emit = useCallback(
    (next: string) => {
      lastEmittedRef.current = next;
      setNotice(null);
      onChange(next);
    },
    [onChange]
  );

  const currentContentText = mode === "html" ? htmlDraft : value;
  const findMatchCount = useMemo(() => {
    if (!findTerm.trim()) return 0;
    try {
      const escaped = findTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const matches = currentContentText.match(new RegExp(escaped, "gi"));
      return matches ? matches.length : 0;
    } catch {
      return 0;
    }
  }, [currentContentText, findTerm]);

  const handleFindNext = useCallback(() => {
    if (!findTerm) return;
    if (mode === "visual") {
      if (typeof window !== "undefined" && typeof (window as unknown as { find?: (t: string, ...args: unknown[]) => boolean }).find === "function") {
        (window as unknown as { find: (t: string, ...args: unknown[]) => boolean }).find(findTerm, false, false, true, false, true, false);
      }
    } else {
      const textarea = mode === "markdown" ? markdownRef.current : htmlRef.current;
      if (!textarea) return;
      const text = textarea.value;
      const fromIndex = textarea.selectionEnd;
      let index = text.toLowerCase().indexOf(findTerm.toLowerCase(), fromIndex);
      if (index === -1) {
        index = text.toLowerCase().indexOf(findTerm.toLowerCase(), 0);
      }
      if (index !== -1) {
        textarea.focus();
        textarea.setSelectionRange(index, index + findTerm.length);
      }
    }
  }, [findTerm, mode]);

  const handleFindPrev = useCallback(() => {
    if (!findTerm) return;
    if (mode === "visual") {
      if (typeof window !== "undefined" && typeof (window as unknown as { find?: (t: string, ...args: unknown[]) => boolean }).find === "function") {
        (window as unknown as { find: (t: string, ...args: unknown[]) => boolean }).find(findTerm, false, true, true, false, true, false);
      }
    } else {
      const textarea = mode === "markdown" ? markdownRef.current : htmlRef.current;
      if (!textarea) return;
      const text = textarea.value;
      const fromIndex = textarea.selectionStart - 1;
      let index =
        fromIndex >= 0 ? text.toLowerCase().lastIndexOf(findTerm.toLowerCase(), fromIndex) : -1;
      if (index === -1) {
        index = text.toLowerCase().lastIndexOf(findTerm.toLowerCase());
      }
      if (index !== -1) {
        textarea.focus();
        textarea.setSelectionRange(index, index + findTerm.length);
      }
    }
  }, [findTerm, mode]);

  const handleHtmlChange = useCallback(
    (nextHtml: string) => {
      setHtmlDraft(nextHtml);
      emit(htmlToAcademicMarkdown(nextHtml));
    },
    [emit]
  );

  const handleReplace = useCallback(() => {
    if (!findTerm) return;
    if (mode === "visual") {
      const selection = window.getSelection();
      if (selection && selection.toString().toLowerCase() === findTerm.toLowerCase()) {
        document.execCommand("insertText", false, replaceTerm);
        const editor = visualRef.current;
        if (editor) {
          const next = htmlToAcademicMarkdown(editor.innerHTML);
          emit(next);
        }
        handleFindNext();
      } else {
        handleFindNext();
      }
    } else if (mode === "markdown") {
      const textarea = markdownRef.current;
      if (!textarea) return;
      const { selectionStart: start, selectionEnd: end } = textarea;
      const selected = value.slice(start, end);
      if (selected.toLowerCase() === findTerm.toLowerCase()) {
        const next = `${value.slice(0, start)}${replaceTerm}${value.slice(end)}`;
        emit(next);
        requestAnimationFrame(() => {
          textarea.focus();
          textarea.setSelectionRange(start + replaceTerm.length, start + replaceTerm.length);
          handleFindNext();
        });
      } else {
        handleFindNext();
      }
    } else {
      const text = htmlDraft;
      const index = text.toLowerCase().indexOf(findTerm.toLowerCase());
      if (index !== -1) {
        const next = `${text.slice(0, index)}${replaceTerm}${text.slice(index + findTerm.length)}`;
        handleHtmlChange(next);
      }
    }
  }, [emit, findTerm, handleFindNext, handleHtmlChange, htmlDraft, mode, replaceTerm, value]);

  const handleReplaceAll = useCallback(() => {
    if (!findTerm) return;
    const escaped = findTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "gi");
    if (mode === "visual") {
      const editor = visualRef.current;
      if (!editor) return;
      const nextMarkdown = value.replace(regex, replaceTerm);
      editor.replaceChildren(safeVisualFragment(markdownToEditorHtml(nextMarkdown), editor.ownerDocument));
      visualOriginHtmlRef.current = markdownToEditorHtml(nextMarkdown);
      visualDirtyRef.current = false;
      emit(nextMarkdown);
    } else if (mode === "markdown") {
      const next = value.replace(regex, replaceTerm);
      emit(next);
    } else {
      const next = htmlDraft.replace(regex, replaceTerm);
      handleHtmlChange(next);
    }
  }, [emit, findTerm, handleHtmlChange, htmlDraft, mode, replaceTerm, value]);

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

  const checkActiveTools = useCallback(() => {
    const editor = visualRef.current;
    if (!editor || !selectionInside(editor)) return new Set<string>();
    const active = new Set<string>();
    const commands = [
      "bold",
      "italic",
      "underline",
      "strikeThrough",
      "superscript",
      "subscript",
      "justifyLeft",
      "justifyCenter",
      "justifyRight",
      "justifyFull",
      "insertUnorderedList",
      "insertOrderedList",
    ];
    for (const command of commands) {
      try {
        if (document.queryCommandState(command)) active.add(command);
      } catch {
        // Ignorar si el comando no es soportado por el navegador en la selección actual
      }
    }
    try {
      const block = String(document.queryCommandValue("formatBlock") ?? "").toLowerCase();
      if (block === "h1") active.add("heading1");
      else if (block === "h2") active.add("heading2");
      else if (block === "h3") active.add("heading3");
      else if (block === "blockquote") active.add("quote");
    } catch {
      // Ignorar si formatBlock no está soportado o no es consultable en este contexto
    }

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      let node: globalThis.Node | null = selection.getRangeAt(0).startContainer;
      while (node && node !== editor) {
        if (node instanceof HTMLElement) {
          const tag = node.tagName;
          if (tag === "BLOCKQUOTE") active.add("quote");
          if (tag === "DEL" || tag === "S" || tag === "STRIKE") active.add("strikeThrough");
          if (tag === "MARK") active.add("highlight");
          if (tag === "SUP" && !node.hasAttribute("data-footnote")) active.add("superscript");
          if (tag === "SUB") active.add("subscript");
          if (tag === "CODE" && node.parentElement?.tagName !== "PRE") active.add("inlineCode");
          if (
            tag === "UL" &&
            (node.hasAttribute("data-checklist") || node.classList.contains("rich-checklist"))
          ) {
            active.add("checklist");
          }
          if (
            node.style.textAlign === "justify" ||
            node.getAttribute("align")?.toLowerCase() === "justify"
          ) {
            active.add("justifyFull");
          }
          if (tag === "ASIDE") {
            const callout = node.getAttribute("data-callout");
            if (callout === "assessment") active.add("warning");
            else active.add("callout");
          }
        }
        node = node.parentNode;
      }
    }

    return active;
  }, []);

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
    const textBefore = getLineTextBeforeCaret(editor, range);
    const query = slashQueryBefore(textBefore);
    if (query === null) return setSlash(null);
    const commands = matchSlashCommands(query);
    if (commands.length === 0) return setSlash(null);
    let caret = range.getBoundingClientRect();
    if (
      !caret ||
      (caret.width === 0 && caret.height === 0 && caret.top === 0 && caret.bottom === 0)
    ) {
      const rects = range.getClientRects();
      if (rects.length > 0) {
        caret = rects[0];
      } else {
        const el =
          range.startContainer instanceof HTMLElement
            ? range.startContainer
            : range.startContainer.parentElement;
        if (el) caret = el.getBoundingClientRect();
      }
    }
    const anchor = editor.getBoundingClientRect();
    setSlash({
      commands,
      highlight: 0,
      top: (caret.bottom || anchor.top) - anchor.top + 6,
      left: Math.max(0, (caret.left || anchor.left) - anchor.left),
    });
  }, []);

  useEffect(() => {
    if (mode !== "visual") return;
    const refresh = () => {
      const editor = visualRef.current;
      if (!editor) return setActiveTools(new Set());
      const range = selectionInside(editor);
      if (range) savedSelectionRef.current = range.cloneRange();
      setActiveTools(checkActiveTools());
      refreshSlashMenu();
    };
    document.addEventListener("selectionchange", refresh);
    return () => document.removeEventListener("selectionchange", refresh);
  }, [checkActiveTools, mode, refreshSlashMenu]);

  const syncVisual = () => {
    const editor = visualRef.current;
    if (!editor) return;
    const next = htmlToAcademicMarkdown(editor.innerHTML);
    if (next.length > maxLength) {
      renderVisual(markdownToEditorHtml(value));
      const reached = `Se alcanzó el máximo de ${maxLength.toLocaleString("es-CL")} caracteres.`;
      setAnnouncement(reached);
      setNotice({ text: reached, tone: "bad" });
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
    /*
      El documento se guarda en un solo formato. Salir de HTML no conserva el
      marcado tal cual se escribió, así que se dice antes de que el docente lo
      descubra por su cuenta al volver.
    */
    // Implements: REQ-EDITOR-10
    if (mode === "html" && htmlDraft.trim()) {
      setNotice({
        text: "Tu HTML se guarda en el formato del portal. El marcado que el portal no reconoce no se conserva.",
        tone: "info",
      });
    } else {
      setNotice(null);
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
    if (action === "findReplace") {
      setFindReplaceOpen((prev) => !prev);
      return;
    }

    const editor = visualRef.current;
    if (!editor) return;
    editor.focus();

    const selection = window.getSelection();
    if (
      savedSelectionRef.current &&
      (!selection || selection.rangeCount === 0 || !editor.contains(selection.anchorNode))
    ) {
      selection?.removeAllRanges();
      selection?.addRange(savedSelectionRef.current);
    }

    const blockTag = blockTagForAction[action];
    if (blockTag) {
      document.execCommand("formatBlock", false, blockTag);
    } else if (action === "callout") {
      insertCallout("notice");
    } else if (action === "warning") {
      insertCallout("assessment");
    } else if (action === "divider") {
      insertDivider();
    } else if (action === "checklist") {
      const range = selectionInside(editor);
      const ul = document.createElement("ul");
      ul.setAttribute("data-checklist", "true");
      ul.className = "rich-checklist";
      const li = document.createElement("li");
      li.setAttribute("data-checked", "false");
      li.className = "rich-checklist-item";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.disabled = true;
      input.className = "rich-checkbox";
      li.appendChild(input);
      const selectedText = range && !range.collapsed ? range.toString().trim() : "Nueva tarea";
      li.appendChild(document.createTextNode(` ${selectedText}`));
      ul.appendChild(li);
      insertVisualNode(editor, ul);
    } else if (action === "footnote") {
      const currentHtml = editor.innerHTML;
      const matches = currentHtml.match(/data-footnote=["'](\d+)["']/g);
      const nextNum = (matches ? matches.length : 0) + 1;
      const sup = document.createElement("sup");
      sup.className = "editor-footnote-ref";
      sup.setAttribute("data-footnote", String(nextNum));
      sup.textContent = `[${nextNum}]`;
      insertVisualNode(editor, sup);

      const def = document.createElement("div");
      def.className = "editor-footnote-def";
      def.setAttribute("data-footnote", String(nextNum));
      const spanId = document.createElement("span");
      spanId.className = "footnote-id";
      spanId.textContent = `[${nextNum}] `;
      def.appendChild(spanId);
      def.appendChild(document.createTextNode(`Nota al pie ${nextNum}`));
      editor.appendChild(def);
    } else if (action === "highlight") {
      const range = selectionInside(editor);
      if (range) {
        let markNode: HTMLElement | null = null;
        let cur: Node | null = range.commonAncestorContainer;
        while (cur && cur !== editor) {
          if (cur instanceof HTMLElement && cur.tagName === "MARK") {
            markNode = cur;
            break;
          }
          cur = cur.parentNode;
        }
        if (markNode) {
          const parent = markNode.parentNode;
          while (markNode.firstChild) parent?.insertBefore(markNode.firstChild, markNode);
          parent?.removeChild(markNode);
        } else if (!range.collapsed) {
          const mark = document.createElement("mark");
          mark.appendChild(range.extractContents());
          range.insertNode(mark);
          placeCaretAfter(mark);
        }
      }
    } else if (action === "inlineCode") {
      const range = selectionInside(editor);
      if (range) {
        let codeNode: HTMLElement | null = null;
        let cur: Node | null = range.commonAncestorContainer;
        while (cur && cur !== editor) {
          if (
            cur instanceof HTMLElement &&
            cur.tagName === "CODE" &&
            cur.parentElement?.tagName !== "PRE"
          ) {
            codeNode = cur;
            break;
          }
          cur = cur.parentNode;
        }
        if (codeNode) {
          const parent = codeNode.parentNode;
          while (codeNode.firstChild) parent?.insertBefore(codeNode.firstChild, codeNode);
          parent?.removeChild(codeNode);
        } else if (!range.collapsed) {
          const code = document.createElement("code");
          code.appendChild(range.extractContents());
          range.insertNode(code);
          placeCaretAfter(code);
        }
      }
    } else if (action === "removeFormat") {
      document.execCommand("removeFormat", false);
      const range = selectionInside(editor);
      if (range && !range.collapsed) {
        const fragment = range.extractContents();
        const inlineTags = ["U", "DEL", "S", "STRIKE", "MARK", "SUP", "SUB", "CODE"];
        for (const tag of inlineTags) {
          fragment.querySelectorAll(tag).forEach((el) => {
            const parent = el.parentNode;
            while (el.firstChild) parent?.insertBefore(el.firstChild, el);
            parent?.removeChild(el);
          });
        }
        range.insertNode(fragment);
      }
    } else if (action === "strikeThrough") {
      document.execCommand("strikeThrough", false);
    } else if (action === "superscript") {
      document.execCommand("superscript", false);
    } else if (action === "subscript") {
      document.execCommand("subscript", false);
    } else if (action === "justifyFull") {
      document.execCommand("justifyFull", false);
    } else if (action === "indent" || action === "outdent") {
      const isOutdent = action === "outdent";
      const selection = window.getSelection();
      let handled = false;
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let node: Node | null = range.startContainer;
        let isInsideList = false;
        while (node && node !== editor) {
          if (node instanceof HTMLElement && node.tagName.toLowerCase() === "li") {
            isInsideList = true;
            break;
          }
          node = node.parentNode;
        }
        if (isInsideList) {
          document.execCommand(isOutdent ? "outdent" : "indent", false);
          handled = true;
        } else {
          let block: HTMLElement | null = null;
          node = range.startContainer;
          while (node && node !== editor) {
            if (
              node instanceof HTMLElement &&
              /^(p|div|h[1-6]|blockquote)$/i.test(node.tagName)
            ) {
              block = node;
              break;
            }
            node = node.parentNode;
          }
          if (!block || block === editor) {
            document.execCommand("formatBlock", false, "p");
            const freshSel = window.getSelection();
            if (freshSel && freshSel.rangeCount > 0) {
              let n: Node | null = freshSel.getRangeAt(0).startContainer;
              while (n && n !== editor) {
                if (n instanceof HTMLElement && /^(p|div|h[1-6])$/i.test(n.tagName)) {
                  block = n;
                  break;
                }
                n = n.parentNode;
              }
            }
          }
          if (block && block !== editor) {
            const currentMargin = parseInt(block.style.marginLeft || "0", 10) || 0;
            const step = 32;
            const nextMargin = isOutdent
              ? Math.max(0, currentMargin - step)
              : Math.min(160, currentMargin + step);
            if (block.tagName.toLowerCase() === "blockquote") {
              const p = document.createElement("p");
              if (nextMargin > 0) p.style.marginLeft = `${nextMargin}px`;
              while (block.firstChild) p.appendChild(block.firstChild);
              block.parentNode?.replaceChild(p, block);
            } else {
              if (nextMargin > 0) {
                block.style.marginLeft = `${nextMargin}px`;
              } else {
                block.style.marginLeft = "";
              }
            }
            handled = true;
          }
        }
      }
      if (!handled) {
        document.execCommand(isOutdent ? "outdent" : "indent", false);
      }
    } else if (action === "undo") {
      document.execCommand("undo", false);
    } else if (action === "redo") {
      document.execCommand("redo", false);
    } else {
      document.execCommand(action, false);
    }
    syncVisual();
    setActiveTools(checkActiveTools());
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
    } else if (event.key.toLowerCase() === "u") {
      event.preventDefault();
      applyTool("underline");
    } else if (event.key.toLowerCase() === "k") {
      event.preventDefault();
      openLinkModal();
    } else if (event.shiftKey && event.key.toLowerCase() === "x") {
      event.preventDefault();
      applyTool("strikeThrough");
    } else if (event.shiftKey && event.key.toLowerCase() === "h") {
      event.preventDefault();
      applyTool("highlight");
    } else if (event.key.toLowerCase() === "f" || event.key.toLowerCase() === "h") {
      event.preventDefault();
      setFindReplaceOpen(true);
    } else if (event.key.toLowerCase() === "e" || event.key === "`") {
      event.preventDefault();
      applyTool("inlineCode");
    } else if (event.key === ".") {
      event.preventDefault();
      applyTool("superscript");
    } else if (event.key === ",") {
      event.preventDefault();
      applyTool("subscript");
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
    } else if (event.key.toLowerCase() === "u") {
      event.preventDefault();
      wrapMarkdownSelection("<u>", "</u>", "texto subrayado");
    } else if (event.key.toLowerCase() === "k") {
      event.preventDefault();
      openLinkModal();
    } else if (event.shiftKey && event.key.toLowerCase() === "x") {
      event.preventDefault();
      wrapMarkdownSelection("~~", "~~", "texto tachado");
    } else if (event.shiftKey && event.key.toLowerCase() === "h") {
      event.preventDefault();
      wrapMarkdownSelection("<mark>", "</mark>", "texto resaltado");
    } else if (event.key.toLowerCase() === "f" || event.key.toLowerCase() === "h") {
      event.preventDefault();
      setFindReplaceOpen(true);
    } else if (event.key.toLowerCase() === "e" || event.key === "`") {
      event.preventDefault();
      wrapMarkdownSelection("`", "`", "código");
    } else if (event.key === ".") {
      event.preventDefault();
      wrapMarkdownSelection("<sup>", "</sup>", "superíndice");
    } else if (event.key === ",") {
      event.preventDefault();
      wrapMarkdownSelection("<sub>", "</sub>", "subíndice");
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
    if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === "f" || event.key.toLowerCase() === "h")) {
      event.preventDefault();
      setFindReplaceOpen(true);
      return;
    }
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
      const typed = slashQueryBefore(getLineTextBeforeCaret(editor, selection.getRangeAt(0)));
      if (typed !== null) {
        for (let step = 0; step < typed.length + 1; step += 1)
          document.execCommand("delete", false);
      }
    }
    applyTool(command.action as ToolAction);
  };

  const counter = `${value.length.toLocaleString("es-CL")} / ${maxLength.toLocaleString("es-CL")}`;

  // Implements: REQ-EDITOR-10
  const handleInvalid = (event: InvalidEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    const missing = `Escribe el contenido de la publicación antes de publicar.`;
    setAnnouncement(missing);
    setNotice({ text: missing, tone: "bad" });
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
    findMatchCount,
    findReplaceOpen,
    findTerm,
    handleHtmlChange,
    handleInvalid,
    handleCodeKeyDown,
    handleMarkdownKeyDown,
    handlePaste,
    handleVisualKeyDown,
    htmlDraft,
    htmlRef,
    label,
    labelId,
    markdownRef,
    maxLength,
    mode,
    name,
    notice,
    onCloseFindReplace: () => setFindReplaceOpen(false),
    onFindNext: handleFindNext,
    onFindPrev: handleFindPrev,
    onFindTermChange: setFindTerm,
    onReplace: handleReplace,
    onReplaceAll: handleReplaceAll,
    onReplaceTermChange: setReplaceTerm,
    panelId,
    previewValue,
    replaceTerm,
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

      {/* El panel no lleva `tabIndex`: ya contiene el lienzo o el área de
          código, así que una parada muda antes de la superficie de escritura
          sólo alarga el recorrido con teclado. */}
      <div
        aria-invalid={editor.notice?.tone === "bad" ? true : undefined}
        aria-labelledby={`${editor.baseId}-${editor.mode}-tab`}
        className="multimodal-editor-workspace"
        data-invalid={editor.notice?.tone === "bad" ? "true" : undefined}
        data-preview={editor.showPreview ? (editor.previewValue.trim() ? "on" : "empty") : "off"}
        id={editor.panelId}
        role="tabpanel"
      >
        <EditorComposePane
          activeTools={editor.activeTools}
          draft={editor.draft}
          findMatchCount={editor.findMatchCount}
          findReplaceOpen={editor.findReplaceOpen}
          findTerm={editor.findTerm}
          handleCodeKeyDown={editor.handleCodeKeyDown}
          handleMarkdownKeyDown={editor.handleMarkdownKeyDown}
          handlePaste={editor.handlePaste}
          handleVisualKeyDown={editor.handleVisualKeyDown}
          htmlDraft={editor.htmlDraft}
          htmlRef={editor.htmlRef}
          label={editor.label}
          labelId={editor.labelId}
          markdownRef={editor.markdownRef}
          maxLength={editor.maxLength}
          mode={editor.mode}
          onApplyTool={editor.applyTool}
          onCloseFindReplace={editor.onCloseFindReplace}
          onFindNext={editor.onFindNext}
          onFindPrev={editor.onFindPrev}
          onFindTermChange={editor.onFindTermChange}
          onHtmlChange={editor.handleHtmlChange}
          onMarkdownChange={editor.emit}
          onReplace={editor.onReplace}
          onReplaceAll={editor.onReplaceAll}
          onReplaceTermChange={editor.onReplaceTermChange}
          onRunSlashCommand={editor.runSlashCommand}
          replaceTerm={editor.replaceTerm}
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
      {editor.notice && (
        <p className={`tool-status ${editor.notice.tone}`} role="alert">
          {editor.notice.text}
        </p>
      )}
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
