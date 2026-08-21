"use client";

import { useEffect, useRef, useState } from "react";
import type { AcademicContentFormat } from "@/lib/academic-content";

type AcademicContentClientProps = {
  className?: string;
  format: AcademicContentFormat;
  html: string;
};

function copyButtonFromEvent(event: Event, root: HTMLDivElement): HTMLButtonElement | null {
  if (!(event.target instanceof Element)) return null;
  const button = event.target.closest<HTMLButtonElement>("[data-academic-copy]");
  if (!button || !root.contains(button)) return null;
  return button;
}

export function AcademicContentClient({ className, format, html }: AcademicContentClientProps) {
  const [announcement, setAnnouncement] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const rootClassName = ["academic-prose", className].filter(Boolean).join(" ");

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const contentRoot: HTMLDivElement = root;

    async function handleContentClick(event: Event) {
      const button = copyButtonFromEvent(event, contentRoot);
      if (!button) return;

      const code = button.closest(".academic-code-block")?.querySelector("code")?.textContent ?? "";
      const label = button.querySelector<HTMLElement>("[data-copy-label]");

      try {
        if (!navigator.clipboard?.writeText) throw new Error("clipboard-unavailable");
        await navigator.clipboard.writeText(code);
        if (label) label.textContent = "Copiado";
        button.dataset.copyState = "success";
        button.setAttribute("aria-label", "Código copiado");
        setAnnouncement("Código copiado al portapapeles.");
      } catch {
        if (label) label.textContent = "No se pudo copiar";
        button.dataset.copyState = "error";
        button.setAttribute("aria-label", "No se pudo copiar el código");
        setAnnouncement("No se pudo copiar el código. El contenido sigue disponible en pantalla.");
      }
    }

    contentRoot.addEventListener("click", handleContentClick);
    return () => contentRoot.removeEventListener("click", handleContentClick);
  }, []);

  return (
    <>
      <div
        ref={rootRef}
        className={rootClassName}
        data-academic-format={format}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <span aria-live="polite" className="academic-copy-status" role="status">
        {announcement}
      </span>
    </>
  );
}
