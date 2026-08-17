"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signInWithInstitutionalGoogle } from "../lib/firebase-client";
import { rememberPhoto, type User } from "../lib/portal-utils";

const SKELETON_COURSES = [0, 1, 2, 3, 4, 5];
const SKELETON_NAV = [0, 1, 2];
const SKELETON_SIDE_COURSES = [0, 1, 2, 3, 4];

export function LoadingScreen() {
  return (
    <div aria-busy="true" className="boot-shell">
      <p className="sr-only" role="status">
        Abriendo Centro de Estudio UBB…
      </p>
      <header className="boot-header">
        <span className="sk sk-round boot-menu" />
        <Image
          src="/brand/ubb-shield.webp"
          alt=""
          aria-hidden="true"
          width={388}
          height={594}
          priority
        />
        <strong>Centro de Estudio UBB</strong>
        <span className="sk boot-search" style={{ "--sk-delay": "80ms" } as React.CSSProperties} />
        <span
          className="sk sk-round boot-avatar"
          style={{ "--sk-delay": "120ms" } as React.CSSProperties}
        />
      </header>
      <aside className="boot-side">
        {SKELETON_NAV.map((row) => (
          <span
            className="sk boot-row"
            key={`nav-${row}`}
            style={{ "--sk-delay": `${row * 45}ms` } as React.CSSProperties}
          />
        ))}
        <span className="sk boot-legend" style={{ "--sk-delay": "180ms" } as React.CSSProperties} />
        {SKELETON_SIDE_COURSES.map((row) => (
          <span
            className="sk boot-row"
            key={`course-${row}`}
            style={{ "--sk-delay": `${220 + row * 45}ms` } as React.CSSProperties}
          />
        ))}
      </aside>
      <main className="boot-main">
        <div className="boot-head">
          <span className="sk boot-title" style={{ "--sk-delay": "60ms" } as React.CSSProperties} />
          <span
            className="sk boot-subtitle"
            style={{ "--sk-delay": "110ms" } as React.CSSProperties}
          />
        </div>
        <span className="sk boot-strip" style={{ "--sk-delay": "160ms" } as React.CSSProperties} />
        <div className="boot-grid">
          {SKELETON_COURSES.map((card) => (
            <article
              className="boot-card"
              key={card}
              style={{ "--sk-delay": `${220 + card * 70}ms` } as React.CSSProperties}
            >
              <span className="sk boot-cover" />
              <span className="sk boot-line wide" />
              <span className="sk boot-line" />
              <span className="sk boot-line short" />
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}

export function AccessScreen({ onSignedIn }: { onSignedIn: (user: User) => void }) {
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  const finishGoogleAccess = useCallback(
    async (idToken: string) => {
      const response = await fetch("/api/auth/firebase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!response.ok) {
        let errorMessage = "No fue posible continuar.";
        try {
          const errorData = await response.json();
          if (errorData?.error) errorMessage = errorData.error;
        } catch {
          // Non-JSON response
        }
        throw new Error(errorMessage);
      }
      const data = await response.json();
      if (data.photoUrl) rememberPhoto(data.user.email, data.photoUrl);
      onSignedIn(data.user);
    },
    [onSignedIn]
  );

  const googleAccess = async () => {
    setError("");
    setWorking(true);
    try {
      const idToken = await signInWithInstitutionalGoogle();
      await finishGoogleAccess(idToken);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "No fue posible continuar.";
      setError(message);
    } finally {
      setWorking(false);
    }
  };

  return (
    <main className="access-page">
      <section className="access-brand">
        <div className="access-brand-lockup">
          <Image
            src="/brand/ubb-shield.webp"
            alt="Escudo de la Universidad del Bío-Bío"
            width={388}
            height={594}
            priority
          />
          <h1>
            Centro de <strong>Estudio UBB</strong>
          </h1>
        </div>
      </section>
      <section className="access-panel">
        <div className="access-panel-inner">
          <div className="login-card" id="inicio">
            <span className="login-rule" aria-hidden="true" />
            <h2>Ingresa con tu correo institucional</h2>
            <button
              className="google-button"
              disabled={working}
              onClick={googleAccess}
              type="button"
            >
              {working ? (
                <span className="google-spinner" aria-hidden="true" />
              ) : (
                <Image
                  src="/brand/google-g.webp"
                  alt=""
                  aria-hidden="true"
                  width={256}
                  height={256}
                />
              )}
              {working ? "Verificando cuenta…" : "Continuar con Google"}
            </button>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <p className="institution-note">
              <strong>Acceso exclusivo UBB.</strong> Usa tu cuenta @alumnos.ubiobio.cl o
              @ubiobio.cl. Cualquier otra universidad o correo personal será rechazado.
            </p>
          </div>
          <div className="store-block">
            <div
              className="store-badges"
              role="group"
              aria-label="Aplicaciones móviles próximamente disponibles"
            >
              <div className="store-badge">
                <Image
                  src="/brand/app-store-badge-es.webp"
                  alt="App Store"
                  width={3840}
                  height={1284}
                />
              </div>
              <div className="store-badge">
                <Image
                  src="/brand/google-play-badge-es.webp"
                  alt="Google Play"
                  width={2214}
                  height={675}
                />
              </div>
            </div>
          </div>

          <p className="legal-note">
            Plataforma estudiantil independiente. No reemplaza los sistemas oficiales de la
            Universidad del Bío-Bío. <Link href="/privacidad">Privacidad</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
