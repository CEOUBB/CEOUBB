"use client";

import { useDeferredValue, useId } from "react";
import { RICH_TEXT_MAX_LENGTH } from "../../../lib/rich-text";
import type { EditorMode } from "../../../lib/publication-workflow";
import { RichText } from "./RichText";

export function RichPostEditor({
  label = "Mensaje",
  name,
  onChange,
  required = false,
  value,
  editorMode = "markdown",
}: {
  editorMode?: EditorMode;
  label?: string;
  name: string;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
}) {
  const inputId = useId();
  const previewValue = useDeferredValue(value);
  return (
    <div
      className="rich-editor"
      data-editor-mode={editorMode}
      data-requirement="Implements: REQ-RICH-04 REQ-RICH-07 REQ-PUB-01 REQ-PUB-05"
    >
      <div className="rich-editor-heading">
        <label htmlFor={inputId}>{label}</label>
        <span>
          {value.length.toLocaleString("es-CL")} / {RICH_TEXT_MAX_LENGTH.toLocaleString("es-CL")}
        </span>
      </div>
      <textarea
        id={inputId}
        maxLength={RICH_TEXT_MAX_LENGTH}
        name={name}
        onChange={(event) => onChange(event.target.value)}
        placeholder={"Explica con Markdown. Usa $...$ para fórmulas y ```matlab para código."}
        required={required}
        rows={9}
        value={value}
      />
      <div aria-label="Vista previa de la publicación" className="rich-editor-preview">
        <strong>Vista previa</strong>
        {previewValue.trim() ? (
          <RichText body={previewValue} />
        ) : (
          <p>El contenido formateado aparecerá aquí mientras escribes.</p>
        )}
      </div>
    </div>
  );
}
