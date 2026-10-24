import { logger } from "./logger.js";

export interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  sound?: "default";
  data?: Record<string, unknown>;
}

interface ExpoTicket {
  status?: "ok" | "error";
  message?: string;
  details?: { error?: string };
}

export interface PushResult {
  sent: number;
  failed: number;
  /** Tokens Expo reported as no longer registered; safe to forget. */
  invalidTokens: string[];
}

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
// Expo accepts at most 100 messages per request.
const BATCH_SIZE = 100;

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "Accept-Encoding": "gzip, deflate",
  };
  // Only needed if "enhanced push security" is enabled for the Expo project.
  if (process.env.EXPO_ACCESS_TOKEN) {
    h.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
  }
  return h;
}

/**
 * Sends many push notifications via the Expo Push API in batches. Never
 * throws: a failed batch is counted as failed and logged.
 */
export async function sendPushBatch(messages: ExpoMessage[]): Promise<PushResult> {
  const result: PushResult = { sent: 0, failed: 0, invalidTokens: [] };

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(batch),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        logger.warn({ status: res.status, body: text, count: batch.length }, "Expo push non-OK response");
        result.failed += batch.length;
        continue;
      }
      const json = (await res.json()) as { data?: ExpoTicket[] };
      batch.forEach((msg, idx) => {
        const ticket = json.data?.[idx];
        if (ticket?.status === "ok") {
          result.sent++;
          return;
        }
        result.failed++;
        if (ticket?.details?.error === "DeviceNotRegistered") {
          result.invalidTokens.push(msg.to);
        } else {
          logger.warn({ token: msg.to, error: ticket?.message }, "Expo push ticket error");
        }
      });
    } catch (err) {
      logger.warn({ err, count: batch.length }, "Push batch failed — continuing");
      result.failed += batch.length;
    }
  }

  return result;
}

/**
 * Sends a push notification to a single Expo push token.
 * Fire-and-forget: logs errors but never throws, so a failed push never
 * interrupts the alert creation response.
 */
export async function sendPushNotification(
  token: string | null | undefined,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  if (!token) return;

  const message: ExpoMessage = { to: token, title, body, sound: "default" };
  if (data) message.data = data;

  const { sent } = await sendPushBatch([message]);
  if (sent) logger.info({ token }, "Push notification sent");
}
