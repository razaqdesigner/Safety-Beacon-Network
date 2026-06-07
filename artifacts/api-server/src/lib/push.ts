import { logger } from "./logger.js";

interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  sound?: "default";
  data?: Record<string, unknown>;
}

/**
 * Sends a push notification to an Expo push token via the Expo Push API.
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

  try {
    const res = await fetch("https://exp.host/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(message),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logger.warn({ token, status: res.status, body: text }, "Expo push non-OK response");
      return;
    }

    const json = (await res.json()) as { data?: { status?: string; message?: string }[] };
    const ticket = json?.data?.[0];
    if (ticket?.status === "error") {
      logger.warn({ token, error: ticket.message }, "Expo push ticket error");
    } else {
      logger.info({ token }, "Push notification sent");
    }
  } catch (err) {
    logger.warn({ err, token }, "Push notification failed — continuing");
  }
}
