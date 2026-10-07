import { z } from "zod";

// Implements: REQ-PERF-LOAD-01 REQ-CFG-02
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_CONTENT_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export const NOTIFICATION_CHANNELS = [
  "sectionPublications",
  "teacherAnnouncements",
  "gradeChanges",
  "assessmentReminders",
] as const;

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];
export type ChannelPreference = { web: boolean; push: boolean };
export type UserPreferences = {
  channels: Record<NotificationChannel, ChannelPreference>;
  reducedMotion: boolean;
};

const channelPreferenceSchema = z.object({ web: z.boolean(), push: z.boolean() });

// Implements: REQ-CFG-04
export const preferencesSchema = z.strictObject({
  channels: z.strictObject({
    sectionPublications: channelPreferenceSchema,
    teacherAnnouncements: channelPreferenceSchema,
    gradeChanges: channelPreferenceSchema,
    assessmentReminders: channelPreferenceSchema,
  }),
  reducedMotion: z.boolean(),
});

// Implements: REQ-CFG-04
export function defaultPreferences(): UserPreferences {
  const channels = {} as Record<NotificationChannel, ChannelPreference>;

  for (const channel of NOTIFICATION_CHANNELS) {
    channels[channel] = { web: true, push: true };
  }
  return { channels, reducedMotion: false };
}

export function firebaseUid(value: string): string {
  return value.startsWith("firebase:") ? value.slice("firebase:".length) : value;
}

// Implements: REQ-CFG-02 REQ-SEC-12
export function detectImageMagicBytes(
  buffer: ArrayBuffer
): "image/jpeg" | "image/png" | "image/webp" | null {
  if (!buffer || buffer.byteLength < 12) return null;
  const bytes = new Uint8Array(buffer.slice(0, 12));

  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}
