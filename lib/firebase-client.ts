import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDpFz07hwK_6gV7CPxmyq_P3DfkjKaAFKU",
  authDomain: "centro-de-estudio-ubb.firebaseapp.com",
  projectId: "centro-de-estudio-ubb",
  storageBucket: "centro-de-estudio-ubb.firebasestorage.app",
  messagingSenderId: "411177916202",
  appId: "1:411177916202:web:57986cb2e14d676fe93053",
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

function institutionalProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

export async function signInWithInstitutionalGoogle() {
  const result = await signInWithPopup(getAuth(firebaseApp), institutionalProvider());
  return result.user.getIdToken(true);
}

export function watchGooglePhoto(onPhoto: (url: string | null) => void) {
  return onAuthStateChanged(getAuth(firebaseApp), (user) => onPhoto(user?.photoURL ?? null));
}
