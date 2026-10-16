"use client";

import { useEffect, useState } from "react";
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

// Implements: REQ-SKEL-VT-01
export function Screen({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
