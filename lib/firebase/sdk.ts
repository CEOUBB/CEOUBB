import { getAuth, onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { firebaseApp } from "../firebase-client.ts";
import { type AccountRole, roleForEmail } from "../access-policy.ts";

const auth = getAuth(firebaseApp);

let firestoreHandle: Promise<{
  sdk: typeof import("firebase/firestore");
  db: ReturnType<typeof import("firebase/firestore").getFirestore>;
}> | null = null;
let storageHandle: Promise<{
  sdk: typeof import("firebase/storage");
  storage: ReturnType<typeof import("firebase/storage").getStorage>;
}> | null = null;
let functionsHandle: Promise<{
  sdk: typeof import("firebase/functions");
  functions: ReturnType<typeof import("firebase/functions").getFunctions>;
}> | null = null;

export function firestore() {
  firestoreHandle ??= import("firebase/firestore").then((sdk) => ({
    sdk,
    db: sdk.getFirestore(firebaseApp),
  }));
  return firestoreHandle;
}

export function cloudStorage() {
  storageHandle ??= import("firebase/storage").then((sdk) => ({
    sdk,
    storage: sdk.getStorage(firebaseApp),
  }));
  return storageHandle;
}

// Implements: REQ-AUDIT-01, REQ-AUDIT-07
export function cloudFunctions() {
  functionsHandle ??= import("firebase/functions").then((sdk) => ({
    sdk,
    functions: sdk.getFunctions(firebaseApp, "southamerica-west1"),
  }));
  return functionsHandle;
}

export function currentUser(): Promise<FirebaseUser> {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  return new Promise<FirebaseUser>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      unsubscribe();
      reject(new Error("Tu sesión de Google expiró. Cierra sesión y vuelve a ingresar."));
    }, 10000);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      window.clearTimeout(timeout);
      unsubscribe();
      resolve(user);
    });
  });
}

export function emailOf(user: FirebaseUser): string {
  return (user.email ?? "").toLowerCase();
}

export function roleOf(user: FirebaseUser): AccountRole {
  return roleForEmail(user.email ?? "") ?? "student";
}

export function authorFields(user: FirebaseUser) {
  return { authorId: user.uid, authorName: user.displayName ?? "", authorEmail: emailOf(user) };
}
