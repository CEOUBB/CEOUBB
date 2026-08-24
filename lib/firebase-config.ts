export type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

export const FIREBASE_CONFIG_REQUIREMENT = "Implements: REQ-STG-01, REQ-STG-04";

export const PRODUCTION_FIREBASE_CONFIG: FirebaseClientConfig = Object.freeze({
  apiKey: "AIzaSyDpFz07hwK_6gV7CPxmyq_P3DfkjKaAFKU",
  authDomain: "centro-de-estudio-ubb.firebaseapp.com",
  projectId: "centro-de-estudio-ubb",
  storageBucket: "centro-de-estudio-ubb.firebasestorage.app",
  messagingSenderId: "411177916202",
  appId: "1:411177916202:web:57986cb2e14d676fe93053",
});

type FirebaseEnvironment = {
  CEOUBB_ENVIRONMENT?: string;
  NEXT_PUBLIC_FIREBASE_API_KEY?: string;
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?: string;
  NEXT_PUBLIC_FIREBASE_PROJECT_ID?: string;
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?: string;
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?: string;
  NEXT_PUBLIC_FIREBASE_APP_ID?: string;
};

export function resolveFirebaseConfig(environment: FirebaseEnvironment): FirebaseClientConfig {
  const selected = {
    apiKey: environment.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() ?? "",
    authDomain: environment.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() ?? "",
    projectId: environment.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ?? "",
    storageBucket: environment.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() ?? "",
    messagingSenderId: environment.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim() ?? "",
    appId: environment.NEXT_PUBLIC_FIREBASE_APP_ID?.trim() ?? "",
  };
  const environmentName = environment.CEOUBB_ENVIRONMENT?.trim().toLowerCase() ?? "";
  const configuredValues = Object.values(selected).filter(Boolean).length;

  if ((!environmentName || environmentName === "production") && configuredValues === 0) {
    return PRODUCTION_FIREBASE_CONFIG;
  }
  if (configuredValues !== Object.keys(selected).length) {
    throw new Error("STAGING_CONFIG_INCOMPLETE: la configuración Firebase debe estar completa.");
  }
  if (environmentName === "staging" && selected.projectId !== "centro-de-estudio-ubb-staging") {
    throw new Error(
      "PRODUCTION_TARGET_REJECTED: NEXT_PUBLIC_FIREBASE_PROJECT_ID no identifica staging."
    );
  }
  if (selected.projectId === "centro-de-estudio-ubb-staging" && environmentName !== "staging") {
    throw new Error("STAGING_ENV_REQUIRED: NEXT_PUBLIC_CEOUBB_ENVIRONMENT debe ser staging.");
  }
  if (environmentName === "production" && selected.projectId !== "centro-de-estudio-ubb") {
    throw new Error(
      "PRODUCTION_TARGET_REJECTED: NEXT_PUBLIC_FIREBASE_PROJECT_ID no identifica producción."
    );
  }
  return selected;
}

export function firebaseConfigFromEnvironment(): FirebaseClientConfig {
  return resolveFirebaseConfig({
    CEOUBB_ENVIRONMENT: process.env.NEXT_PUBLIC_CEOUBB_ENVIRONMENT,
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });
}
