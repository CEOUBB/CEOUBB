import { z } from "zod";
import type { AccountRole } from "./access-policy";

// Implements: REQ-AUTH-04, REQ-AUTH-05, REQ-AUTH-06
export const DevLoginSchema = z.object({
  role: z.enum(["student", "teacher"]),
});

export type DevLoginInput = z.infer<typeof DevLoginSchema>;

export type DevTestUser = {
  id: string;
  email: string;
  name: string;
  role: Extract<AccountRole, "student" | "teacher">;
};

// Implements: REQ-AUTH-05
export const DEV_TEST_USERS: Record<"student" | "teacher", DevTestUser> = {
  student: {
    id: "dev:student-demo",
    email: "estudiante.demo@alumnos.ubiobio.cl",
    name: "Estudiante Demo",
    role: "student",
  },
  teacher: {
    id: "dev:teacher-demo",
    email: "docente.demo@ubiobio.cl",
    name: "Docente Demo",
    role: "teacher",
  },
};

// Implements: REQ-AUTH-04, REQ-AUTH-06
export function isDevOrPreviewAuthAllowed(
  environment = process.env.NEXT_PUBLIC_CEOUBB_ENVIRONMENT ||
    process.env.CEOUBB_ENVIRONMENT ||
    process.env.VERCEL_ENV,
  nodeEnv = process.env.NODE_ENV,
  host?: string
): boolean {
  if (host) {
    const cleanHost = host.split(":")[0]?.toLowerCase();
    if (cleanHost === "ceoubb.com" || cleanHost === "www.ceoubb.com") {
      return false;
    }
    if (cleanHost.endsWith(".workers.dev") || cleanHost === "staging.ceoubb.com") {
      return true;
    }
  }
  if (environment === "production") return false;
  return nodeEnv === "development" || environment === "preview" || environment === "staging";
}
