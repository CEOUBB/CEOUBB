import { getApp, getApps, initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { ACCESS_REJECTION_MESSAGE, roleForEmail } from "./access-policy.ts";

declare global {
  interface Window {
    FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string;
  }
}

const firebaseConfig = {
  apiKey: "AIzaSyDpFz07hwK_6gV7CPxmyq_P3DfkjKaAFKU",
  authDomain: "centro-de-estudio-ubb.firebaseapp.com",
  projectId: "centro-de-estudio-ubb",
  storageBucket: "centro-de-estudio-ubb.firebasestorage.app",
  messagingSenderId: "411177916202",
  appId: "1:411177916202:web:57986cb2e14d676fe93053",
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

if (typeof window !== "undefined") {
  if (
    process.env.NODE_ENV === "development" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ) {
    window.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaEnterpriseProvider("6Lc_K5UtAAAAAAke6LXqyn3gVV4L3DxDGXfUoZMb"),
    isTokenAutoRefreshEnabled: true,
  });
}

function institutionalProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

/*
  Dentro de la WebView `signInWithPopup` no funciona — el almacenamiento está
  particionado y la ventana emergente nunca vuelve. La app abre la hoja nativa de
  Google y canjea la credencial resultante; el navegador conserva el popup.
  Las dos ramas terminan en el mismo `User` de Firebase.
*/
// Implements: REQ-CAP-12
async function nativeCredentialSignIn() {
  const result = await FirebaseAuthentication.signInWithGoogle();
  const idToken = result.credential?.idToken;
  if (!idToken) throw new Error("Google no devolvió una credencial utilizable.");
  const credential = GoogleAuthProvider.credential(idToken, result.credential?.accessToken);
  return signInWithCredential(getAuth(firebaseApp), credential);
}

/** Cierra la sesión en las dos capas: sin esto la hoja nativa recuerda la cuenta rechazada. */
// Implements: REQ-CAP-12b
async function abandonSession() {
  await signOut(getAuth(firebaseApp)).catch(() => undefined);
  if (Capacitor.isNativePlatform()) await FirebaseAuthentication.signOut().catch(() => undefined);
}

async function isRegisteredOwner(uid: string): Promise<boolean> {
  try {
    const { doc, getDoc, getFirestore } = await import("firebase/firestore");
    const db = getFirestore(firebaseApp);
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() && snap.data()?.role === "owner";
  } catch {
    return false;
  }
}

// Implements: REQ-CAP-12, REQ-CAP-12b
export async function signInWithInstitutionalGoogle() {
  const result = Capacitor.isNativePlatform()
    ? await nativeCredentialSignIn()
    : await signInWithPopup(getAuth(firebaseApp), institutionalProvider());

  // El rol siempre lo decide `roleForEmail`: ni la capa nativa ni esta función
  // vuelven a interpretar el dominio del correo.
  if (!roleForEmail(result.user.email ?? "")) {
    const owner = await isRegisteredOwner(result.user.uid);
    if (!owner) {
      await abandonSession();
      throw new Error(ACCESS_REJECTION_MESSAGE);
    }
  }

  return result.user.getIdToken(true);
}

export function watchGooglePhoto(onPhoto: (url: string | null) => void) {
  return onAuthStateChanged(getAuth(firebaseApp), (user) => onPhoto(user?.photoURL ?? null));
}
