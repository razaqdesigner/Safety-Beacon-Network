import {
  pgTable,
  text,
  uuid,
  timestamp,
  integer,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { adminUsersTable } from "./auth";
import { usersTable } from "./users";

// A message a dispatcher sent to every citizen. Citizens see it in the app's
// notifications inbox; devices with a push token also get a push.
export const broadcastsTable = pgTable(
  "broadcasts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adminId: uuid("admin_id").references(() => adminUsersTable.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    // Push delivery stats, filled in once sending finishes.
    recipientCount: integer("recipient_count").notNull().default(0),
    sentCount: integer("sent_count").notNull().default(0),
    failedCount: integer("failed_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("broadcasts_created_at_idx").on(t.createdAt)],
);

// Per-citizen state of a broadcast in their inbox. No row means unread and
// not cleared.
export const notificationReceiptsTable = pgTable(
  "notification_receipts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    broadcastId: uuid("broadcast_id")
      .notNull()
      .references(() => broadcastsTable.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { withTimezone: true }),
    clearedAt: timestamp("cleared_at", { withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.broadcastId] })],
);

export type Broadcast = typeof broadcastsTable.$inferSelect;
export type NotificationReceipt = typeof notificationReceiptsTable.$inferSelect;
