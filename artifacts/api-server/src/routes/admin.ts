import { Router } from "express";
import { db, usersTable, messagesTable, chatsTable, chatMembersTable, giftsTable, callsTable } from "@workspace/db";
import { eq, sql, ne } from "drizzle-orm";
import { createHash } from "node:crypto";

const router = Router();

const ADMIN_USER_IDS = [4];
const hash = (pass: string) => createHash("sha256").update(pass).digest("hex");

async function isAdminUser(userId: number): Promise<boolean> {
  if (ADMIN_USER_IDS.includes(userId)) return true;
  try {
    const rows = await db.execute(sql`SELECT is_admin FROM users WHERE id = ${userId}`);
    const user = rows.rows[0] as any;
    return !!user?.is_admin;
  } catch { return false; }
}

async function requireAdmin(req: any, res: any, next: any) {
  const ok = await isAdminUser(req.currentUserId);
  if (!ok) return res.status(403).json({ error: "Доступ запрещён" });
  next();
}

router.get("/admin/users", requireAdmin, async (req, res) => {
  try {
    const rows = await db.execute(
      sql`SELECT id, username, display_name, avatar_color, avatar_url, status, balance, created_at, is_verified, is_admin, is_bot, has_prime FROM users ORDER BY id`
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

    res.json({ success: true, userId: Number(userId), username: target.username, displayName: target.displayName, amount, newBalance });
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
    if (!userId || !newPassword) return res.status(400).json({ error: "Укажите userId и newPassword" });
    if (String(newPassword).length < 6) return res.status(400).json({ error: "Пароль должен быть не менее 6 символов" });
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

router.post("/admin/set-admin", requireAdmin, async (req, res) => {
  try {
    const { userId, isAdmin } = req.body;
    if (!userId) return res.status(400).json({ error: "Укажите userId" });
    const targetId = Number(userId);
    if (ADMIN_USER_IDS.includes(targetId)) {
      return res.status(400).json({ error: "Нельзя изменить права суперадминистратора" });
    }
    await db.execute(sql`UPDATE users SET is_admin = ${!!isAdmin} WHERE id = ${targetId}`);
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// NEW: Give/revoke Prime for a user
router.post("/admin/give-prime", requireAdmin, async (req, res) => {
  try {
    const { userId, give, months } = req.body;
    if (!userId) return res.status(400).json({ error: "Укажите userId" });
    const target = await db.query.usersTable.findFirst({ where: eq(usersTable.id, Number(userId)) });
    if (!target) return res.status(404).json({ error: "Пользователь не найден" });

    if (give === false) {
      await db.execute(sql`UPDATE users SET has_prime = false, prime_expires_at = NULL WHERE id = ${Number(userId)}`);
      res.json({ success: true, hasPrime: false, message: `Prime снят у @${target.username}` });
    } else {
      const m = Number(months) || 1;
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + m);
      await db.execute(sql`UPDATE users SET has_prime = true, prime_expires_at = ${expiresAt.toISOString()} WHERE id = ${Number(userId)}`);
      res.json({ success: true, hasPrime: true, primeExpiresAt: expiresAt.toISOString(), message: `Prime выдан @${target.username} на ${m} мес.` });
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// NEW: Mass-give SPARK to all users
router.post("/admin/mass-give", requireAdmin, async (req, res) => {
  try {
    const { amount } = req.body;
    if (typeof amount !== "number" || amount === 0) {
      return res.status(400).json({ error: "Укажите amount" });
    }
    await db.execute(sql`UPDATE users SET balance = GREATEST(0, balance + ${amount})`);
    const totals = await db.execute(sql`SELECT COUNT(*) as cnt, SUM(balance) as total FROM users`);
    const row = totals.rows[0] as any;
    res.json({ success: true, usersAffected: Number(row.cnt), newTotalSpark: Number(row.total || 0) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// NEW: Per-user activity stats
router.get("/admin/users/:userId/stats", requireAdmin, async (req, res) => {
  try {
    const targetId = Number(req.params.userId);
    const [msgRow, giftsSentRow, giftsRecvRow, callsRow] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as cnt FROM messages WHERE sender_id = ${targetId}`),
      db.execute(sql`SELECT COUNT(*) as cnt FROM gifts WHERE sender_id = ${targetId}`),
      db.execute(sql`SELECT COUNT(*) as cnt FROM gifts WHERE receiver_id = ${targetId}`),
      db.execute(sql`SELECT COUNT(*) as cnt FROM calls WHERE caller_id = ${targetId} OR callee_id = ${targetId}`),
    ]);
    res.json({
      messagesSent: Number((msgRow.rows[0] as any).cnt),
      giftsSent: Number((giftsSentRow.rows[0] as any).cnt),
      giftsReceived: Number((giftsRecvRow.rows[0] as any).cnt),
      callsTotal: Number((callsRow.rows[0] as any).cnt),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// NEW: Send system announcement as bot to all users' bot chats
router.post("/admin/announcement", requireAdmin, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !String(text).trim()) return res.status(400).json({ error: "Укажите текст объявления" });

    // Find the bot by username (not hardcoded ID)
    const botRow = await db.execute(sql`SELECT id FROM users WHERE username = 'deepseek_ai' LIMIT 1`);
    const botId = (botRow.rows[0] as any)?.id;
    if (!botId) return res.status(404).json({ error: "Бот не найден. Перезапустите сервер для создания системных пользователей." });

    // Get all non-bot users
    const allUsers = await db.execute(sql`SELECT id FROM users WHERE is_bot = false`);

    let sent = 0;
    for (const userRow of allUsers.rows as any[]) {
      const userId = userRow.id;

      // Check if a direct chat between bot and user already exists
      const existingChat = await db.execute(
        sql`SELECT c.id FROM chats c
            JOIN chat_members cm1 ON cm1.chat_id = c.id AND cm1.user_id = ${botId}
            JOIN chat_members cm2 ON cm2.chat_id = c.id AND cm2.user_id = ${userId}
            WHERE c.type = 'direct' LIMIT 1`
      );

      let chatId: number;
      if ((existingChat.rows as any[]).length > 0) {
        chatId = (existingChat.rows[0] as any).id;
      } else {
        // Create direct chat between bot and user
        const newChat = await db.execute(
          sql`INSERT INTO chats (type, created_at, updated_at) VALUES ('direct', NOW(), NOW()) RETURNING id`
        );
        chatId = (newChat.rows[0] as any).id;
        await db.execute(
          sql`INSERT INTO chat_members (chat_id, user_id, role, joined_at) VALUES
              (${chatId}, ${botId}, 'member', NOW()),
              (${chatId}, ${userId}, 'member', NOW())`
        );
      }

      // Insert the announcement message (column is "text" not "content")
      await db.execute(
        sql`INSERT INTO messages (chat_id, sender_id, type, text, created_at, updated_at)
            VALUES (${chatId}, ${botId}, 'text', ${String(text).trim()}, NOW(), NOW())`
      );
      await db.execute(sql`UPDATE chats SET updated_at = NOW() WHERE id = ${chatId}`);
      sent++;
    }

    res.json({ success: true, chatsSent: sent, message: `Объявление отправлено ${sent} пользователям` });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// NEW: Edit user profile (display name, bio)
router.patch("/admin/users/:userId", requireAdmin, async (req, res) => {
  try {
    const targetId = Number(req.params.userId);
    const { displayName, bio } = req.body;
    if (!displayName && bio === undefined) return res.status(400).json({ error: "Нечего обновлять" });

    if (displayName) await db.execute(sql`UPDATE users SET display_name = ${displayName} WHERE id = ${targetId}`);
    if (bio !== undefined) await db.execute(sql`UPDATE users SET bio = ${bio} WHERE id = ${targetId}`);

    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.get("/admin/check", async (req, res) => {
  try {
    const ok = await isAdminUser(req.currentUserId);
    res.json({ isAdmin: ok });
  } catch (err) {
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.get("/admin/stats", requireAdmin, async (req, res) => {
  try {
    const [totals, msgs, chts, calls, gifts] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as total_users, SUM(balance) as total_spark, SUM(CASE WHEN has_prime THEN 1 ELSE 0 END) as prime_users FROM users`),
      db.execute(sql`SELECT COUNT(*) as cnt FROM messages`),
      db.execute(sql`SELECT COUNT(*) as cnt FROM chats`),
      db.execute(sql`SELECT COUNT(*) as cnt FROM calls`),
      db.execute(sql`SELECT COUNT(*) as cnt FROM gifts`),
    ]);
    const row = totals.rows[0] as any;
    res.json({
      totalUsers: Number(row.total_users),
      totalSpark: Number(row.total_spark || 0),
      primeUsers: Number(row.prime_users || 0),
      totalMessages: Number((msgs.rows[0] as any).cnt),
      totalChats: Number((chts.rows[0] as any).cnt),
      totalCalls: Number((calls.rows[0] as any).cnt),
      totalGifts: Number((gifts.rows[0] as any).cnt),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

export default router;
