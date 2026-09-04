import { AcademicContentTooLargeError, sanitizeAcademicHtml } from "@/lib/academic-sanitizer";

const OVERSIZED_CONTENT_MESSAGE =
  "Este contenido es demasiado extenso para mostrarse de forma segura. Divídelo en publicaciones más pequeñas.";

export type AcademicProseProps = {
  html: string;
  className?: string;
};

// Implements: REQ-PROSE-05
export function AcademicProse({ html, className }: AcademicProseProps) {
  const classes = className ? `academic-prose ${className}` : "academic-prose";
  let sanitizedHtml: ReturnType<typeof sanitizeAcademicHtml> | null = null;

  try {
    sanitizedHtml = sanitizeAcademicHtml(html);
  } catch (error) {
    if (!(error instanceof AcademicContentTooLargeError)) throw error;
  }

  if (sanitizedHtml === null) {
    return (
      <div className={classes} role="alert">
        <p className="academic-prose-error">{OVERSIZED_CONTENT_MESSAGE}</p>
      </div>
    );
  }

  return <div className={classes} dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
}
