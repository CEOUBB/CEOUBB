"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sigma } from "@phosphor-icons/react";
import { Course, DEFAULT_FOLDER, materialFolders } from "../../../lib/courses";
import { ClassroomFile } from "../../../lib/firebase-classroom-client";
import { hapticTap, useIsMobileApp } from "../../../lib/mobile-bridge";
import { fileExtension, formatBytes, formatDate, type User } from "../../../lib/portal-utils";
import { MobileSheet } from "../../mobile-shell";
import { groupByFolder, type Note } from "./classroom-utils";
import { PublicationLauncher } from "./PublicationLauncher";

export function MaterialsSection({
  course,
  files,
  user,
  canManageContent,
  publish,
  upload,
  openFile,
  renameFile,
  moveFile,
  deleteFile,
  status,
}: {
  course: Course;
  files: ClassroomFile[];
  user: User;
  canManageContent: boolean;
  publish: (event: FormEvent<HTMLFormElement>) => Promise<boolean>;
  upload: (event: FormEvent<HTMLFormElement>) => void;
  openFile: (file: ClassroomFile) => void;
  renameFile: (file: ClassroomFile) => void;
  moveFile: (file: ClassroomFile) => void;
  deleteFile: (file: ClassroomFile) => void;
  status: Note;
}) {
  const folders = useMemo(() => groupByFolder(course, files), [course, files]);
  const availableFolders = useMemo(() => materialFolders(course), [course]);
  const mobile = useIsMobileApp();
  const [toolsOpen, setToolsOpen] = useState(false);

  /* El panel docente ocupa una columna entera: en móvil no cabe al lado del
     listado, así que se guarda tras un botón y sube como hoja arrastrable. */
  const tools = (
    <>
      <datalist id="folder-options">
        {availableFolders.map((folder) => (
          <option key={folder} value={folder} />
        ))}
      </datalist>
      <form onSubmit={upload}>
        <label>
          PDF, PPT, DOCX, XLSX, ZIP o imagen
          <input name="file" type="file" required />
        </label>
        <label>
          Carpeta
          <input name="folder" list="folder-options" placeholder={DEFAULT_FOLDER} />
        </label>
        <button className="secondary-button" type="submit">
          Subir al curso
        </button>
      </form>
      {status.text && (
        <p className={`tool-status ${status.tone}`} role="status">
          {status.text}
        </p>
      )}
    </>
  );

  return (
    <section className="materials-view">
      <div className="materials-list">
        <div className="section-title compact-title publication-section-title">
          <h2>Archivos compartidos</h2>
          {canManageContent && (
            <PublicationLauncher folders={availableFolders} publish={publish} status={status} />
          )}
        </div>
        <Link className="material-row featured" href="/biblioteca/index.html" prefetch={false}>
          <span className="file-icon">
            <Sigma size={20} />
          </span>
          <div>
            <strong>Biblioteca académica del ramo</strong>
            <small>Certámenes, ejercicios resueltos, apuntes y material original</small>
          </div>
          <b>
            Abrir <ArrowRight size={14} />
          </b>
        </Link>
        {files.length === 0 && (
          <div className="empty-state">
            <strong>Aún no hay archivos del docente.</strong>
            <p>Cuando publique una guía, PPT, PDF o dictamen aparecerá aquí.</p>
          </div>
        )}
        {folders.map(([folder, items]) => (
          <details className="material-folder" key={folder} open>
            <summary>
              <span>{folder}</span>
              <b>
                {items.length} {items.length === 1 ? "archivo" : "archivos"}
              </b>
            </summary>
            {items.map((file) => {
              const canManage =
                canManageContent &&
                (user.role === "owner" ||
                  file.authorEmail.toLowerCase() === user.email.toLowerCase());
              return (
                <div className="material-row" key={file.id}>
                  <span className="file-icon">{fileExtension(file.name)}</span>
                  <div>
                    <strong>{file.name}</strong>
                    <small>
                      {file.authorName} · {formatBytes(file.size)} · {formatDate(file.createdAt)}
                    </small>
                  </div>
                  <span className="material-actions">
                    <button onClick={() => openFile(file)} type="button">
                      Descargar
                    </button>
                    {canManage && (
                      <span className="content-actions">
                        <button onClick={() => renameFile(file)} type="button">
                          Modificar
                        </button>
                        <button onClick={() => moveFile(file)} type="button">
                          Mover
                        </button>
                        <button onClick={() => deleteFile(file)} type="button">
                          Eliminar
                        </button>
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </details>
        ))}
      </div>
      {canManageContent && !mobile && (
        <aside className="teacher-tools">
          <h2>Subir un archivo</h2>
          {tools}
        </aside>
      )}
      {/* Implements: REQ-CAP-05 — el selector de archivos del docente, como hoja. */}
      {canManageContent && mobile && (
        <>
          <button
            className="sheet-cta"
            onClick={() => {
              hapticTap();
              setToolsOpen(true);
            }}
            type="button"
          >
            Subir archivo
          </button>
          <MobileSheet
            onOpenChange={setToolsOpen}
            open={toolsOpen}
            title="Subir un archivo"
            description="Añade un documento a los materiales del ramo."
          >
            <div className="teacher-tools sheet-tools">{tools}</div>
          </MobileSheet>
        </>
      )}
    </section>
  );
}
