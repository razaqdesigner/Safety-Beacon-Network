import { Router, type IRouter } from "express";
import {
  db,
  broadcastsTable,
  usersTable,
  adminUsersTable,
  notificationReceiptsTable as receipts,
} from "@workspace/db";
import { and, count, desc, eq, gte, inArray, isNotNull, isNull, sql, type SQL } from "drizzle-orm";
import { CreateBroadcastBody } from "@workspace/api-zod";
import { isUuid } from "../lib/auth.js";
import { sendPushBatch, type ExpoMessage } from "../lib/push.js";
import { requireAdmin, requireCitizen } from "../middlewares/auth.js";

const router: IRouter = Router();

router.post("/broadcasts", requireAdmin, async (req, res) => {
  const parsed = CreateBroadcastBody.safeParse(req.body);
  const title = parsed.success ? parsed.data.title.trim() : "";
  const body = parsed.success ? parsed.data.body.trim() : "";
  if (!title || !body) {
    res.status(400).json({ error: "A title (max 65 characters) and message (max 240) are required" });
    return;
  }
  const admin = req.admin!;

  const [broadcast] = await db
    .insert(broadcastsTable)
    .values({ adminId: admin.id, title, body })
    .returning();

  const recipients = await db
    .select({ pushToken: usersTable.pushToken })
    .from(usersTable)
    .where(isNotNull(usersTable.pushToken));

  const messages: ExpoMessage[] = recipients.map((r) => ({
    to: r.pushToken!,
    title,
    body,
    sound: "default",
    data: { type: "broadcast", broadcastId: broadcast.id },
  }));
  const result = await sendPushBatch(messages);

  if (result.invalidTokens.length > 0) {
    await db
      .update(usersTable)
      .set({ pushToken: null })
      .where(inArray(usersTable.pushToken, result.invalidTokens));
  }

  const [updated] = await db
    .update(broadcastsTable)
    .set({
      recipientCount: messages.length,
      sentCount: result.sent,
      failedCount: result.failed,
    })
    .where(eq(broadcastsTable.id, broadcast.id))
    .returning();

  req.log.info(
    { broadcastId: updated.id, adminId: admin.id, recipients: messages.length, sent: result.sent },
    "Broadcast sent",
  );
  res.json({ ...updated, sentByName: admin.name });
});

router.get("/broadcasts", requireAdmin, async (_req, res) => {
  const rows = await db
    .select({ broadcast: broadcastsTable, sentByName: adminUsersTable.name })
    .from(broadcastsTable)
    .leftJoin(adminUsersTable, eq(broadcastsTable.adminId, adminUsersTable.id))
    .orderBy(desc(broadcastsTable.createdAt))
    .limit(100);
  res.json(rows.map((r) => ({ ...r.broadcast, sentByName: r.sentByName })));
});

router.get("/broadcasts/reach", requireAdmin, async (_req, res) => {
  const [total] = await db.select({ value: count() }).from(usersTable);
  const [push] = await db
    .select({ value: count() })
    .from(usersTable)
    .where(isNotNull(usersTable.pushToken));
  res.json({ totalUsers: total.value, pushEnabledUsers: push.value });
});

// ── Citizen inbox ──

async function joinedAt(userId: string): Promise<Date | null> {
  const [user] = await db
    .select({ createdAt: usersTable.createdAt })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  return user?.createdAt ?? null;
}

/**
 * A citizen's inbox: broadcasts sent since they joined that they haven't
 * cleared. Every inbox route goes through this so they agree on visibility.
 */
function inbox(userId: string, since: Date, extra?: SQL) {
  return db
    .select({
      id: broadcastsTable.id,
      title: broadcastsTable.title,
      body: broadcastsTable.body,
      createdAt: broadcastsTable.createdAt,
      readAt: receipts.readAt,
    })
    .from(broadcastsTable)
    .leftJoin(
      receipts,
      and(eq(receipts.broadcastId, broadcastsTable.id), eq(receipts.userId, userId)),
    )
    .where(and(gte(broadcastsTable.createdAt, since), isNull(receipts.clearedAt), extra))
    .orderBy(desc(broadcastsTable.createdAt));
}

function toCitizenNotification(row: { id: string; title: string; body: string; createdAt: Date; readAt: Date | null }) {
  const { readAt, ...rest } = row;
  return { ...rest, read: readAt !== null };
}

/** Marks the given broadcasts read for this citizen, keeping any earlier read time. */
async function markRead(userId: string, broadcastIds: string[]): Promise<void> {
  if (broadcastIds.length === 0) return;
  const now = new Date();
  await db
    .insert(receipts)
    .values(broadcastIds.map((broadcastId) => ({ userId, broadcastId, readAt: now })))
    .onConflictDoUpdate({
      target: [receipts.userId, receipts.broadcastId],
      set: { readAt: sql`coalesce(${receipts.readAt}, excluded.read_at)` },
    });
}

router.get("/notifications", requireCitizen, async (req, res) => {
  const since = await joinedAt(req.citizen!.userId);
  if (!since) {
    res.json([]);
    return;
  }
  const rows = await inbox(req.citizen!.userId, since).limit(50);
  res.json(rows.map(toCitizenNotification));
});

router.post("/notifications/read-all", requireCitizen, async (req, res) => {
  const userId = req.citizen!.userId;
  const since = await joinedAt(userId);
  if (since) {
    const unread = await inbox(userId, since, isNull(receipts.readAt));
    await markRead(userId, unread.map((r) => r.id));
  }
  res.status(204).end();
});

router.post("/notifications/clear-read", requireCitizen, async (req, res) => {
  const cleared = await db
    .update(receipts)
    .set({ clearedAt: new Date() })
    .where(
      and(
        eq(receipts.userId, req.citizen!.userId),
        isNotNull(receipts.readAt),
        isNull(receipts.clearedAt),
      ),
    )
    .returning({ id: receipts.broadcastId });
  res.json({ cleared: cleared.length });
});

/** One notification from the caller's inbox, or null if it isn't in it. */
async function findInInbox(userId: string, id: unknown) {
  if (!isUuid(id)) return null;
  const since = await joinedAt(userId);
  if (!since) return null;
  const [row] = await inbox(userId, since, eq(broadcastsTable.id, id)).limit(1);
  return row ?? null;
}

router.get("/notifications/:notificationId", requireCitizen, async (req, res) => {
  const row = await findInInbox(req.citizen!.userId, req.params.notificationId);
  if (!row) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }
  res.json(toCitizenNotification(row));
});

router.post("/notifications/:notificationId/read", requireCitizen, async (req, res) => {
  const row = await findInInbox(req.citizen!.userId, req.params.notificationId);
  if (!row) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }
  await markRead(req.citizen!.userId, [row.id]);
  res.status(204).end();
});

export default router;
