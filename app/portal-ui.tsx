"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import * as m from "motion/react-m";
import { watchGooglePhoto } from "../lib/firebase-client";
import { cachedPhoto, ease, initials, rememberPhoto } from "../lib/portal-utils";

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

export function Avatar({
  email,
  name,
  large = false,
}: {
  email: string;
  name: string;
  large?: boolean;
}) {
  const [photo, dropPhoto] = useGooglePhoto(email);
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
  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.24, ease }}
    >
      {children}
    </m.div>
  );
}
