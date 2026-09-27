import { getRedisConnection } from "@/lib/queue/client";

export interface DmFormField {
  id: string;
  label: string;
  type: "text" | "phone";
  required: boolean;
}

export interface DmSessionPayload {
  version: 1;
  type: "FORM_SUBMISSION";
  formId: string;
  fields: DmFormField[];
  currentStepIndex: number;
  collectedAnswers: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

const DEFAULT_SESSION_TTL_SECONDS = 1800; // 30 minutes

function buildSessionKey(instagramAccountId: string, recipientUserId: string): string {
  return `session:dm:${instagramAccountId}:${recipientUserId}`;
}

/**
 * Retrieves the conversational DM session from Redis if one exists.
 */
export async function getDmSession(
  instagramAccountId: string,
  recipientUserId: string
): Promise<DmSessionPayload | null> {
  const redis = getRedisConnection();
  const key = buildSessionKey(instagramAccountId, recipientUserId);
  const data = await redis.get(key);

  if (!data) return null;

  try {
    const session = JSON.parse(data) as DmSessionPayload;
    return session;
  } catch (err) {
    console.error(`[DmSession] Error parsing session JSON for key ${key}:`, err);
    return null;
  }
}

/**
 * Saves or updates a conversational DM session in Redis with TTL.
 */
export async function setDmSession(
  instagramAccountId: string,
  recipientUserId: string,
  session: DmSessionPayload,
  ttlSeconds = DEFAULT_SESSION_TTL_SECONDS
): Promise<void> {
  const redis = getRedisConnection();
  const key = buildSessionKey(instagramAccountId, recipientUserId);
  const payload: DmSessionPayload = {
    ...session,
    updatedAt: Date.now(),
  };

  await redis.set(key, JSON.stringify(payload), "EX", ttlSeconds);
}

/**
 * Removes the conversational DM session from Redis upon completion or cancellation.
 */
export async function clearDmSession(
  instagramAccountId: string,
  recipientUserId: string
): Promise<void> {
  const redis = getRedisConnection();
  const key = buildSessionKey(instagramAccountId, recipientUserId);
  await redis.del(key);
}

/**
 * Checks if an active session exists for the user.
 */
export async function isDmSessionActive(
  instagramAccountId: string,
  recipientUserId: string
): Promise<boolean> {
  const redis = getRedisConnection();
  const key = buildSessionKey(instagramAccountId, recipientUserId);
  const exists = await redis.exists(key);
  return exists === 1;
}
