import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { RegisterUserBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/register", async (req, res) => {
  const parsed = RegisterUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", issues: parsed.error.issues });
    return;
  }
  const data = parsed.data;

  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, data.email))
    .limit(1);

  if (existing.length > 0) {
    res.json(existing[0]);
    return;
  }

  const [created] = await db
    .insert(usersTable)
    .values({
      fullName: data.fullName,
      phoneNumber: data.phoneNumber,
      nationalId: data.nationalId,
      email: data.email,
    })
    .returning();

  res.json(created);
});

router.get("/", async (_req, res) => {
  const rows = await db
    .select()
    .from(usersTable)
    .orderBy(desc(usersTable.createdAt));
  res.json(rows);
});

router.get("/:userId", async (req, res) => {
  const { userId } = req.params;
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (rows.length === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(rows[0]);
});

export default router;
