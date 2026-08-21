"use client";

import { MultimodalEditor } from "./MultimodalEditor";
import { RICH_TEXT_MAX_LENGTH } from "../../../lib/rich-text";

export function RichPostEditor({
  label = "Mensaje",
  name,
  onChange,
  required = false,
  value,
}: {
  label?: string;
  name: string;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
}) {
  return (
    <MultimodalEditor
      label={label}
      maxLength={RICH_TEXT_MAX_LENGTH}
      name={name}
      onChange={onChange}
      required={required}
      value={value}
    />
  );
}
