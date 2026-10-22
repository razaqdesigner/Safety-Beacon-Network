import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { db, usersTable, otpChallengesTable, userSessionsTable } from "@workspace/db";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import { StartRecoveryBody, VerifyRecoveryBody } from "@workspace/api-zod";
import {
  generateOtpCode,
  hashOtpCode,
  isUuid,
  safeEqualHex,
  toPublicUser,
} from "../lib/auth.js";
import { deliverOtp, OtpDeliveryUnavailableError } from "../lib/otp.js";
import { createUserSession } from "../lib/sessions.js";
import { recoverStartLimiter, recoverVerifyLimiter } from "../lib/rate-limit.js";
import { requireCitizen } from "../middlewares/auth.js";

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const router: IRouter = Router();

router.post("/recover", recoverStartLimiter, async (req, res) => {
  const parsed = StartRecoveryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", issues: parsed.error.issues });
    return;
  }
  const phone = parsed.data.phone?.trim();
  const nationalId = parsed.data.nationalId?.trim();
  if (!phone && !nationalId) {
    res.status(400).json({ error: "Provide phone or nationalId" });
    return;
  }

  const conditions = [];
  if (phone) conditions.push(eq(usersTable.phoneNumber, phone));
  if (nationalId) conditions.push(eq(usersTable.nationalId, nationalId));

  const [user] = await db
    .select()
    .from(usersTable)
    .where(conditions.length === 1 ? conditions[0] : or(...conditions))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "No matching user found" });
    return;
  }

  // Only the newest code is ever valid.
  await db
    .update(otpChallengesTable)
    .set({ consumedAt: new Date() })
    .where(and(eq(otpChallengesTable.userId, user.id), isNull(otpChallengesTable.consumedAt)));

  const challengeId = randomUUID();
  const code = generateOtpCode();
  await db.insert(otpChallengesTable).values({
    id: challengeId,
    userId: user.id,
    codeHash: hashOtpCode(challengeId, code),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });

  try {
    const delivery = await deliverOtp(user, code);
    req.log.info({ userId: user.id, channel: delivery.channel }, "Recovery code sent");
    res.json({ challengeId, ...delivery });
  } catch (err) {
    await db.delete(otpChallengesTable).where(eq(otpChallengesTable.id, challengeId));
    if (err instanceof OtpDeliveryUnavailableError) {
      req.log.error("Recovery requested but no OTP provider is configured");
      res.status(503).json({ error: "Account recovery is temporarily unavailable." });
      return;
    }
    req.log.error({ err }, "Recovery code delivery failed");
    res.status(502).json({ error: "We couldn't send your code. Please try again." });
  }
});

router.post("/recover/verify", recoverVerifyLimiter, async (req, res) => {
  const parsed = VerifyRecoveryBody.safeParse(req.body);
  if (!parsed.success || !isUuid(parsed.data.challengeId)) {
    res.status(400).json({ error: "Enter the 6-digit code we sent you" });
    return;
  }
  const { challengeId, code } = parsed.data;

  const [challenge] = await db
    .select()
    .from(otpChallengesTable)
    .where(eq(otpChallengesTable.id, challengeId))
    .limit(1);

  if (
    !challenge ||
    challenge.consumedAt ||
    challenge.expiresAt.getTime() < Date.now() ||
    challenge.attempts >= OTP_MAX_ATTEMPTS
  ) {
    res.status(400).json({ error: "This code is no longer valid. Request a new one." });
    return;
  }

  if (!safeEqualHex(hashOtpCode(challengeId, code), challenge.codeHash)) {
    await db
      .update(otpChallengesTable)
      .set({ attempts: sql`${otpChallengesTable.attempts} + 1` })
      .where(eq(otpChallengesTable.id, challengeId));
    const remaining = OTP_MAX_ATTEMPTS - challenge.attempts - 1;
    res.status(400).json({
      error:
        remaining > 0
          ? `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} left.`
          : "Incorrect code. Request a new one.",
    });
    return;
  }

  // Consume atomically so two concurrent requests can't both succeed.
  const consumed = await db
    .update(otpChallengesTable)
    .set({ consumedAt: new Date() })
    .where(and(eq(otpChallengesTable.id, challengeId), isNull(otpChallengesTable.consumedAt)))
    .returning({ id: otpChallengesTable.id });
  if (consumed.length === 0) {
    res.status(400).json({ error: "This code is no longer valid. Request a new one." });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, challenge.userId))
    .limit(1);
  if (!user) {
    res.status(400).json({ error: "This code is no longer valid. Request a new one." });
    return;
  }

  const token = await createUserSession(user.id);
  req.log.info({ userId: user.id }, "Account recovered on new device");
  res.json({ token, user: toPublicUser(user) });
});

router.post("/logout", requireCitizen, async (req, res) => {
  await db.delete(userSessionsTable).where(eq(userSessionsTable.id, req.citizen!.sessionId));
  res.status(204).end();
});

export default router;
