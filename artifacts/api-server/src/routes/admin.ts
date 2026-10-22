import { Router, type IRouter, type CookieOptions } from "express";
import { db, adminUsersTable, adminSessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { AdminLoginBody } from "@workspace/api-zod";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_TTL_MS,
  getDummyPasswordHash,
  hashToken,
  verifyPassword,
} from "../lib/auth.js";
import { createAdminSession } from "../lib/sessions.js";
import { adminLoginLimiter } from "../lib/rate-limit.js";
import { requireAdmin } from "../middlewares/auth.js";

const router: IRouter = Router();

const cookieOptions: CookieOptions = {
  httpOnly: true,
  // Lax keeps the cookie off cross-site POST/PATCH requests (CSRF).
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/api",
};

router.post("/login", adminLoginLimiter, async (req, res) => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter your email and password" });
    return;
  }
  const email = parsed.data.email.trim().toLowerCase();

  const [admin] = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.email, email))
    .limit(1);

  // Always run a hash comparison so response time doesn't reveal which
  // emails belong to dispatchers.
  const ok = await verifyPassword(
    parsed.data.password,
    admin?.passwordHash ?? (await getDummyPasswordHash()),
  );
  if (!admin || !ok) {
    res.status(401).json({ error: "Wrong email or password" });
    return;
  }

  const { token } = await createAdminSession(admin.id);
  res.cookie(ADMIN_COOKIE, token, { ...cookieOptions, maxAge: ADMIN_SESSION_TTL_MS });
  req.log.info({ adminId: admin.id }, "Dispatcher signed in");
  res.json({ id: admin.id, email: admin.email, name: admin.name });
});

router.post("/logout", async (req, res) => {
  const cookie = req.cookies?.[ADMIN_COOKIE];
  if (typeof cookie === "string" && cookie) {
    await db
      .delete(adminSessionsTable)
      .where(eq(adminSessionsTable.tokenHash, hashToken(cookie)));
  }
  res.clearCookie(ADMIN_COOKIE, cookieOptions);
  res.status(204).end();
});

router.get("/me", requireAdmin, (req, res) => {
  const { id, email, name } = req.admin!;
  res.json({ id, email, name });
});

export default router;
