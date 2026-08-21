"use client";

import {
  CodeBlock,
  Function as FunctionIcon,
  LinkSimple,
  Quotes,
  Table,
  TextAlignCenter,
  TextAlignLeft,
  TextAlignRight,
  TextB,
  TextItalic,
  TextUnderline,
} from "@phosphor-icons/react";
import {
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
  type EditorMode,
} from "../../../lib/multimodal-editor";
import { RICH_TEXT_MAX_LENGTH, safeLinkDestination } from "../../../lib/rich-text";
import { RichText } from "./RichText";

type MultimodalEditorProps = {
  initialMode?: EditorMode;
  label?: string;
  maxLength?: number;
  name: string;
  onChange: (value: string) => void;
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
  | "table"
  | "formula"
  | "code"
  | "callout"
  | "link";

const modeLabels: Record<EditorMode, { label: string; detail: string }> = {
  visual: { label: "Visual", detail: "Edición tipo documento" },
  markdown: { label: "Markdown + LaTeX", detail: "Sintaxis técnica" },
  html: { label: "HTML", detail: "Código libre" },
};

const visualTools = [
  { action: "bold", label: "Negrita", icon: TextB, pressed: true },
  { action: "italic", label: "Cursiva", icon: TextItalic, pressed: true },
  { action: "underline", label: "Subrayado", icon: TextUnderline, pressed: true },
  { action: "justifyLeft", label: "Alinear a la izquierda", icon: TextAlignLeft, pressed: true },
  { action: "justifyCenter", label: "Centrar", icon: TextAlignCenter, pressed: true },
  { action: "justifyRight", label: "Alinear a la derecha", icon: TextAlignRight, pressed: true },
  { action: "table", label: "Insertar tabla", icon: Table, pressed: false },
  { action: "formula", label: "Insertar fórmula LaTeX", icon: FunctionIcon, pressed: false },
  { action: "code", label: "Insertar bloque de código", icon: CodeBlock, pressed: false },
  { action: "callout", label: "Insertar callout", icon: Quotes, pressed: false },
  { action: "link", label: "Insertar enlace", icon: LinkSimple, pressed: false },
] as const;

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
          type="button"
        >
          <strong>{modeLabels[editorMode].label}</strong>
          <span>{modeLabels[editorMode].detail}</span>
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
        return (
          <button
            aria-label={tool.label}
            aria-pressed={tool.pressed ? activeTools.has(tool.action) : undefined}
            data-editor-tool={tool.action}
            key={tool.action}
            onClick={() => onApply(tool.action)}
            onMouseDown={(event) => event.preventDefault()}
            tabIndex={index === 0 ? 0 : -1}
            title={tool.label}
            type="button"
          >
            <ToolIcon aria-hidden="true" size={19} weight="bold" />
          </button>
        );
      })}
    </div>
  );
}

