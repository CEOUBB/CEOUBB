import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, getRedirectResult, GoogleAuthProvider, signInWithRedirect } from "firebase/auth";

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
  await signInWithRedirect(getAuth(firebaseApp), institutionalProvider());
}

export async function finishInstitutionalGoogleSignIn() {
  const result = await getRedirectResult(getAuth(firebaseApp));
  return result ? result.user.getIdToken(true) : null;
}
