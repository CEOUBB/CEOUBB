"use client";

import { Suspense, useEffect, useState, ViewTransition } from "react";
import Image from "next/image";
import { watchGooglePhoto } from "../lib/firebase-client";
import { cachedPhoto, initials, rememberPhoto } from "../lib/portal-utils";

function useGooglePhoto(email: string) {
  const [photo, setPhoto] = useState<string | null>(null);
  useEffect(
    () =>
      watchGooglePhoto((url) => {
        if (url) rememberPhoto(email, url);
        setPhoto(url ?? cachedPhoto(email));
      }),
    [email]
  );
  return [photo, () => setPhoto(null)] as const;
}

/*
  Precedencia del avatar: foto propia, foto de Google, iniciales. Restablecer
  la foto por defecto vacía `photoUrl` en la base en vez de copiar la URL de
  Google, que puede rotar y quedaría congelada.
*/
// Implements: REQ-CFG-02, REQ-CFG-03
export function Avatar({
  email,
  name,
  photoUrl,
  large = false,
}: {
  email: string;
  name: string;
  photoUrl?: string | null;
  large?: boolean;
}) {
  const [googlePhoto, dropPhoto] = useGooglePhoto(email);
  const photo = photoUrl || googlePhoto;
  const size = large ? 44 : 32;
  return (
    <span className={large ? "avatar large" : "avatar"}>
      {photo ? (
        <Image
          alt=""
          src={photo}
          width={size}
          height={size}
          unoptimized
          onError={dropPhoto}
          referrerPolicy="no-referrer"
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}

const SCREEN_ENTER = {
  "tab-forward": "tab-enter-forward",
  "tab-back": "tab-enter-back",
  default: "screen-enter",
};
const DEFERRED_UPDATE = {
  "tab-forward": "none",
  "tab-back": "none",
  default: "reveal",
};
const SCREEN_EXIT = {
  "tab-forward": "tab-exit-forward",
  "tab-back": "tab-exit-back",
  default: "screen-exit",
};

// Implements: REQ-SKEL-VT-01, REQ-MOTION-02
export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition default="none" enter={SCREEN_ENTER} exit={SCREEN_EXIT}>
      {children}
    </ViewTransition>
  );
}

// Implements: REQ-MOTION-03
export function Deferred({
  fallback,
  children,
}: {
  fallback: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <ViewTransition default="none" update={DEFERRED_UPDATE}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </ViewTransition>
  );
}
