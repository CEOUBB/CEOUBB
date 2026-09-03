"use client";

import { Fragment, useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import Script from "next/script";
import "../../../public/biblioteca/assets/vendor/katex/katex.min.css";
import {
  CLASSROOM_COMPATIBILITY_REQUIREMENTS,
  calloutFromQuote,
  codeLanguageLabel,
  highlightCode,
  inlineToPlainText,
  parseRichInline,
  parseRichText,
  type RichInline,
  type RichTableBlock,
} from "../../../lib/rich-text";

type KatexRuntime = {
  render: (
    expression: string,
    element: HTMLElement,
    options: {
      displayMode: boolean;
      maxExpand: number;
      maxSize: number;
      output: "htmlAndMathml";
      strict: "error";
      throwOnError: boolean;
      trust: boolean;
    }
  ) => void;
};

declare global {
  interface Window {
    katex?: KatexRuntime;
  }
}

const katexSubscribers = new Set<() => void>();

function keyedItems<T>(items: T[], prefix: string) {
  return items.map((item, index) => ({
    item,
    key: `${prefix}-${index}`,
  }));
}

export function RichTextAssets() {
  return (
    <Script
      id="ceoubb-katex"
      src="/biblioteca/assets/vendor/katex/katex.min.js"
      strategy="afterInteractive"
      onReady={() => {
        for (const subscriber of katexSubscribers) subscriber();
        katexSubscribers.clear();
      }}
    />
  );
}

function MathFormula({ value, display }: { value: string; display: boolean }) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const spanRef = useRef<HTMLSpanElement | null>(null);
  const source = display ? `$$\n${value}\n$$` : `$${value}$`;

  useEffect(() => {
    const render = () => {
      const element = display ? divRef.current : spanRef.current;
      if (!element) return;
      if (!window.katex) {
        element.textContent = source;
        return;
      }
      try {
        window.katex.render(value, element, {
          displayMode: display,
          maxExpand: 1_000,
          maxSize: 10,
          output: "htmlAndMathml",
          strict: "error",
          throwOnError: true,
          trust: false,
        });
      } catch {
        element.textContent = source;
      }
    };

    katexSubscribers.add(render);
    render();
    if (window.katex) katexSubscribers.delete(render);
    return () => {
      katexSubscribers.delete(render);
    };
  }, [display, source, value]);

  if (display) {
    return (
      <div
        aria-label={`Fórmula: ${value}`}
        className="rich-math rich-math-display"
        data-source={source}
        ref={divRef}
      />
    );
  }

  return (
    <span
      aria-label={`Fórmula: ${value}`}
      className="rich-math rich-math-inline"
      data-source={source}
      ref={spanRef}
    />
  );
}

function renderInline(nodes: RichInline[]): ReactNode[] {
  return keyedItems(nodes, "inline").map(({ item: node, key }) => {
    if (node.type === "text") return <Fragment key={key}>{node.value}</Fragment>;
    if (node.type === "code") return <code key={key}>{node.value}</code>;
    if (node.type === "math") return <MathFormula display={false} key={key} value={node.value} />;
    if (node.type === "strong") return <strong key={key}>{renderInline(node.content)}</strong>;
    if (node.type === "emphasis") return <em key={key}>{renderInline(node.content)}</em>;
    if (node.type === "underline") return <u key={key}>{renderInline(node.content)}</u>;
    if (node.type === "strikethrough") return <del key={key}>{renderInline(node.content)}</del>;
    if (node.type === "mark") return <mark key={key}>{renderInline(node.content)}</mark>;
    if (node.type === "subscript") return <sub key={key}>{renderInline(node.content)}</sub>;
    if (node.type === "superscript") return <sup key={key}>{renderInline(node.content)}</sup>;
    if (node.type === "footnoteRef") {
      return (
        <sup className="rich-footnote-ref" key={key}>
          <a href={`#fn-${node.identifier}`} id={`fnref-${node.identifier}`}>
            [{node.identifier}]
          </a>
        </sup>
      );
    }
    if (!node.href) return <span key={key}>{renderInline(node.content)}</span>;
    return (
      <a href={node.href} key={key} rel="noopener noreferrer" target="_blank">
        {renderInline(node.content)}
      </a>
    );
  });
}

function CodeBlock({
  language,
  value,
}: {
  language: Parameters<typeof highlightCode>[1];
  value: string;
}) {
  const tokens = useMemo(() => highlightCode(value, language), [language, value]);
  return (
    <figure className="rich-code">
      <figcaption>{codeLanguageLabel(language)}</figcaption>
      <pre>
        <code>
          {keyedItems(tokens, "token").map(({ item: token, key }) => (
            <span className={`syntax-${token.kind}`} key={key}>
              {token.value}
            </span>
          ))}
        </code>
      </pre>
    </figure>
  );
}

