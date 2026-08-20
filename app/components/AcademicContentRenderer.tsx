import { AcademicContentClient } from "./AcademicContentClient";
import { renderAcademicContentToHtml, type AcademicContentFormat } from "@/lib/academic-content";

export type AcademicContentRendererProps = {
  className?: string;
  content: string;
  format?: AcademicContentFormat;
};

export function AcademicContentRenderer({
  className,
  content,
  format = "markdown",
}: AcademicContentRendererProps) {
  const html = renderAcademicContentToHtml(content, format);
  return <AcademicContentClient className={className} format={format} html={html} />;
}
