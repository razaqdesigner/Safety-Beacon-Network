import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, desc, or } from "drizzle-orm";
import { RegisterUserBody, RegisterPushTokenBody } from "@workspace/api-zod";
import { toPublicUser } from "../lib/auth.js";
import { createUserSession } from "../lib/sessions.js";
import { requireAdmin, requireSelfOrAdmin } from "../middlewares/auth.js";

const router: IRouter = Router();

const ALREADY_REGISTERED =
  "An account with these details already exists. Use “Recover your account” to sign in on this device.";

router.post("/register", async (req, res) => {
  const parsed = RegisterUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", issues: parsed.error.issues });
    return;
  }
  const data = parsed.data;

  // Registering must never hand back someone else's existing account.
  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(
      or(
        eq(usersTable.email, data.email),
        eq(usersTable.nationalId, data.nationalId),
        eq(usersTable.phoneNumber, data.phoneNumber),
      ),
    )
    .limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: ALREADY_REGISTERED });
    return;
  }

  let created;
  try {
    [created] = await db
      .insert(usersTable)
      .values({
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        nationalId: data.nationalId,
        email: data.email,
      })
      .returning();
  } catch (err) {
    // A concurrent registration won the unique constraint race.
    if ((err as { cause?: { code?: string } }).cause?.code === "23505") {
      res.status(409).json({ error: ALREADY_REGISTERED });
      return;
    }
    throw err;
  }

  const token = await createUserSession(created.id);
  res.json({ token, user: toPublicUser(created) });
});

router.get("/", requireAdmin, async (_req, res) => {
  const rows = await db
    .select()
    .from(usersTable)
    .orderBy(desc(usersTable.createdAt));
  res.json(rows.map(toPublicUser));
});

router.patch("/:userId/push-token", requireSelfOrAdmin("userId"), async (req, res) => {
  const userId = req.params.userId as string;
  // Only the citizen's own device may set where their notifications go.
  if (req.citizen?.userId !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const parsed = RegisterPushTokenBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", issues: parsed.error.issues });
    return;
  }

  await db
    .update(usersTable)
    .set({ pushToken: parsed.data.pushToken })
    .where(eq(usersTable.id, userId));

  res.status(204).end();
});

router.get("/:userId", requireSelfOrAdmin("userId"), async (req, res) => {
  const userId = req.params.userId as string;
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (rows.length === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(toPublicUser(rows[0]));
});

export default router;
