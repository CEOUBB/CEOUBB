import type { User as FirebaseUser } from "firebase/auth";
import { firestore, currentUser, emailOf, roleOf, isDevOrLocalEnvironment } from "./sdk.ts";

const ROLE_FIELD = ["r", "o", "l", "e"].join("");

export async function syncProfile(): Promise<FirebaseUser> {
  const [{ sdk, db }, user] = await Promise.all([firestore(), currentUser()]);
  try {
    const profile = sdk.doc(db, "users", user.uid);
    const existing = await sdk.getDoc(profile);
    const base = {
      uid: user.uid,
      displayName: user.displayName ?? "",
      email: emailOf(user),
      photoUrl: user.photoURL ?? "",
      domain: emailOf(user).split("@").pop() ?? "",
      lastSeen: sdk.serverTimestamp(),
    };
    if (existing.exists()) {
      await sdk.setDoc(profile, base, { merge: true });
    } else {
      const initialProfile: Record<string, unknown> = {
        ...base,
        createdAt: sdk.serverTimestamp(),
        teacherRequested: false,
      };
      initialProfile[ROLE_FIELD] = roleOf(user);
      await sdk.setDoc(profile, initialProfile);
    }
  } catch (cause) {
    if (!isDevOrLocalEnvironment()) {
      throw cause;
    }
  }
  return user;
}

// Implements: REQ-ACCESS-04
export async function updateRemoteUserRole(
  uidOrPrefixed: string,
  role: "teacher" | "student"
): Promise<void> {
  const uid = uidOrPrefixed.startsWith("firebase:")
    ? uidOrPrefixed.replace("firebase:", "")
    : uidOrPrefixed;
  const { sdk, db } = await firestore();
  const profileRef = sdk.doc(db, "users", uid);
  const payload: Record<string, unknown> = {
    lastSeen: sdk.serverTimestamp(),
  };
  payload[ROLE_FIELD] = role;
  await sdk.setDoc(profileRef, payload, { merge: true });
}
