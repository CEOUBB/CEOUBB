"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { BookOpen, Code, Compass, Flame, Function as FunctionIcon, Translate, TrendUp } from "@phosphor-icons/react";
import { watchGooglePhoto } from "../lib/firebase-client";
import type { AccountRole as Role } from "../lib/access-policy";

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export function courseIcon(id: string) {
  switch (id) {
    case "estatica": return Compass;
    case "edo": return FunctionIcon;
    case "estadistica": return TrendUp;
    case "ingles": return Translate;
    case "termodinamica": return Flame;
    case "matlab": return Code;
    default: return BookOpen;
  }
}

export const rise = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };
export const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.055 } } };
export const ease = [0.16, 1, 0.3, 1] as const;

const PHOTO_KEY = "ceoubb:photo";

function cachedPhoto(email: string) {
  if (typeof window === "undefined") return null;
  try {
    const saved = JSON.parse(window.localStorage.getItem(PHOTO_KEY) ?? "null");
    return saved?.email === email ? String(saved.url) : null;
  } catch {
    return null;
  }
}

export function rememberPhoto(email: string, url: string) {
  try {
    window.localStorage.setItem(PHOTO_KEY, JSON.stringify({ email, url }));
  } catch {
    return;
  }
}

export function forgetPhoto() {
  try {
    window.localStorage.removeItem(PHOTO_KEY);
  } catch {
    return;
  }
}

function useGooglePhoto(email: string) {
  const [photo, setPhoto] = useState<string | null>(() => cachedPhoto(email));
  useEffect(() => watchGooglePhoto((url) => {
    if (url) rememberPhoto(email, url);
    setPhoto(url ?? cachedPhoto(email));
  }), [email]);
  return [photo, () => setPhoto(null)] as const;
}

export function Avatar({ email, name, large = false }: { email: string; name: string; large?: boolean }) {
  const [photo, dropPhoto] = useGooglePhoto(email);
  return (
    <span className={large ? "avatar large" : "avatar"}>
      {photo ? <img alt="" src={photo} onError={dropPhoto} referrerPolicy="no-referrer" /> : initials(name)}
    </span>
  );
}

export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.24, ease }}
    >
      {children}
    </motion.div>
  );
}

export function roleLabel(role: Role) {
  return role === "owner" ? "Desarrollador" : role === "teacher" ? "Docente" : "Estudiante";
}

export function initials(value: string) {
  return value.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "CE";
}
