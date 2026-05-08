import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, sql, ne } from "drizzle-orm";
import { createHash } from "node:crypto";

const router = Router();

const ADMIN_USER_IDS = [4];
const hash = (pass: string) => createHash("sha256").update(pass).digest("hex");

function requireAdmin(req: any, res: any, next: any) {
  if (!ADMIN_USER_IDS.includes(req.currentUserId)) {
    return res.status(403).json({ error: "Доступ запрещён" });
  }
  next();
}

router.get("/admin/users", requireAdmin, async (req, res) => {
  try {
    const rows = await db.execute(
      sql`SELECT id, username, display_name, avatar_color, avatar_url, status, balance, created_at, is_verified FROM users ORDER BY id`
    );
    res.json(rows.rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/admin/give-currency", requireAdmin, async (req, res) => {
  try {
    const { userId, amount } = req.body;
    if (!userId || typeof amount !== "number") {
      return res.status(400).json({ error: "Укажите userId и amount" });
    }
    const target = await db.query.usersTable.findFirst({ where: eq(usersTable.id, Number(userId)) });
    if (!target) return res.status(404).json({ error: "Пользователь не найден" });

    await db.execute(sql`UPDATE users SET balance = balance + ${amount} WHERE id = ${Number(userId)}`);
    const rows = await db.execute(sql`SELECT balance FROM users WHERE id = ${Number(userId)}`);
    const newBalance = Number((rows.rows[0] as any).balance);

    res.json({
      success: true,
      userId: Number(userId),
      username: target.username,
      displayName: target.displayName,
      amount,
      newBalance,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/admin/set-balance", requireAdmin, async (req, res) => {
  try {
    const { userId, balance } = req.body;
    if (!userId || typeof balance !== "number" || balance < 0) {
      return res.status(400).json({ error: "Укажите userId и balance (≥0)" });
    }
    const target = await db.query.usersTable.findFirst({ where: eq(usersTable.id, Number(userId)) });
    if (!target) return res.status(404).json({ error: "Пользователь не найден" });

    await db.execute(sql`UPDATE users SET balance = ${balance} WHERE id = ${Number(userId)}`);
    res.json({ success: true, userId: Number(userId), username: target.username, balance });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/admin/reset-password", requireAdmin, async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword) {
      return res.status(400).json({ error: "Укажите userId и newPassword" });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: "Пароль должен быть не менее 6 символов" });
    }
    const target = await db.query.usersTable.findFirst({ where: eq(usersTable.id, Number(userId)) });
    if (!target) return res.status(404).json({ error: "Пользователь не найден" });

    await db.execute(sql`UPDATE users SET password_hash = ${hash(String(newPassword))} WHERE id = ${Number(userId)}`);
    res.json({ success: true, message: `Пароль пользователя @${target.username} сброшен` });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.delete("/admin/users/:userId", requireAdmin, async (req, res) => {
  try {
    const targetId = Number(req.params.userId);
    if (!targetId || targetId === req.currentUserId) {
      return res.status(400).json({ error: "Нельзя удалить этого пользователя" });
    }
    const target = await db.query.usersTable.findFirst({ where: eq(usersTable.id, targetId) });
    if (!target) return res.status(404).json({ error: "Пользователь не найден" });

    await db.execute(sql`DELETE FROM contacts WHERE user_id = ${targetId} OR contact_id = ${targetId}`);
    await db.execute(sql`DELETE FROM story_views WHERE viewer_id = ${targetId}`);
    await db.execute(sql`DELETE FROM story_views WHERE story_id IN (SELECT id FROM stories WHERE user_id = ${targetId})`);
    await db.execute(sql`DELETE FROM stories WHERE user_id = ${targetId}`);
    await db.execute(sql`DELETE FROM chat_members WHERE user_id = ${targetId}`);
    await db.execute(sql`UPDATE messages SET sender_id = NULL WHERE sender_id = ${targetId}`);
    await db.execute(sql`DELETE FROM gifts WHERE sender_id = ${targetId} OR receiver_id = ${targetId}`);
    await db.execute(sql`UPDATE calls SET caller_id = ${targetId} WHERE caller_id = ${targetId}`);
    await db.execute(sql`DELETE FROM users WHERE id = ${targetId}`);

    res.json({ success: true, message: `Пользователь @${target.username} удалён` });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/admin/set-verified", requireAdmin, async (req, res) => {
  try {
    const { userId, isVerified } = req.body;
    if (!userId) return res.status(400).json({ error: "Укажите userId" });
    await db.execute(sql`UPDATE users SET is_verified = ${!!isVerified} WHERE id = ${Number(userId)}`);
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.get("/admin/stats", requireAdmin, async (req, res) => {
  try {
    const totals = await db.execute(
      sql`SELECT COUNT(*) as total_users, SUM(balance) as total_spark FROM users`
    );
    const row = totals.rows[0] as any;
    res.json({
      totalUsers: Number(row.total_users),
      totalSpark: Number(row.total_spark || 0),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

export default router;
