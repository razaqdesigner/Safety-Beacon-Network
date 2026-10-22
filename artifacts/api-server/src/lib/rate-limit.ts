import type { Request } from "express";
import { rateLimit } from "express-rate-limit";

// Recovery and admin-login limits are keyed by the identifier being tried
// rather than by IP: behind Replit's proxy chain many clients can share one
// apparent IP, and an IP-keyed limit would lock them all out together.

function bodyField(req: Request, key: string): string {
  const value = (req.body as Record<string, unknown> | undefined)?.[key];
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

const common = {
  standardHeaders: "draft-8",
  legacyHeaders: false,
  validate: { trustProxy: false },
} as const;

/** At most 5 codes per account per hour — also stops SMS/email bombing. */
export const recoverStartLimiter = rateLimit({
  ...common,
  windowMs: 60 * 60 * 1000,
  limit: 5,
  keyGenerator: (req) =>
    `recover:${bodyField(req, "phone") || "-"}:${bodyField(req, "nationalId") || "-"}`,
  message: { error: "Too many codes requested. Try again in an hour." },
});

export const recoverVerifyLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 20,
  keyGenerator: (req) => `verify:${bodyField(req, "challengeId")}`,
  message: { error: "Too many attempts. Request a new code." },
});

export const adminLoginLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) => `admin-login:${bodyField(req, "email")}`,
  message: { error: "Too many sign-in attempts. Try again in 15 minutes." },
});
