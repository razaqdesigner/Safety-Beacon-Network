import { db, adminUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword } from "./auth.js";
import { logger } from "./logger.js";

/**
 * Creates the first dispatcher account from ADMIN_BOOTSTRAP_EMAIL /
 * ADMIN_BOOTSTRAP_PASSWORD (set them as Replit Secrets or in `.env`). Does
 * nothing if they are unset or that account already exists — an existing
 * account's password is never overwritten. Remove the secrets after first
 * sign-in.
 */
export async function ensureBootstrapAdmin(): Promise<void> {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!email || !password) return;

  if (password.length < 12) {
    logger.error("ADMIN_BOOTSTRAP_PASSWORD must be at least 12 characters; dispatcher not created");
    return;
  }

  const [existing] = await db
    .select({ id: adminUsersTable.id })
    .from(adminUsersTable)
    .where(eq(adminUsersTable.email, email))
    .limit(1);
  if (existing) return;

  await db.insert(adminUsersTable).values({
    email,
    name: process.env.ADMIN_BOOTSTRAP_NAME?.trim() || "Dispatcher",
    passwordHash: await hashPassword(password),
  });
  logger.info({ email }, "Bootstrap dispatcher account created");
}
