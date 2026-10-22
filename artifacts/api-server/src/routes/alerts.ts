import { Router, type IRouter } from "express";
import { db, alertsTable, usersTable } from "@workspace/db";
import { eq, desc, gte, count } from "drizzle-orm";
import { CreateAlertBody } from "@workspace/api-zod";
import { isUuid, toPublicUser } from "../lib/auth.js";
import { sendPushNotification } from "../lib/push.js";
import { requireAdmin, requireCitizen, requireSelfOrAdmin } from "../middlewares/auth.js";

const router: IRouter = Router();

router.post("/", requireCitizen, async (req, res) => {
  const parsed = CreateAlertBody.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Invalid input", issues: parsed.error.issues });
    return;
  }
  const data = parsed.data;
  if (data.userId !== req.citizen!.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const userExists = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.id, data.userId))
    .limit(1);
  if (userExists.length === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [created] = await db
    .insert(alertsTable)
    .values({
      userId: data.userId,
      latitude: data.latitude,
      longitude: data.longitude,
      accuracy: data.accuracy ?? null,
      triggerSource: data.triggerSource,
    })
    .returning();

  req.log.info(
    { alertId: created.id, userId: created.userId, source: created.triggerSource },
    "Distress alert created",
  );

  // Fire push notification — non-blocking, errors are swallowed inside sendPushNotification
  const [userRow] = await db
    .select({ pushToken: usersTable.pushToken })
    .from(usersTable)
    .where(eq(usersTable.id, created.userId))
    .limit(1);

  void sendPushNotification(
    userRow?.pushToken,
    "🚨 Alert sent — help is on the way",
    "Your distress signal reached dispatchers. Stay on the line.",
    { alertId: created.id },
  );

  res.json(created);
});

router.get("/", requireAdmin, async (_req, res) => {
  const rows = await db
    .select({
      alert: alertsTable,
      user: usersTable,
    })
    .from(alertsTable)
    .innerJoin(usersTable, eq(alertsTable.userId, usersTable.id))
    .orderBy(desc(alertsTable.createdAt));

  const result = rows.map((r) => ({ ...r.alert, user: toPublicUser(r.user) }));
  res.json(result);
});

router.get("/stats", requireAdmin, async (_req, res) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [totalAlertsRow] = await db
    .select({ value: count() })
    .from(alertsTable);
  const [activeAlertsRow] = await db
    .select({ value: count() })
    .from(alertsTable)
    .where(eq(alertsTable.status, "active"));
  const [last24Row] = await db
    .select({ value: count() })
    .from(alertsTable)
    .where(gte(alertsTable.createdAt, since));
  const [usersRow] = await db.select({ value: count() }).from(usersTable);

  res.json({
    totalAlerts: totalAlertsRow.value,
    activeAlerts: activeAlertsRow.value,
    alertsLast24h: last24Row.value,
    totalUsers: usersRow.value,
  });
});

router.get("/user/:userId", requireSelfOrAdmin("userId"), async (req, res) => {
  const userId = req.params.userId as string;
  const rows = await db
    .select()
    .from(alertsTable)
    .where(eq(alertsTable.userId, userId))
    .orderBy(desc(alertsTable.createdAt));
  res.json(rows);
});

router.patch("/:alertId/resolve", requireAdmin, async (req, res) => {
  const alertId = req.params.alertId as string;
  if (!isUuid(alertId)) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }

  const [existing] = await db
    .select({ id: alertsTable.id, status: alertsTable.status })
    .from(alertsTable)
    .where(eq(alertsTable.id, alertId))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }

  const [updated] = await db
    .update(alertsTable)
    .set({ status: "resolved" })
    .where(eq(alertsTable.id, alertId))
    .returning();

  req.log.info({ alertId: updated.id, adminId: req.admin!.id }, "Alert resolved by dispatcher");
  res.json(updated);
});

export default router;