function EditorComposePane({
  activeTools,
  draft,
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
  required,
  syncVisual,
  visualRef,
}: {
  activeTools: Set<string>;
  draft: string;
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
  required: boolean;
  syncVisual: () => void;
  visualRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="editor-compose-pane">
      {mode === "visual" ? (
        <>
          <EditorToolbar activeTools={activeTools} onApply={onApplyTool} />
          <div
            aria-labelledby={labelId}
            aria-multiline="true"
            aria-required={required}
            className="editor-visual-canvas"
            contentEditable
            onInput={syncVisual}
            onKeyDown={handleVisualKeyDown}
            onPaste={handlePaste}
            ref={visualRef}
            role="textbox"
            spellCheck
            suppressContentEditableWarning
            tabIndex={0}
          />
        </>
      ) : mode === "markdown" ? (
        <textarea
          aria-label={`${label}: Markdown con LaTeX`}
          className="editor-source editor-source-markdown"
          maxLength={maxLength}
          onChange={(event) => onMarkdownChange(event.target.value)}
          onKeyDown={handleMarkdownKeyDown}
          placeholder={"Escribe Markdown. Usa $...$ para fórmulas y ```python para código."}
          ref={markdownRef}
          rows={13}
          spellCheck
          value={draft}
        />
      ) : (
        <textarea
          aria-label={`${label}: código HTML libre`}
          className="editor-source editor-source-html"
          maxLength={maxLength}
          onChange={(event) => onHtmlChange(event.target.value)}
          placeholder={
            "<section>\n  <h2>Contenido académico</h2>\n  <p>Escribe tu HTML…</p>\n</section>"
          }
          rows={13}
          spellCheck={false}
          value={htmlDraft}
        />
      )}
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

function useMultimodalEditorController({
  initialMode = "visual",
  label = "Mensaje",
  maxLength = RICH_TEXT_MAX_LENGTH,
  name,
  onChange,
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
  };

  const switchMode = (nextMode: EditorMode) => {
    if (nextMode === mode) return;
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
    setAnnouncement(`Modo ${modeLabels[nextMode].label} activo.`);
  };

  const insertTable = () => {
    const table = document.createElement("table");
    const body = table.createTBody();
    for (let rowIndex = 0; rowIndex < 2; rowIndex += 1) {
      const row = body.insertRow();
      for (let columnIndex = 0; columnIndex < 2; columnIndex += 1) {
        const cell = row.insertCell();
        cell.textContent = rowIndex === 0 ? `Encabezado ${columnIndex + 1}` : "Contenido";
      }
    }
    insertVisualNode(visualRef.current!, table);
  };

  const insertFormula = () => {
    const expression = window.prompt("Escribe la fórmula LaTeX", "\\sum F_x = 0")?.trim();
    if (!expression) return;
    const formula = document.createElement("span");
    formula.dataset.latex = "inline";
    formula.dataset.source = expression;
    formula.className = "editor-latex-token";
    formula.contentEditable = "false";
    formula.textContent = expression;
    insertVisualNode(visualRef.current!, formula);
  };

  const insertCode = () => {
    const editor = visualRef.current!;
    const range = selectionInside(editor);
    const source = range?.toString() || "Escribe tu código";
    const pre = document.createElement("pre");
    const code = document.createElement("code");
    code.dataset.language = "plain";
    code.textContent = source;
    pre.appendChild(code);
    insertVisualNode(editor, pre);
  };

  const insertCallout = () => {
    const editor = visualRef.current!;
    const range = selectionInside(editor);
    const aside = document.createElement("aside");
    aside.dataset.callout = "notice";
    const paragraph = document.createElement("p");
    paragraph.textContent = range?.toString() || "Escribe una nota importante";
    aside.appendChild(paragraph);
    insertVisualNode(editor, aside);
  };

  const insertLink = () => {
    const editor = visualRef.current!;
    const selectedRange = selectionInside(editor)?.cloneRange() ?? null;
    const destination = window.prompt("Dirección del enlace", "https://")?.trim();
    const href = destination ? safeLinkDestination(destination) : null;
    if (!href) {
      if (destination) setAnnouncement("El enlace debe usar http, https o mailto.");
      return;
    }
    const selection = window.getSelection();
    if (selectedRange && selection) {
      selection.removeAllRanges();
      selection.addRange(selectedRange);
    }
    const range = selectionInside(editor);
    if (range && !range.collapsed) {
      document.execCommand("createLink", false, href);
    } else {
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.rel = "noopener noreferrer";
      anchor.textContent = href;
      insertVisualNode(editor, anchor);
    }
  };

  const applyTool = (action: ToolAction) => {
    const editor = visualRef.current;
    if (!editor) return;
    editor.focus();
    if (action === "table") insertTable();
    else if (action === "formula") insertFormula();
    else if (action === "code") insertCode();
    else if (action === "callout") insertCallout();
    else if (action === "link") insertLink();
    else document.execCommand(action, false);
    syncVisual();
  };

  const handleVisualKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    if (event.key.toLowerCase() === "b") {
      event.preventDefault();
      applyTool("bold");
    } else if (event.key.toLowerCase() === "i") {
      event.preventDefault();
      applyTool("italic");
    } else if (event.key.toLowerCase() === "k") {
      event.preventDefault();
      applyTool("link");
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
      const href = window.prompt("Dirección del enlace", "https://")?.trim();
      if (href && safeLinkDestination(href)) wrapMarkdownSelection("[", `](${href})`, "enlace");
    }
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
    announcement,
    baseId,
    counter,
    draft: value,
    handleHtmlChange,
    handleInvalid,
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
      <div className="rich-editor-heading">
        <span id={editor.labelId}>{editor.label}</span>
        <span className="num">{editor.counter}</span>
      </div>

      <EditorTabs
        baseId={editor.baseId}
        mode={editor.mode}
        onModeChange={editor.switchMode}
        panelId={editor.panelId}
      />

      <div
        aria-labelledby={`${editor.baseId}-${editor.mode}-tab`}
        className="multimodal-editor-workspace"
        id={editor.panelId}
        role="tabpanel"
        tabIndex={0}
      >
        <EditorComposePane
          activeTools={editor.activeTools}
          draft={editor.draft}
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
          required={editor.required}
          syncVisual={editor.syncVisual}
          visualRef={editor.visualRef}
        />
        <EditorPreview value={editor.previewValue} />
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
    </div>
  );
}
