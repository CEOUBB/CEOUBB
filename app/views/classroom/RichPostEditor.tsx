"use client";

import { MultimodalEditor } from "./MultimodalEditor";
import type { EditorMode } from "../../../lib/multimodal-editor";
import { RICH_TEXT_MAX_LENGTH } from "../../../lib/rich-text";

export function RichPostEditor({
  editorMode,
  label = "Mensaje",
  name,
  onChange,
  required = false,
  value,
}: {
  editorMode?: EditorMode;
  label?: string;
  name: string;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
}) {
  return (
    <MultimodalEditor
      initialMode={editorMode}
      label={label}
      maxLength={RICH_TEXT_MAX_LENGTH}
      name={name}
      onChange={onChange}
      required={required}
      value={value}
    />
  );
}
