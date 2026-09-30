"use client";

import { Suspense, useCallback, use, useState, useSyncExternalStore, useTransition } from "react";
import { browser } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChalkboardTeacher, GraduationCap } from "@phosphor-icons/react";
import { parseAcademicSections } from "../lib/courses";
import { rememberPhoto, type SessionState, type User } from "../lib/portal-utils";
import { parseSectionMemberships } from "../lib/section-roles";
import { useExternalLinks, useStatusBar } from "../lib/mobile-bridge";

// Implements: REQ-BROWSER-01
function DevQuickAuthActions({
  isQuickAuthAvailable,
  working,
  onDevAccess,
}: {
  isQuickAuthAvailable?: boolean;
  working: boolean;
  onDevAccess: (role: "student" | "teacher") => void;
}) {
  use(browser("Dev auth shortcuts are browser-only"));
  const isClientNonProd = useSyncExternalStore(
    () => () => {},
    () => !["ceoubb.com", "www.ceoubb.com"].includes(window.location.hostname),
    () => false
  );

  const quickAuthActive =
    isQuickAuthAvailable ||
    isClientNonProd ||
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_CEOUBB_ENVIRONMENT === "preview" ||
    process.env.NEXT_PUBLIC_CEOUBB_ENVIRONMENT === "staging";

  if (!quickAuthActive) return null;

  return (
    <div className="dev-auth-container" role="region" aria-label="Accesos rápidos de testing">
      <div className="dev-auth-divider">
        <span>Accesos rápidos de prueba</span>
      </div>
      <div className="dev-auth-actions">
        <button
          className="dev-auth-button dev-auth-button-student"
          disabled={working}
          onClick={() => onDevAccess("student")}
          type="button"
        >
          <GraduationCap aria-hidden="true" size={18} weight="bold" />
          <span>Entrar como estudiante</span>
        </button>
        <button
          className="dev-auth-button dev-auth-button-teacher"
          disabled={working}
          onClick={() => onDevAccess("teacher")}
          type="button"
        >
          <ChalkboardTeacher aria-hidden="true" size={18} weight="bold" />
          <span>Entrar como docente</span>
        </button>
      </div>
    </div>
  );
}

// Implements: REQ-AUTH-01, REQ-QMD-01, REQ-PERF-LOAD-01
export function AccessScreen({
  onSignedIn,
  onSignedInWithSession,
  isQuickAuthAvailable,
}: {
  onSignedIn?: (user: User) => void;
  onSignedInWithSession?: (session: SessionState) => void;
  isQuickAuthAvailable?: boolean;
}) {
  const router = useRouter();
  useStatusBar("hero");
  useExternalLinks();
  const [error, setError] = useState("");
  const [authenticating, setWorking] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const working = authenticating || refreshing;

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
      if (data.sections && onSignedInWithSession) {
        onSignedInWithSession({
          user: data.user,
          sectionIds: Array.isArray(data.sectionIds)
            ? data.sectionIds.filter((value: unknown): value is string => typeof value === "string")
            : [],
          memberships: parseSectionMemberships(data.memberships),
          sections: Array.isArray(data.sections) ? parseAcademicSections(data.sections) : null,
          archivedNextCursor:
            typeof data.archivedNextCursor === "string" ? data.archivedNextCursor : null,
        });
      } else if (onSignedIn) {
        onSignedIn(data.user);
      } else {
        startRefresh(() => router.refresh());
      }
    },
    [onSignedIn, onSignedInWithSession, router]
  );

  const googleAccess = async () => {
    setError("");
    setWorking(true);
    try {
      const { signInWithInstitutionalGoogle } = await import("../lib/firebase-client");
      const idToken = await signInWithInstitutionalGoogle();
      await finishGoogleAccess(idToken);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "No fue posible continuar.";
      setError(message);
    } finally {
      setWorking(false);
    }
  };

  const devAccess = async (role: "student" | "teacher") => {
    setError("");
    setWorking(true);
    try {
      const response = await fetch("/api/auth/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!response.ok) {
        let errorMessage = "No fue posible acceder en modo testing.";
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
      if (data.sections && onSignedInWithSession) {
        onSignedInWithSession({
          user: data.user,
          sectionIds: Array.isArray(data.sectionIds)
            ? data.sectionIds.filter((value: unknown): value is string => typeof value === "string")
            : [],
          memberships: parseSectionMemberships(data.memberships),
          sections: Array.isArray(data.sections) ? parseAcademicSections(data.sections) : null,
          archivedNextCursor:
            typeof data.archivedNextCursor === "string" ? data.archivedNextCursor : null,
        });
      } else if (onSignedIn) {
        onSignedIn(data.user);
      } else {
        startRefresh(() => router.refresh());
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "No fue posible acceder.";
      setError(message);
    } finally {
      setWorking(false);
    }
  };

  return (
    <main className="access-page">
      <a className="skip-link" href="#contenido-principal">
        Saltar al contenido principal
      </a>
      <section className="access-brand">
        <div className="access-brand-lockup">
          <Image
            src="/brand/ubb-shield.webp"
            unoptimized
            alt="Escudo de la Universidad del Bío-Bío"
            width={388}
            height={594}
            sizes="(max-width: 640px) 140px, (max-width: 1024px) 240px, 388px"
            priority
          />
          <h1>
            Centro de <strong>Estudio UBB</strong>
          </h1>
        </div>
      </section>
      <section
        aria-labelledby="access-title"
        className="access-panel"
        id="contenido-principal"
        tabIndex={-1}
      >
        <div className="access-panel-inner">
          <div className="login-card" id="inicio">
            <span className="login-rule" aria-hidden="true" />
            <h2 id="access-title">Ingresa con tu correo institucional</h2>
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
                  src="/brand/access/google-g.webp"
                  unoptimized
                  alt=""
                  aria-hidden="true"
                  width={72}
                  height={72}
                  priority
                />
              )}
              {working ? "Verificando cuenta…" : "Continuar con Google"}
            </button>
            <Suspense fallback={null}>
              <DevQuickAuthActions
                isQuickAuthAvailable={isQuickAuthAvailable}
                working={working}
                onDevAccess={devAccess}
              />
            </Suspense>
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
                  src="/brand/access/app-store-badge-es.webp"
                  unoptimized
                  alt="App Store"
                  width={405}
                  height={135}
                  sizes="135px"
                />
              </div>
              <div className="store-badge">
                <Image
                  src="/brand/access/google-play-badge-es.webp"
                  unoptimized
                  alt="Google Play"
                  width={405}
                  height={123}
                  sizes="135px"
                />
              </div>
            </div>
          </div>

          <footer className="legal-note">
            Plataforma estudiantil independiente. No reemplaza los sistemas oficiales de la
            Universidad del Bío-Bío.{" "}
            <Link prefetch={false} href="/faq">
              Preguntas frecuentes
            </Link>{" "}
            ·{" "}
            <Link prefetch={false} href="/contacto">
              Contacto
            </Link>{" "}
            ·{" "}
            <Link prefetch={false} href="/privacidad">
              Privacidad
            </Link>{" "}
            ·{" "}
            <Link prefetch={false} href="/terminos">
              Términos
            </Link>{" "}
            ·{" "}
            <Link prefetch={false} href="/accesibilidad">
              Accesibilidad
            </Link>
          </footer>
        </div>
      </section>
    </main>
  );
}
