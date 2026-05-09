import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

router.get("/wallet", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const rows = await db.execute(sql`SELECT balance FROM users WHERE id = ${uid}`);
    const balance = Number((rows.rows[0] as any)?.balance ?? 0);
    const address = `PULSE-${uid.toString().padStart(6, "0")}`;
    res.json({ balance, address });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/wallet/earn", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const { amount } = req.body;
    if (typeof amount !== "number" || amount <= 0 || amount > 1000) {
      return res.status(400).json({ error: "Некорректная сумма" });
    }
    await db.execute(sql`UPDATE users SET balance = balance + ${amount} WHERE id = ${uid}`);
    const rows = await db.execute(sql`SELECT balance FROM users WHERE id = ${uid}`);
    const balance = Number((rows.rows[0] as any)?.balance ?? 0);
    res.json({ success: true, balance });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/wallet/send", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const { address, amount } = req.body;
    if (!address || typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "Укажите адрес и сумму" });
    }
    const trimmed = String(address).trim().toUpperCase();
    if (!trimmed.startsWith("PULSE-")) {
      return res.status(400).json({ error: "Неверный формат. Адрес должен начинаться с PULSE-" });
    }
    const targetId = parseInt(trimmed.replace("PULSE-", ""), 10);
    if (isNaN(targetId) || targetId <= 0) {
      return res.status(400).json({ error: "Неверный адрес кошелька" });
    }
    if (targetId === uid) {
      return res.status(400).json({ error: "Нельзя отправить самому себе" });
    }

    const target = await db.query.usersTable.findFirst({ where: eq(usersTable.id, targetId) });
    if (!target) {
      return res.status(404).json({ error: "Пользователь с таким адресом не найден" });
    }

    const senderRows = await db.execute(sql`SELECT balance FROM users WHERE id = ${uid}`);
    const senderBalance = Number((senderRows.rows[0] as any)?.balance ?? 0);
    if (senderBalance < amount) {
      return res.status(400).json({ error: `Недостаточно Spark. Ваш баланс: ${senderBalance}` });
    }

    await db.execute(sql`UPDATE users SET balance = balance - ${amount} WHERE id = ${uid}`);
    await db.execute(sql`UPDATE users SET balance = balance + ${amount} WHERE id = ${targetId}`);

    const updatedRows = await db.execute(sql`SELECT balance FROM users WHERE id = ${uid}`);
    const newBalance = Number((updatedRows.rows[0] as any)?.balance ?? 0);

    res.json({ success: true, balance: newBalance, recipient: target.displayName, amount });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/wallet/daily-bonus", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const BONUS = 1000;
    const today = new Date().toISOString().slice(0, 10);
    const key = `daily_bonus_${today}`;
    const claimed = await db.execute(
      sql`SELECT 1 FROM user_daily_bonus WHERE user_id = ${uid} AND bonus_date = ${today} LIMIT 1`
    );
    if ((claimed.rows as any[]).length > 0) {
      return res.status(409).json({ error: "Бонус уже получен сегодня. Возвращайся завтра!" });
    }
    await db.execute(sql`INSERT INTO user_daily_bonus (user_id, bonus_date) VALUES (${uid}, ${today}) ON CONFLICT DO NOTHING`);
    await db.execute(sql`UPDATE users SET balance = balance + ${BONUS} WHERE id = ${uid}`);
    const rows = await db.execute(sql`SELECT balance FROM users WHERE id = ${uid}`);
    const balance = Number((rows.rows[0] as any)?.balance ?? 0);
    res.json({ success: true, balance, bonus: BONUS });
  } catch (err: any) {
    if (String(err?.message).includes("user_daily_bonus")) {
      return res.status(500).json({ error: "Таблица бонусов не создана. Свяжитесь с администратором." });
    }
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/wallet/topup-request", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const { amount, packageLabel, priceLabel } = req.body;
    if (!amount || !packageLabel || !priceLabel) {
      return res.status(400).json({ error: "Некорректные данные" });
    }
    const existing = await db.execute(
      sql`SELECT id FROM topup_requests WHERE user_id = ${uid} AND status = 'pending' LIMIT 1`
    );
    if ((existing.rows as any[]).length > 0) {
      return res.status(409).json({ error: "У вас уже есть ожидающая заявка. Дождитесь её обработки." });
    }
    const result = await db.execute(
      sql`INSERT INTO topup_requests (user_id, amount, package_label, price_label) VALUES (${uid}, ${amount}, ${packageLabel}, ${priceLabel}) RETURNING id`
    );
    const id = (result.rows[0] as any).id;
    res.json({ success: true, requestId: id });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.get("/wallet/topup-request/status", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const rows = await db.execute(
      sql`SELECT id, amount, package_label, price_label, status, created_at FROM topup_requests WHERE user_id = ${uid} ORDER BY created_at DESC LIMIT 5`
    );
    res.json(rows.rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.get("/stats/me", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const [msgs, calls] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as cnt FROM messages WHERE sender_id = ${uid}`),
      db.execute(sql`SELECT COUNT(*) as cnt FROM calls WHERE caller_id = ${uid}`),
    ]);
    res.json({
      messagesSent: Number((msgs.rows[0] as any)?.cnt ?? 0),
      callsMade: Number((calls.rows[0] as any)?.cnt ?? 0),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

export default router;
