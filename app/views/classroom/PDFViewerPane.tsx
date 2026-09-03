"use client";

import { useEffect } from "react";
import {
  ArrowsOutLineHorizontal,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  WarningCircle,
} from "@phosphor-icons/react";
import { usePDFSlick } from "@pdfslick/react";
import "@pdfslick/react/dist/pdf_viewer.css";

/*
  Envoltura del visor de PDF. Vive en su propio archivo y se importa de forma
  diferida porque PDF.js necesita `window`, `document` y un Web Worker: en el
  servidor no puede construirse, y en el aula sólo debe descargarse cuando un
  docente abre una entrega.
*/
// Implements: REQ-REV-01
export function PDFViewerPane({ url, fileName }: { url: string; fileName: string }) {
  const { viewerRef, usePDFSlickStore, PDFSlickViewer, isDocumentLoaded, error, store } =
    usePDFSlick(url, { scaleValue: "page-width", textLayerMode: 1 });

  const pageNumber = usePDFSlickStore((state) => state.pageNumber);
  const numPages = usePDFSlickStore((state) => state.numPages);
  const scale = usePDFSlickStore((state) => state.scale);

  /*
    Cada entrega monta su propio visor: al cerrarlo se liberan las páginas
    renderizadas para no arrastrarlas de alumno en alumno dentro del WebView del
    teléfono.
  */
  // Implements: REQ-REV-01
  useEffect(() => () => store.getState().pdfSlick?._cleanup(), [store]);

  if (error)
    return (
      <p className="review-doc-error" role="alert">
        <WarningCircle aria-hidden="true" size={20} weight="fill" />
        No fue posible abrir <strong>{fileName}</strong> en el visor. Descarga el archivo para
        revisarlo fuera de la plataforma.
      </p>
    );

  return (
    <div className="review-doc-viewer">
      <div className="review-doc-toolbar">
        <p className="review-doc-page num" role="status">
          {isDocumentLoaded ? (
            <>
              Página {pageNumber.toLocaleString("es-CL")} de {numPages.toLocaleString("es-CL")}
            </>
          ) : (
            "Abriendo documento…"
          )}
        </p>
        <div className="review-doc-zoom">
          <button
            aria-label="Alejar"
            disabled={!isDocumentLoaded}
            onClick={() => store.getState().pdfSlick?.decreaseScale()}
            type="button"
          >
            <MagnifyingGlassMinus aria-hidden="true" size={17} />
          </button>
          <span className="num" aria-live="off">
            {Math.round(scale * 100)}%
          </span>
          <button
            aria-label="Acercar"
            disabled={!isDocumentLoaded}
            onClick={() => store.getState().pdfSlick?.increaseScale()}
            type="button"
          >
            <MagnifyingGlassPlus aria-hidden="true" size={17} />
          </button>
          <button
            aria-label="Ajustar al ancho"
            disabled={!isDocumentLoaded}
            onClick={() => {
              const pdfSlick = store.getState().pdfSlick;
              if (pdfSlick) pdfSlick.currentScaleValue = "page-width";
            }}
            type="button"
          >
            <ArrowsOutLineHorizontal aria-hidden="true" size={17} />
          </button>
        </div>
      </div>
      <div className="review-doc-canvas">
        <PDFSlickViewer {...{ viewerRef, usePDFSlickStore }} />
      </div>
    </div>
  );
}

export default PDFViewerPane;
