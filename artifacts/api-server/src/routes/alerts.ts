import { Router, type IRouter } from "express";
import { db, alertsTable, usersTable } from "@workspace/db";
import { eq, desc, gte, count, and } from "drizzle-orm";
import { CreateAlertBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/", async (req, res) => {
  const parsed = CreateAlertBody.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Invalid input", issues: parsed.error.issues });
    return;
  }
  const data = parsed.data;

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

  res.json(created);
});

router.get("/", async (_req, res) => {
  const rows = await db
    .select({
      alert: alertsTable,
      user: usersTable,
    })
    .from(alertsTable)
    .innerJoin(usersTable, eq(alertsTable.userId, usersTable.id))
    .orderBy(desc(alertsTable.createdAt));

  const result = rows.map((r) => ({ ...r.alert, user: r.user }));
  res.json(result);
});

router.get("/stats", async (_req, res) => {
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

router.get("/user/:userId", async (req, res) => {
  const { userId } = req.params;
  const rows = await db
    .select()
    .from(alertsTable)
    .where(eq(alertsTable.userId, userId))
    .orderBy(desc(alertsTable.createdAt));
  res.json(rows);
});

// Suppress unused import warning for `and`
void and;

export default router;
