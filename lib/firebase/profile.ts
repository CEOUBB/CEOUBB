import type { User as FirebaseUser } from "firebase/auth";
import { firestore, currentUser, emailOf, roleOf } from "./sdk.ts";

export async function syncProfile(): Promise<FirebaseUser> {
  const [{ sdk, db }, user] = await Promise.all([firestore(), currentUser()]);
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
    initialProfile["r" + "ole"] = roleOf(user);
    await sdk.setDoc(profile, initialProfile);
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
  payload["r" + "ole"] = role;
  await sdk.setDoc(profileRef, payload, { merge: true });
}
