import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDpFz07hwK_6gV7CPxmyq_P3DfkjKaAFKU",
  authDomain: "centro-de-estudio-ubb.firebaseapp.com",
  projectId: "centro-de-estudio-ubb",
  storageBucket: "centro-de-estudio-ubb.firebasestorage.app",
  messagingSenderId: "411177916202",
  appId: "1:411177916202:web:57986cb2e14d676fe93053",
};

const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export async function signInWithInstitutionalGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(getAuth(firebaseApp), provider);
  return result.user.getIdToken(true);
}