function RichTable({ alignments, header, rows }: RichTableBlock) {
  return (
    <div
      aria-label="Tabla de contenido académico; desplázate horizontalmente para ver todas las columnas"
      className="rich-table-scroll"
      role="region"
    >
      <table className="num">
        <thead>
          <tr>
            {keyedItems(header, "header").map(({ item, key }, index) => (
              <th
                className={alignments[index] ? `rich-table-align-${alignments[index]}` : undefined}
                key={key}
                scope="col"
              >
                {renderInline(item)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {keyedItems(rows, "row").map(({ item: row, key }) => (
            <tr key={key}>
              {keyedItems(row, "cell").map(({ item, key: cellKey }, index) => (
                <td
                  className={
                    alignments[index] ? `rich-table-align-${alignments[index]}` : undefined
                  }
                  key={cellKey}
                >
                  {renderInline(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RichText({ body, className = "" }: { body: string; className?: string }) {
  const blocks = useMemo(() => parseRichText(body), [body]);
  return (
    <div
      className={`academic-prose rich-text ${className}`.trim()}
      data-requirement={`Implements: REQ-RICH-01 REQ-RICH-02 REQ-RICH-03 REQ-RICH-05 REQ-RICH-06 ${CLASSROOM_COMPATIBILITY_REQUIREMENTS.join(" ")}`}
    >
      {keyedItems(blocks, "block").map(({ item: block, key }) => {
        /*
          Un callout cuya estructura se rompió al editar deja el marcador como
          párrafo o título sueltos. Se reconoce igual para que el estudiante
          nunca lea «[!ASSESSMENT]» en la publicación.
        */
        if (block.type === "paragraph" || block.type === "heading") {
          const stray = calloutFromQuote(inlineToPlainText(block.content));
          if (stray) {
            return (
              <aside className="rich-callout" data-callout={stray.tone} key={key}>
                <p>{renderInline(parseRichInline(stray.body))}</p>
              </aside>
            );
          }
        }
        if (block.type === "paragraph") {
          const style: CSSProperties = {
            ...(block.align ? { textAlign: block.align } : {}),
            ...(block.indent ? { paddingLeft: `${block.indent * 2}rem` } : {}),
          };
          return (
            <p key={key} style={Object.keys(style).length > 0 ? style : undefined}>
              {renderInline(block.content)}
            </p>
          );
        }
        if (block.type === "heading") {
          const style: CSSProperties = {
            ...(block.align ? { textAlign: block.align } : {}),
            ...(block.indent ? { paddingLeft: `${block.indent * 2}rem` } : {}),
          };
          return (
            <h4
              aria-level={Math.min(block.level + 3, 6)}
              className={`rich-heading rich-heading-${block.level}`}
              style={Object.keys(style).length > 0 ? style : undefined}
              key={key}
            >
              {renderInline(block.content)}
            </h4>
          );
        }
        if (block.type === "divider") return <hr className="rich-divider" key={key} />;
        if (block.type === "quote") {
          const callout = calloutFromQuote(inlineToPlainText(block.content));
          if (callout) {
            return (
              <aside className="rich-callout" data-callout={callout.tone} key={key}>
                <p>{renderInline(parseRichInline(callout.body))}</p>
              </aside>
            );
          }
          return <blockquote key={key}>{renderInline(block.content)}</blockquote>;
        }
        if (block.type === "code")
          return <CodeBlock key={key} language={block.language} value={block.value} />;
        if (block.type === "math") return <MathFormula display key={key} value={block.value} />;
        if (block.type === "table") return <RichTable key={key} {...block} />;
        if (block.type === "checklist") {
          return (
            <ul className="rich-checklist" key={key}>
              {keyedItems(block.items, "check-item").map(({ item, key: itemKey }) => (
                <li
                  className={`rich-checklist-item ${item.checked ? "is-checked" : ""}`}
                  key={itemKey}
                >
                  <input
                    aria-label={item.checked ? "Completado" : "Pendiente"}
                    checked={item.checked}
                    className="rich-checkbox"
                    disabled
                    readOnly
                    type="checkbox"
                  />
                  <span className="rich-checklist-text">{renderInline(item.content)}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (block.type === "footnoteDef") {
          return (
            <div className="rich-footnote-item" id={`fn-${block.identifier}`} key={key}>
              <small className="num">[{block.identifier}]</small>
              <span className="rich-footnote-text">{renderInline(block.content)}</span>
              <a
                aria-label={`Volver a la referencia ${block.identifier}`}
                className="rich-footnote-backlink"
                href={`#fnref-${block.identifier}`}
              >
                ↩
              </a>
            </div>
          );
        }
        const List = block.ordered ? "ol" : "ul";
        return (
          <List key={key}>
            {keyedItems(block.items, "item").map(({ item, key: itemKey }) => (
              <li key={itemKey}>{renderInline(item)}</li>
            ))}
          </List>
        );
      })}
    </div>
  );
}
