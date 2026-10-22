import type { NextFunction, Request, RequestHandler, Response } from "express";
import { db, userSessionsTable, adminSessionsTable, adminUsersTable } from "@workspace/db";
import { and, eq, gt } from "drizzle-orm";
import { ADMIN_COOKIE, hashToken, isUuid } from "../lib/auth.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set when the request carries a valid citizen bearer token. */
      citizen?: { userId: string; sessionId: string };
      /** Set when the request carries a valid dispatcher session cookie. */
      admin?: { id: string; email: string; name: string; sessionId: string };
    }
  }
}

const LAST_USED_RESOLUTION_MS = 60 * 60 * 1000;

function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token || null;
}

/**
 * Resolves whichever credentials the request carries. Never rejects on its
 * own — routes opt in with requireCitizen / requireAdmin / requireSelfOrAdmin.
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
  const token = bearerToken(req);
  if (token) {
    const [session] = await db
      .select()
      .from(userSessionsTable)
      .where(eq(userSessionsTable.tokenHash, hashToken(token)))
      .limit(1);
    if (session) {
      req.citizen = { userId: session.userId, sessionId: session.id };
      if (Date.now() - session.lastUsedAt.getTime() > LAST_USED_RESOLUTION_MS) {
        void db
          .update(userSessionsTable)
          .set({ lastUsedAt: new Date() })
          .where(eq(userSessionsTable.id, session.id))
          .catch(() => {});
      }
    }
  }

  const cookie = req.cookies?.[ADMIN_COOKIE];
  if (typeof cookie === "string" && cookie) {
    const [row] = await db
      .select({
        sessionId: adminSessionsTable.id,
        id: adminUsersTable.id,
        email: adminUsersTable.email,
        name: adminUsersTable.name,
      })
      .from(adminSessionsTable)
      .innerJoin(adminUsersTable, eq(adminSessionsTable.adminId, adminUsersTable.id))
      .where(
        and(
          eq(adminSessionsTable.tokenHash, hashToken(cookie)),
          gt(adminSessionsTable.expiresAt, new Date()),
        ),
      )
      .limit(1);
    if (row) req.admin = row;
  }

  next();
};

function unauthorized(res: Response) {
  res.status(401).json({ error: "Authentication required" });
}

export function requireCitizen(req: Request, res: Response, next: NextFunction) {
  if (!req.citizen) return unauthorized(res);
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.admin) return unauthorized(res);
  next();
}

/** Allows a dispatcher, or the citizen whose id is in `req.params[param]`. */
export function requireSelfOrAdmin(param: string): RequestHandler {
  return (req, res, next) => {
    const id = req.params[param];
    if (!isUuid(id)) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (req.admin) return next();
    if (!req.citizen) return unauthorized(res);
    if (req.citizen.userId !== id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}
