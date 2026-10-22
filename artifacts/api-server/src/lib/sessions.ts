import { db, userSessionsTable, adminSessionsTable } from "@workspace/db";
import { ADMIN_SESSION_TTL_MS, generateToken, hashToken } from "./auth.js";

/** Creates a citizen device session and returns its bearer token. */
export async function createUserSession(userId: string): Promise<string> {
  const token = generateToken();
  await db.insert(userSessionsTable).values({ userId, tokenHash: hashToken(token) });
  return token;
}

/** Creates a dispatcher session and returns its cookie value. */
export async function createAdminSession(
  adminId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_TTL_MS);
  await db
    .insert(adminSessionsTable)
    .values({ adminId, tokenHash: hashToken(token), expiresAt });
  return { token, expiresAt };
}
