"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { watchGooglePhoto } from "../lib/firebase-client";
import {
  cachedPhoto,
  initials,
  instantTransition,
  rememberPhoto,
  springDefault,
} from "../lib/portal-utils";

function useGooglePhoto(email: string) {
  const [photo, setPhoto] = useState<string | null>(() => cachedPhoto(email));
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

export function Screen({ children }: { children: React.ReactNode }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <m.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
      transition={shouldReduceMotion ? instantTransition : springDefault}
    >
      {children}
    </m.div>
  );
}
