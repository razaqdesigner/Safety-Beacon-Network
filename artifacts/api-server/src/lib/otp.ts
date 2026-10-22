import { logger } from "./logger.js";
import { maskEmail, maskPhone } from "./auth.js";

export type OtpChannel = "sms" | "email" | "console";

export class OtpDeliveryUnavailableError extends Error {
  constructor() {
    super("No one-time code delivery provider is configured");
  }
}

const isProduction = process.env.NODE_ENV === "production";

function twilioConfig() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  return sid && token && from ? { sid, token, from } : null;
}

function resendConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.OTP_EMAIL_FROM;
  return apiKey && from ? { apiKey, from } : null;
}

async function sendSms(to: string, body: string): Promise<void> {
  const cfg = twilioConfig()!;
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${cfg.sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${cfg.sid}:${cfg.token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: cfg.from, Body: body }),
    },
  );
  if (!res.ok) {
    throw new Error(`Twilio responded ${res.status}: ${await res.text().catch(() => "")}`);
  }
}

async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  const cfg = resendConfig()!;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: cfg.from, to: [to], subject, text }),
  });
  if (!res.ok) {
    throw new Error(`Resend responded ${res.status}: ${await res.text().catch(() => "")}`);
  }
}

/**
 * Delivers a recovery code to the citizen's registered phone (preferred) or
 * email. In development with no provider configured the code is logged so the
 * flow can be exercised locally; in production that case throws.
 */
export async function deliverOtp(
  user: { phoneNumber: string; email: string },
  code: string,
): Promise<{ channel: OtpChannel; destination: string }> {
  const message = `Your SafeAlert code is ${code}. It expires in 10 minutes. Never share it with anyone.`;

  if (twilioConfig()) {
    await sendSms(user.phoneNumber, message);
    return { channel: "sms", destination: maskPhone(user.phoneNumber) };
  }
  if (resendConfig()) {
    await sendEmail(user.email, "Your SafeAlert recovery code", message);
    return { channel: "email", destination: maskEmail(user.email) };
  }
  if (!isProduction) {
    logger.warn({ code }, "DEV ONLY — recovery code (configure Twilio or Resend to deliver it)");
    return { channel: "console", destination: "the API server log" };
  }
  throw new OtpDeliveryUnavailableError();
}
